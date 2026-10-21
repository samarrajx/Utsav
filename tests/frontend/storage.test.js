import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getEvents,
  getEvent,
  saveEvent,
  deleteEvent,
  getActiveEventId,
  setActiveEventId,
  getActiveEvent,
  getSettings,
  saveSettings,
  clearAllStorage,
  rawSet,
  importEventFromJSON,
  STORAGE_KEYS
} from "../../web/js/storage.js";

describe("Frontend Storage Manager", () => {
  beforeEach(() => {
    clearAllStorage();
  });

  describe("Event CRUD and Schema Integrity", () => {
    it("should save and retrieve an event with schemaVersion: 1", () => {
      const event = {
        id: "evt_101",
        title: "Kavya's Sweet 16",
        type: "birthday",
        date: "2026-11-20"
      };

      const saved = saveEvent(event);
      assert.equal(saved.schemaVersion, 1);
      assert.ok(saved.updatedAt);

      const retrieved = getEvent("evt_101");
      assert.equal(retrieved.title, "Kavya's Sweet 16");

      const all = getEvents();
      assert.equal(all.length, 1);
    });

    it("should update an existing event without duplicating it", () => {
      const event = { id: "evt_102", title: "Original Title" };
      saveEvent(event);

      const updated = { id: "evt_102", title: "Updated Title" };
      saveEvent(updated);

      const all = getEvents();
      assert.equal(all.length, 1);
      assert.equal(all[0].title, "Updated Title");
    });

    it("should delete an event and update active event if necessary", () => {
      saveEvent({ id: "evt_1", title: "E1" });
      saveEvent({ id: "evt_2", title: "E2" });
      setActiveEventId("evt_1");

      const deleted = deleteEvent("evt_1");
      assert.equal(deleted, true);
      assert.equal(getEvents().length, 1);

      // Active event should switch to evt_2
      assert.equal(getActiveEventId(), "evt_2");
    });

    it("should return null for nonexistent event ID", () => {
      assert.equal(getEvent("nonexistent_id"), null);
    });

    it("should reject saving invalid event objects without an ID", () => {
      assert.throws(() => saveEvent(null), TypeError);
      assert.throws(() => saveEvent({}), TypeError);
    });
  });

  describe("Storage corruption recovery", () => {
    it("should gracefully recover from corrupted JSON in localStorage", () => {
      // Intentionally insert corrupted invalid JSON
      rawSet(STORAGE_KEYS.EVENTS, "{ corrupted invalid json ...]");

      const events = getEvents();
      assert.deepEqual(events, []);
    });

    it("should gracefully recover from corrupted settings JSON", () => {
      rawSet(STORAGE_KEYS.SETTINGS, "not valid json");
      const settings = getSettings();
      assert.equal(settings.language, "en");
      assert.equal(settings.currency, "INR");
    });
  });

  describe("User Settings Persistence", () => {
    it("should save and retrieve user preferences", () => {
      const initial = getSettings();
      assert.equal(initial.currency, "INR");

      const updated = saveSettings({
        language: "hi",
        currency: "USD",
        countryCode: "US"
      });

      assert.equal(updated.language, "hi");
      assert.equal(updated.currency, "USD");
      assert.equal(updated.countryCode, "US");

      const fetched = getSettings();
      assert.equal(fetched.language, "hi");
      assert.equal(fetched.currency, "USD");
    });
  });

  describe("Active Event Resolution", () => {
    it("should resolve active event or fall back to first available event", () => {
      saveEvent({ id: "first_evt", title: "First" });
      saveEvent({ id: "second_evt", title: "Second" });

      const active = getActiveEvent();
      assert.ok(active);
      assert.equal(active.id, "first_evt");

      setActiveEventId("second_evt");
      assert.equal(getActiveEvent().id, "second_evt");
    });
  });

  describe("Backup Import Validation", () => {
    it("should successfully parse and extract a valid Utsav event backup", () => {
      const validBackup = JSON.stringify({
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        event: {
          id: "backup_test_1",
          title: "Anniversary Party",
          date: "2026-12-10",
          city: "Delhi"
        }
      });

      const imported = importEventFromJSON(validBackup);
      assert.equal(imported.id, "backup_test_1");
      assert.equal(imported.title, "Anniversary Party");
    });

    it("should reject corrupted or non-JSON input", () => {
      assert.throws(() => {
        importEventFromJSON("not-a-json-string");
      }, /Invalid JSON file/);
    });

    it("should reject JSON without an event object or id", () => {
      assert.throws(() => {
        importEventFromJSON(JSON.stringify({ someOtherData: true }));
      }, /does not contain a valid Utsav event backup/);
    });
  });
});
