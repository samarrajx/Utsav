/**
 * backup.js - Export and import celebration plans as JSON backups
 */

import { CURRENT_SCHEMA_VERSION } from "./core.js";

/**
 * Trigger a browser download of a text file
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function downloadTextFile(content, filename, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

/**
 * Export an event as a JSON backup file
 * @param {Object} event
 */
export function exportEventJSON(event) {
  const data = {
    exportedAt: new Date().toISOString(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    event
  };
  const filename = `utsav-${(event.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-backup.json`;
  downloadTextFile(JSON.stringify(data, null, 2), filename, "application/json");
}

/**
 * Validate and import an event from a JSON backup string
 * Returns the imported event object or throws on invalid data.
 * @param {string} jsonString
 * @returns {Object} the event object
 */
export function importEventFromJSON(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid JSON file. Please choose a valid Utsav backup.");
  }
  const evt = parsed.event;
  if (!evt || typeof evt !== "object" || !evt.id || !evt.title) {
    throw new Error("JSON file does not contain a valid Utsav event backup.");
  }
  return evt;
}
