/**
 * state.js - Wizard state factory for new event creation
 */

import { addWeeks, toISODateString } from "../../engine/dates.js";

/**
 * Creates a fresh wizard state initialized from user settings
 * @param {Object} settings
 * @returns {Object}
 */
export function createWizardState(settings = {}) {
  return {
    step: "intake", // 'intake' | 'questions' | 'feasibility' | 'generating'
    type: "wedding",
    title: "",
    date: addWeeks(toISODateString(new Date()), 24),
    city: "Jaipur",
    countryCode: settings.countryCode || "IN",
    currency: settings.currency || "INR",
    budget: 1200000,
    guests: 150,
    mustHaves: "",
    language: settings.language || "en",
    questions: [],
    questionAnswers: {},
    feasibility: null
  };
}
