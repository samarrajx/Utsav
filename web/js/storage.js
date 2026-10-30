/**
 * storage.js - Facade for Utsav storage subsystem
 *
 * Decomposed into:
 * - storage/core.js     (low-level localStorage wrapper, fallback, and keys)
 * - storage/events.js   (event CRUD, debounce flush, and active event)
 * - storage/settings.js (user settings persistence: language, country, currency)
 * - storage/backup.js   (JSON import/export and text file downloads)
 */

export {
  STORAGE_KEYS,
  CURRENT_SCHEMA_VERSION,
  SAVE_DEBOUNCE_MS,
  isLocalStorageAvailable,
  rawGet,
  rawSet,
  rawRemove,
  clearMemoryStore
} from "./storage/core.js";

export { DEFAULT_SETTINGS, getSettings, saveSettings } from "./storage/settings.js";

export {
  flushSaveEvent,
  clearAllStorage,
  getEvents,
  getEvent,
  saveEvent,
  deleteEvent,
  getActiveEventId,
  setActiveEventId,
  getActiveEvent,
  ensureInitialEvent
} from "./storage/events.js";

export { downloadTextFile, exportEventJSON, importEventFromJSON } from "./storage/backup.js";
