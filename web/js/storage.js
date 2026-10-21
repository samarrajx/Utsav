/**
 * storage.js - Resilient, schema-versioned localStorage manager for Utsav
 *
 * Guarantees:
 * 1. Safe parsing with try/catch; survives corrupted storage gracefully.
 * 2. Storage quota overflow handling (QuotaExceededError).
 * 3. Event schema versioning (v1).
 * 4. Settings persistence (language, country, currency).
 */

export const STORAGE_KEYS = {
  EVENTS: "utsav_events_v1",
  ACTIVE_ID: "utsav_active_event_id",
  SETTINGS: "utsav_settings_v1"
};

export const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS = {
  language: "en",       // en | hi | hinglish
  countryCode: "IN",    // IN | US | GB | AE | DE
  currency: "INR"       // INR | USD | EUR | GBP | AED
};

// Memory fallback store if localStorage is disabled or throws
let memoryStore = {};

/**
 * Check if localStorage is available in current environment
 * @returns {boolean}
 */
export function isLocalStorageAvailable() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    const testKey = "__utsav_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Low-level safe storage read
 * @param {string} key
 * @returns {string|null}
 */
export function rawGet(key) {
  try {
    if (isLocalStorageAvailable()) {
      return window.localStorage.getItem(key);
    }
    return memoryStore[key] || null;
  } catch {
    return memoryStore[key] || null;
  }
}

/**
 * Low-level safe storage write
 * @param {string} key
 * @param {string} value
 * @returns {boolean} Success status
 */
export function rawSet(key, value) {
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.setItem(key, value);
      return true;
    }
    memoryStore[key] = value;
    return true;
  } catch (err) {
    // Fallback to memory on QuotaExceededError or security block
    memoryStore[key] = value;
    console.warn(`[Storage Warning] Writing to localStorage failed: ${err.message}. Using memory fallback.`);
    return false;
  }
}

/**
 * Low-level safe storage remove
 * @param {string} key
 */
export function rawRemove(key) {
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.removeItem(key);
    }
    delete memoryStore[key];
  } catch {
    delete memoryStore[key];
  }
}

/**
 * Reset all memory and storage state (for testing)
 */
export function clearAllStorage() {
  memoryStore = {};
  try {
    if (isLocalStorageAvailable()) {
      window.localStorage.removeItem(STORAGE_KEYS.EVENTS);
      window.localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
      window.localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    }
  } catch {
    // ignore
  }
}

// ============================================================================
// Event Repository
// ============================================================================

/**
 * Retrieve all saved celebration events
 * @returns {Array<Object>}
 */
export function getEvents() {
  const raw = rawGet(STORAGE_KEYS.EVENTS);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter and sanitize valid events conforming to schema v1
    return parsed.filter((evt) => evt && typeof evt === "object" && evt.id);
  } catch {
    // Corrupted storage recovery
    console.warn("[Storage Error] Corrupted events JSON detected. Resetting to empty list.");
    return [];
  }
}

/**
 * Retrieve a specific event by ID
 * @param {string} id
 * @returns {Object|null}
 */
export function getEvent(id) {
  if (!id) return null;
  const events = getEvents();
  return events.find((e) => e.id === id) || null;
}

/**
 * Save or update an event. Preserves schemaVersion.
 * @param {Object} event
 * @returns {Object} Saved event
 */
export function saveEvent(event) {
  if (!event || typeof event !== "object" || !event.id) {
    throw new TypeError("Cannot save invalid event object without an 'id'");
  }

  const events = getEvents();
  const existingIndex = events.findIndex((e) => e.id === event.id);

  const eventToSave = {
    ...event,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    events[existingIndex] = eventToSave;
  } else {
    events.push(eventToSave);
  }

  rawSet(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  return eventToSave;
}

/**
 * Delete an event by ID
 * @param {string} id
 * @returns {boolean} True if found and deleted
 */
export function deleteEvent(id) {
  const events = getEvents();
  const filtered = events.filter((e) => e.id !== id);
  if (filtered.length === events.length) return false;

  rawSet(STORAGE_KEYS.EVENTS, JSON.stringify(filtered));

  if (getActiveEventId() === id) {
    setActiveEventId(filtered[0]?.id || null);
  }
  return true;
}

/**
 * Get currently active event ID
 * @returns {string|null}
 */
export function getActiveEventId() {
  return rawGet(STORAGE_KEYS.ACTIVE_ID) || null;
}

/**
 * Set active event ID
 * @param {string|null} id
 */
export function setActiveEventId(id) {
  if (id) {
    rawSet(STORAGE_KEYS.ACTIVE_ID, id);
  } else {
    rawRemove(STORAGE_KEYS.ACTIVE_ID);
  }
}

/**
 * Get active event object (or first available event if active is not set)
 * @returns {Object|null}
 */
export function getActiveEvent() {
  const activeId = getActiveEventId();
  if (activeId) {
    const found = getEvent(activeId);
    if (found) return found;
  }

  const events = getEvents();
  if (events.length > 0) {
    setActiveEventId(events[0].id);
    return events[0];
  }
  return null;
}

// ============================================================================
// User Settings (Language, Country, Currency)
// ============================================================================

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
