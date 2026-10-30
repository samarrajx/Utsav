/**
 * baseline.js - Offline-safe deterministic plan generator for Utsav
 *
 * Used when the AI API is unavailable, offline, or experiencing latency timeouts.
 * Generates an end-to-end, fully populated event plan using templates and benchmarks.
 */

import { getEventTemplate, EVENT_TYPES } from "./templates.js";
import { allocateBudget } from "./money.js";
import {
  scheduleMilestones,
  addWeeks,
  toISODateString,
  parseDate,
  MS_PER_DAY,
  DAYS_PER_WEEK
} from "./dates.js";
import { checkFeasibility } from "./feasibility.js";

const BIRTHDAY_IDEAS = [
  {
    id: "idea_1",
    section: "keepsake",
    title: "Polaroid Guestbook & Wish Clothesline",
    whyItFits:
      "Gives guests an instant interactive activity and provides a heartfelt keepsake for the host.",
    saved: true
  },
  {
    id: "idea_2",
    section: "entertainment",
    title: "Trivia Kahoot Quiz About the Host",
    whyItFits:
      "Breaks the ice immediately between different social groups and school/work friends.",
    saved: true
  },
  {
    id: "idea_3",
    section: "decor",
    title: "Custom Illuminated Neon Name Sign",
    whyItFits: "Acts as an eye-catching photo backdrop and doubles as home decor after the party.",
    saved: false
  }
];

const COMMUNITY_IDEAS = [
  {
    id: "idea_1",
    section: "activity",
    title: "Community Heritage Photo Wall",
    whyItFits:
      "Allows neighbors to share vintage photographs and build intergenerational connection.",
    saved: true
  },
  {
    id: "idea_2",
    section: "sustainability",
    title: "Zero-Waste Bring-Your-Own-Bottle Station",
    whyItFits:
      "Eliminates hundreds of single-use bottles and establishes green community credentials.",
    saved: true
  },
  {
    id: "idea_3",
    section: "food",
    title: "Local Home-Chef Showcase Pavilions",
    whyItFits:
      "Celebrates diverse cultural cuisines while keeping catering costs community-friendly.",
    saved: false
  }
];

function getWeddingIdeas(city) {
  return [
    {
      id: "idea_1",
      section: "hospitality",
      title: "Personalized Welcome Hampers with Regional Flavours",
      whyItFits: `Celebrates ${city}'s local culinary specialties and makes traveling guests feel immediately welcomed.`,
      saved: true
    },
    {
      id: "idea_2",
      section: "keepsake",
      title: "Audio Guestbook Rotary Telephone",
      whyItFits:
        "Captures spontaneous voice messages, emotional wishes, and laughter that formal photographers miss.",
      saved: true
    },
    {
      id: "idea_3",
      section: "ambience",
      title: "Live Sitar & Flute Sunset Acoustic Set",
      whyItFits:
        "Creates an elegant, calm transition between the sacred ceremony and vibrant evening reception.",
      saved: false
    },
    {
      id: "idea_4",
      section: "guest_experience",
      title: "QR Code Live Photo Pool Stream",
      whyItFits:
        "Allows guests to share candid moments onto a live banquet screen without needing an app download.",
      saved: false
    }
  ];
}

function getBaselineIdeas(type, city) {
  if (type === EVENT_TYPES.BIRTHDAY) return BIRTHDAY_IDEAS;
  if (type === EVENT_TYPES.COMMUNITY) return COMMUNITY_IDEAS;
  return getWeddingIdeas(city);
}

function buildBaselineCategories(totalBudget, template) {
  const categoryTemplates = template.defaultWeights.map((w) => ({
    id: w.id,
    name: w.name,
    weight: w.weight,
    spent: 0
  }));
  return allocateBudget(totalBudget, categoryTemplates);
}

function buildBaselineVendors(template, eventDateStr) {
  return template.vendorCategories.map((v) => ({
    id: `v_${v.id}`,
    category: v.id,
    name: v.name,
    status: "to_find",
    quote: 0,
    bookBy: addWeeks(eventDateStr, -(v.bookWeeksBefore || 4)),
    lookFor: [
      "Verified reviews and portfolio samples",
      "Clear itemized contract and cancellation terms",
      "Adequate backup staff and equipment"
    ],
    askThem: [
      `Are you available on ${eventDateStr}?`,
      "What is your payment milestone breakdown?",
      "Have you previously worked at our venue?"
    ]
  }));
}

