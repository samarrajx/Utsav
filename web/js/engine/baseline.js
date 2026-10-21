/**
 * baseline.js - Offline-safe deterministic plan generator for Utsav
 *
 * Used when the AI API is unavailable, offline, or experiencing latency timeouts.
 * Generates an end-to-end, fully populated event plan using templates and benchmarks.
 */

import { getEventTemplate, EVENT_TYPES } from "./templates.js";
import { allocateBudget } from "./money.js";
import { scheduleMilestones, addWeeks, toISODateString, parseDate } from "./dates.js";
import { checkFeasibility } from "./feasibility.js";

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
export function generateBaselinePlan(input = {}, nowFn = () => new Date()) {
  const type = (input.type || EVENT_TYPES.WEDDING).toLowerCase();
  const template = getEventTemplate(type);

  const eventDateParsed = parseDate(input.date || addWeeks(toISODateString(nowFn()), 24));
  const eventDateStr = toISODateString(eventDateParsed);

  const totalBudget = Math.max(0, Number(input.budget) || 500000);
  const targetGuests = Math.max(1, Number(input.guests) || 100);
  const currency = (input.currency || "INR").toUpperCase();
  const city = (input.city || "Mumbai").trim();
  const countryCode = (input.countryCode || "IN").toUpperCase();
  const language = input.language || "en";

  const defaultTitle = `${template.label} in ${city}`;
  const title = (input.title || defaultTitle).trim();

  // 1. Allocate category budgets deterministically (Largest Remainder method)
  const categoryTemplates = template.defaultWeights.map((w) => ({
    id: w.id,
    name: w.name,
    weight: w.weight,
    spent: 0
  }));
  const categories = allocateBudget(totalBudget, categoryTemplates);

  // 2. Schedule milestones and tasks with back-scheduling
  const scheduledMilestones = scheduleMilestones(eventDateStr, template.milestones, nowFn);

  // Flatten tasks from scheduled milestones
  const allTasks = [];
  scheduledMilestones.forEach((m) => {
    (m.tasks || []).forEach((t) => {
      allTasks.push(t);
    });
  });

  // 3. Populate vendor checklist with book-by dates
  const vendors = template.vendorCategories.map((v) => {
    const bookByDate = addWeeks(eventDateStr, -(v.bookWeeksBefore || 4));
    return {
      id: `v_${v.id}`,
      category: v.id,
      name: v.name,
      status: "to_find",
      quote: 0,
      bookBy: bookByDate,
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
    };
  });

  // 4. Curated baseline ideas per event type
  const ideas = getBaselineIdeas(type, city);

  // 5. Run feasibility engine
  const feasibility = checkFeasibility({
    type,
    budget: totalBudget,
    currency,
    guests: targetGuests,
    city,
    date: eventDateStr,
    countryCode
  });

  // 6. Generate initial baseline critique
  const critique = {
    risks: []
  };

  if (feasibility.band === "short" || feasibility.band === "unrealistic") {
    critique.risks.push({
      severity: "high",
      title: "Budget-to-headcount imbalance",
      detail: feasibility.summary,
      suggestedFix: feasibility.tradeOffs[0]?.detail || "Trim guest list or simplify catering menu."
    });
  }

  // Check timeline proximity
  const weeksUntilEvent = Math.round((eventDateParsed.getTime() - nowFn().getTime()) / (1000 * 60 * 60 * 24 * 7));
  if (weeksUntilEvent < 8 && type === EVENT_TYPES.WEDDING) {
    critique.risks.push({
      severity: "medium",
      title: "Short planning lead time",
      detail: `Your event is in ${weeksUntilEvent} weeks. Top venues and photographers may have limited weekend availability.`,
      suggestedFix: "Prioritize venue and core vendor contracts within the next 7 days."
    });
  }

  return {
    schemaVersion: 1,
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    isBaselineFallback: true,
    type,
    title,
    date: eventDateStr,
    city,
    countryCode,
    currency,
    guests: {
      target: targetGuests,
      list: []
    },
    budget: {
      total: totalBudget,
      categories
    },
    expenses: [],
    milestones: scheduledMilestones,
    tasks: allTasks,
    vendors,
    ideas,
    feasibility,
    critique,
    language
  };
}

/**
 * Curate baseline ideas tailored to event type and city
 * @param {string} type
 * @param {string} city
 * @returns {Array<Object>}
 */
function getBaselineIdeas(type, city) {
  if (type === EVENT_TYPES.BIRTHDAY) {
    return [
      {
        id: "idea_1",
        section: "keepsake",
        title: "Polaroid Guestbook & Wish Clothesline",
        whyItFits: "Gives guests an instant interactive activity and provides a heartfelt keepsake for the host.",
        saved: true
      },
      {
        id: "idea_2",
        section: "entertainment",
        title: "Trivia Kahoot Quiz About the Host",
        whyItFits: "Breaks the ice immediately between different social groups and school/work friends.",
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
  }

  if (type === EVENT_TYPES.COMMUNITY) {
    return [
      {
        id: "idea_1",
        section: "activity",
        title: "Community Heritage Photo Wall",
        whyItFits: "Allows neighbors to share vintage photographs and build intergenerational connection.",
        saved: true
      },
      {
        id: "idea_2",
        section: "sustainability",
        title: "Zero-Waste Bring-Your-Own-Bottle Station",
        whyItFits: "Eliminates hundreds of single-use bottles and establishes green community credentials.",
        saved: true
      },
      {
        id: "idea_3",
        section: "food",
        title: "Local Home-Chef Showcase Pavilions",
        whyItFits: "Celebrates diverse cultural cuisines while keeping catering costs community-friendly.",
        saved: false
      }
    ];
  }

  // Default: Wedding
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
      whyItFits: "Captures spontaneous voice messages, emotional wishes, and laughter that formal photographers miss.",
      saved: true
    },
    {
      id: "idea_3",
      section: "ambience",
      title: "Live Sitar & Flute Sunset Acoustic Set",
      whyItFits: "Creates an elegant, calm transition between the sacred ceremony and vibrant evening reception.",
      saved: false
    },
    {
      id: "idea_4",
      section: "guest_experience",
      title: "QR Code Live Photo Pool Stream",
      whyItFits: "Allows guests to share candid moments onto a live banquet screen without needing an app download.",
      saved: false
    }
  ];
}
