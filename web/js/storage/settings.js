/**
 * settings.js - User settings manager (language, country, currency)
 */

import { STORAGE_KEYS, rawGet, rawSet } from "./core.js";

export const DEFAULT_SETTINGS = {
  language: "en", // en | hi | hinglish
  countryCode: "IN", // IN | US | GB | AE | DE
  currency: "INR" // INR | USD | EUR | GBP | AED
};

/**
 * Retrieve user settings with fallback defaults
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function getSettings() {
  const raw = rawGet(STORAGE_KEYS.SETTINGS);
  if (!raw) return { ...DEFAULT_SETTINGS };

  try {
    const parsed = JSON.parse(raw);
    return {
      language: parsed.language || DEFAULT_SETTINGS.language,
      countryCode: parsed.countryCode || DEFAULT_SETTINGS.countryCode,
      currency: parsed.currency || DEFAULT_SETTINGS.currency
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Update and persist user settings
 * @param {Partial<typeof DEFAULT_SETTINGS>} updates
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function saveSettings(updates = {}) {
  const current = getSettings();
  const next = {
    ...current,
    ...updates
  };
  rawSet(STORAGE_KEYS.SETTINGS, JSON.stringify(next));
  return next;
}
