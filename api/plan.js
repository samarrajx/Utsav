/**
 * /api/plan - Section-by-section celebration plan generator
 *
 * Parallel endpoint called for section=core | vendors | ideas.
 * Combines grounded deterministic calculations with GenAI language personalization.
 */

import { secureApiHandler } from "./_lib/security.js";
import {
  planInputSchema,
  planCoreOutputSchema,
  planVendorsOutputSchema,
  planIdeasOutputSchema
} from "./_lib/schemas.js";
import { callGeminiStructured, DEFAULT_GEMINI_MODEL } from "./_lib/gemini.js";
import {
  getEventTemplate,
  allocateBudget,
  scheduleMilestones,
  checkFeasibility
} from "../web/js/engine/index.js";
import { apiResponseCache, generateCacheKey } from "./_lib/cache.js";

function buildCoreSystemInstruction({ type, city, mustHaves, feasibility, language, date }) {
  return `You are the lead planner at Utsav.
Refine and personalize the provided budget categories and milestone roadmap for a ${type} celebration in ${city}.
Incorporate the user's must-haves: "${mustHaves || "None"}".
Feasibility Band: ${feasibility.band} (${feasibility.summary}).
Language: ${language}.

CRITICAL REQUIREMENTS:
1. Category weights must sum to 100.
2. Maintain realistic categories (e.g. Venue, Catering, Decor, Photography, Attire, Entertainment).
3. Return milestone timelines back-scheduled from the event date (${date}).
4. Output JSON format strictly matching:
{
  "section": "core",
  "categories": [
    { "id": "string", "name": "string", "weight": number, "planned": number }
  ],
  "milestones": [
    {
      "id": "string",
      "title": "string",
      "weeksBefore": number,
      "dueDate": "YYYY-MM-DD",
      "tasks": [
        { "id": "string", "title": "string", "due": "YYYY-MM-DD" }
      ]
    }
  ]
}`;
}

function reconcileBudgetPlanned(budget, aiCategories) {
  const reallocated = allocateBudget(budget, aiCategories);
  aiCategories.forEach((cat, idx) => {
    cat.planned = reallocated[idx].planned;
  });
}

async function generateCoreSection(data, template) {
  const {
    type,
    title,
    date,
    city,
    countryCode = "IN",
    currency = "INR",
    budget,
    guests,
    mustHaves,
    language = "en"
  } = data;
  const baselineCategories = allocateBudget(budget, template.defaultWeights);
  const baselineMilestones = scheduleMilestones(date, template.milestones);
  const feasibility = checkFeasibility({ type, budget, currency, guests, city, date, countryCode });

  const systemInstruction = buildCoreSystemInstruction({
    type,
    city,
    mustHaves,
    feasibility,
    language,
    date
  });

  const aiResponse = await callGeminiStructured({
    systemInstruction,
    data: {
      type,
      title,
      date,
      city,
      budget,
      currency,
      guests,
      mustHaves,
      groundedCategories: baselineCategories,
      groundedMilestones: baselineMilestones
    },
    prompt: "Generate personalized core plan structure.",
    responseSchema: planCoreOutputSchema,
    maxOutputTokens: 2048
  });

  reconcileBudgetPlanned(budget, aiResponse.categories);
  return aiResponse;
}

function buildVendorsSystemInstruction({
  type,
  city,
  date,
  guests,
  budget,
  currency,
  mustHaves,
  language
}) {
  return `You are a seasoned vendor manager at Utsav.
Produce a vendor checklist tailored to a ${type} in ${city} on ${date} with ${guests} guests and ${budget} ${currency} budget.
Incorporate must-haves: "${mustHaves || "None"}".
Language: ${language}.

Format your response strictly as JSON conforming to:
{
  "section": "vendors",
  "vendors": [
    {
      "id": "string",
      "category": "string",
      "name": "string",
      "bookBy": "YYYY-MM-DD",
      "lookFor": ["string", "string"],
      "askThem": ["string", "string"]
    }
  ]
}`;
}

async function generateVendorsSection(data, template) {
  const { type, date, city, budget, currency = "INR", guests, mustHaves, language = "en" } = data;
  const systemInstruction = buildVendorsSystemInstruction({
    type,
    city,
    date,
    guests,
    budget,
    currency,
    mustHaves,
    language
  });

  return callGeminiStructured({
    systemInstruction,
    data: {
      type,
      date,
      city,
      budget,
      currency,
      guests,
      mustHaves,
      vendorTemplates: template.vendorCategories
    },
    prompt: "Generate targeted vendor checklist with book-by dates and vetting questions.",
    responseSchema: planVendorsOutputSchema,
    maxOutputTokens: 1536
  });
}

function buildIdeasSystemInstruction({ type, city, mustHaves, language }) {
  return `You are the creative director at Utsav.
Brainstorm 3 to 5 memorable, high-impact celebration ideas specifically tailored for this ${type} in ${city}.
Connect each idea directly to the host's context and must-haves: "${mustHaves || "None"}".
Language: ${language}.

Format your response strictly as JSON conforming to:
{
  "section": "ideas",
  "ideas": [
    {
      "id": "string",
      "section": "decor|entertainment|hospitality|food|keepsake",
      "title": "string",
      "whyItFits": "string"
    }
  ]
}`;
}

async function generateIdeasSection(data) {
  const {
    type,
    title,
    date,
    city,
    budget,
    currency = "INR",
    guests,
    mustHaves,
    language = "en"
  } = data;

  const systemInstruction = buildIdeasSystemInstruction({ type, city, mustHaves, language });

  return callGeminiStructured({
    systemInstruction,
    data: { type, title, date, city, budget, currency, guests, mustHaves },
    prompt: "Generate 3 to 5 unique celebration ideas with 'whyItFits' justification.",
    responseSchema: planIdeasOutputSchema,
    maxOutputTokens: 1536
  });
}

const SECTION_GENERATORS = {
  core: generateCoreSection,
  vendors: generateVendorsSection,
  ideas: generateIdeasSection
};

export default async function handler(req, res) {
  const querySection = req.query?.section;
  if (querySection && req.body && typeof req.body === "object" && !req.body.section) {
    req.body = { ...req.body, section: querySection };
  }

  return secureApiHandler(req, res, {
    schema: planInputSchema,
    handler: async (data) => {
      const { section } = data;
      const modelName = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
      const cacheKey = generateCacheKey(`plan:${section}`, data, modelName);
      const cached = apiResponseCache.get(cacheKey);

      if (cached) {
        if (res?.setHeader) res.setHeader("X-Cache", "HIT");
        return cached;
      }
      if (res?.setHeader) res.setHeader("X-Cache", "MISS");

      const generator = SECTION_GENERATORS[section];
      if (!generator) {
        throw new Error(`Invalid plan section: ${section}`);
      }

      const template = getEventTemplate(data.type);
      const aiResponse = await generator(data, template);
      apiResponseCache.set(cacheKey, aiResponse);
      return aiResponse;
    }
  });
}
