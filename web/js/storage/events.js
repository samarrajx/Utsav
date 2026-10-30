/**
 * events.js - Celebration event CRUD and active event persistence
 */

import {
  STORAGE_KEYS,
  CURRENT_SCHEMA_VERSION,
  SAVE_DEBOUNCE_MS,
  rawGet,
  rawSet,
  rawRemove,
  isLocalStorageAvailable,
  clearMemoryStore
} from "./core.js";

let pendingEventsToPersist = null;
let saveDebounceTimer = null;

/**
 * Flush any debounced event writes immediately to localStorage
 */
export function flushSaveEvent() {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  if (pendingEventsToPersist) {
    rawSet(STORAGE_KEYS.EVENTS, JSON.stringify(pendingEventsToPersist));
    pendingEventsToPersist = null;
  }
}

// Ensure flush on window unload or tab backgrounding
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushSaveEvent);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushSaveEvent();
      }
    });
  }
}

/**
 * Reset all memory and storage state (for testing)
 */
export function clearAllStorage() {
  flushSaveEvent();
  pendingEventsToPersist = null;
  clearMemoryStore();
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

/**
 * Retrieve all saved celebration events
 * @returns {Array<Object>}
 */
export function getEvents() {
  if (pendingEventsToPersist) {
    return pendingEventsToPersist;
  }
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
 * Debounces disk/localStorage persistence by 300ms trailing.
 * @param {Object} event
 * @param {Object} [options]
 * @param {boolean} [options.immediate=false] - If true, bypass debounce and flush synchronously
 * @returns {Object} Saved event
 */
export function saveEvent(event, { immediate = false } = {}) {
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

  const nextEvents = [...events];
  if (existingIndex >= 0) {
    nextEvents[existingIndex] = eventToSave;
  } else {
    nextEvents.push(eventToSave);
  }

  pendingEventsToPersist = nextEvents;

  if (immediate) {
    flushSaveEvent();
  } else {
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      flushSaveEvent();
    }, SAVE_DEBOUNCE_MS);
  }

  return eventToSave;
}

/**
 * Delete an event by ID
 * @param {string} id
 * @returns {boolean} True if found and deleted
 */
export function deleteEvent(id) {
  flushSaveEvent();
  const events = getEvents();
  const filtered = events.filter((e) => e.id !== id);
  if (filtered.length === events.length) return false;

  pendingEventsToPersist = filtered;
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

/**
 * Backwards compatibility helper (no sample data seeded)
 */
export function ensureInitialEvent() {
  // Intentionally empty: no fake/sample events seeded
}