function buildBaselineCritique(feasibility, weeksUntilEvent, type) {
  const risks = [];
  if (feasibility.band === "short" || feasibility.band === "unrealistic") {
    risks.push({
      severity: "high",
      title: "Budget-to-headcount imbalance",
      detail: feasibility.summary,
      suggestedFix: feasibility.tradeOffs[0]?.detail || "Trim guest list or simplify catering menu."
    });
  }

  if (weeksUntilEvent < 8 && type === EVENT_TYPES.WEDDING) {
    risks.push({
      severity: "medium",
      title: "Short planning lead time",
      detail: `Your event is in ${weeksUntilEvent} weeks. Top venues and photographers may have limited weekend availability.`,
      suggestedFix: "Prioritize venue and core vendor contracts within the next 7 days."
    });
  }
  return { risks };
}

/**
 * Generate a complete baseline celebration plan without calling external APIs.
 *
 * @param {Object} input
 * @param {string} [input.type='wedding']
 * @param {string} [input.title]
 * @param {string|Date} [input.date]
 * @param {string} [input.city='']
 * @param {string} [input.countryCode='IN']
 * @param {string} [input.currency='INR']
 * @param {number} [input.budget=500000]
 * @param {number} [input.guests=100]
 * @param {string} [input.language='en']
 * @param {Function} [nowFn] - Clock injection for testing
 * @returns {Object} Complete event object conforming to Utsav schema v1
 */
function normalizeBaselineParams(input, template, nowFn) {
  const type = (input.type || EVENT_TYPES.WEDDING).toLowerCase();
  const eventDateParsed = parseDate(input.date || addWeeks(toISODateString(nowFn()), 24));
  const eventDateStr = toISODateString(eventDateParsed);
  const city = (input.city || "Mumbai").trim();

  return {
    type,
    eventDateParsed,
    eventDateStr,
    totalBudget: Math.max(0, Number(input.budget) || 500000),
    targetGuests: Math.max(1, Number(input.guests) || 100),
    currency: (input.currency || "INR").toUpperCase(),
    city,
    countryCode: (input.countryCode || "IN").toUpperCase(),
    language: input.language || "en",
    title: (input.title || `${template.label} in ${city}`).trim()
  };
}

function extractMilestoneTasks(milestones) {
  const tasks = [];
  milestones.forEach((m) => {
    (m.tasks || []).forEach((t) => tasks.push(t));
  });
  return tasks;
}

/**
 * Generate an offline baseline plan from template benchmarks
 *
 * @param {Object} [input={}] - User preferences
 * @param {string} [input.type='wedding']
 * @param {string} [input.title]
 * @param {string} [input.date]
 * @param {string} [input.city='Mumbai']
 * @param {string} [input.countryCode='IN']
 * @param {string} [input.currency='INR']
 * @param {number} [input.budget=500000]
 * @param {number} [input.guests=100]
 * @param {string} [input.language='en']
 * @param {Function} [nowFn] - Clock injection for testing
 * @returns {Object} Complete event object conforming to Utsav schema v1
 */
export function generateBaselinePlan(input = {}, nowFn = () => new Date()) {
  const type = (input.type || EVENT_TYPES.WEDDING).toLowerCase();
  const template = getEventTemplate(type);
  const params = normalizeBaselineParams(input, template, nowFn);

  const categories = buildBaselineCategories(params.totalBudget, template);
  const scheduledMilestones = scheduleMilestones(params.eventDateStr, template.milestones, nowFn);
  const allTasks = extractMilestoneTasks(scheduledMilestones);
  const vendors = buildBaselineVendors(template, params.eventDateStr);
  const ideas = getBaselineIdeas(params.type, params.city);

  const feasibility = checkFeasibility({
    type: params.type,
    budget: params.totalBudget,
    currency: params.currency,
    guests: params.targetGuests,
    city: params.city,
    date: params.eventDateStr,
    countryCode: params.countryCode
  });

  const msUntil = params.eventDateParsed.getTime() - nowFn().getTime();
  const weeksUntil = Math.round(msUntil / (MS_PER_DAY * DAYS_PER_WEEK));
  const critique = buildBaselineCritique(feasibility, weeksUntil, params.type);

  return {
    schemaVersion: 1,
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    isBaselineFallback: true,
    type: params.type,
    title: params.title,
    date: params.eventDateStr,
    city: params.city,
    countryCode: params.countryCode,
    currency: params.currency,
    guests: { target: params.targetGuests, list: [] },
    budget: { total: params.totalBudget, categories },
    expenses: [],
    milestones: scheduledMilestones,
    tasks: allTasks,
    vendors,
    ideas,
    feasibility,
    critique,
    language: params.language
  };
}
