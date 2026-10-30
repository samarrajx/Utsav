/**
 * core.js - Low-level resilient localStorage wrapper with in-memory fallback
 */

export const STORAGE_KEYS = {
  EVENTS: "utsav_events_v1",
  ACTIVE_ID: "utsav_active_event_id",
  SETTINGS: "utsav_settings_v1"
};

export const CURRENT_SCHEMA_VERSION = 1;
export const SAVE_DEBOUNCE_MS = 300;

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
    console.warn(
      `[Storage Warning] Writing to localStorage failed: ${err.message}. Using memory fallback.`
    );
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
 * Clear the internal memory store
 */
export function clearMemoryStore() {
  memoryStore = {};
}
