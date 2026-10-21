/**
 * /api/intake - Smart context intake endpoint
 *
 * Given partial event context, decides if enough information is known to generate
 * a plan, or asks up to 4 intelligent, targeted follow-up questions.
 */

import { secureApiHandler } from "./_lib/security.js";
import { intakeInputSchema, intakeOutputSchema } from "./_lib/schemas.js";
import { callGeminiStructured } from "./_lib/gemini.js";
import { checkFeasibility } from "../web/js/engine/index.js";
import { apiResponseCache, generateCacheKey } from "./_lib/cache.js";

export default async function handler(req, res) {
  return secureApiHandler(req, res, {
    schema: intakeInputSchema,
    handler: async (data) => {
      const { type, city, budget, guests, date, currency = "INR", mustHaves, language = "en" } = data;

      // Deterministic check for completeness:
      // If we have type, city, date, guests, and budget, we are ready!
      const hasCoreContext = Boolean(type && city && budget && guests && date);

      if (hasCoreContext) {
        if (res?.setHeader) res.setHeader("X-Cache", "MISS");
        const feasibility = checkFeasibility({
          type,
          budget,
          currency,
          guests,
          city,
          date
        });

        return {
          ready: true,
          feasibilityPreview: {
            band: feasibility.band,
            ratio: feasibility.ratio,
            summary: feasibility.summary
          }
        };
      }

      // Check cache for incomplete questions
      const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
      const cacheKey = generateCacheKey("intake", { type, city, budget, guests, date, currency, mustHaves, language }, modelName);
      const cached = apiResponseCache.get(cacheKey);
      if (cached) {
        if (res?.setHeader) res.setHeader("X-Cache", "HIT");
        return cached;
      }
      if (res?.setHeader) res.setHeader("X-Cache", "MISS");

      // Context is incomplete: Call Gemini to formulate up to 4 personalized questions
      const systemInstruction = `You are the smart intake assistant for Utsav, an AI Celebration and Event Planner.
Analyze the provided event details. Determine what critical missing information is required before planning.
Only ask about missing essentials (e.g., target guest count, approximate budget, preferred city/region, or date window/season).
Ask at most 4 concise, empathetic questions.
Respond in ${language}.
Format your response strictly as JSON conforming to:
{
  "ready": false,
  "questions": [
    {
      "id": "string",
      "question": "string",
      "whyNeeded": "string",
      "options": ["string", "string"] // optional suggested answers
    }
  ]
}`;

      const aiResponse = await callGeminiStructured({
        systemInstruction,
        data: {
          type,
          city,
          budget,
          guests,
          date,
          currency,
          mustHaves,
          language
        },
        prompt: "Identify missing context and ask at most 4 essential questions to unlock planning.",
        responseSchema: intakeOutputSchema,
        maxOutputTokens: 512
      });

      apiResponseCache.set(cacheKey, aiResponse);
      return aiResponse;
    }
  });
}
