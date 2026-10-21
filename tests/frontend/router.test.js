import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseHash } from "../../web/js/router.js";

describe("Frontend Router", () => {
  it("should parse root hash as home route", () => {
    assert.deepEqual(parseHash(""), { path: "home" });
    assert.deepEqual(parseHash("#/"), { path: "home" });
    assert.deepEqual(parseHash("#"), { path: "home" });
  });

  it("should parse #/new route", () => {
    assert.deepEqual(parseHash("#/new"), { path: "new" });
  });

  it("should parse #/events route", () => {
    assert.deepEqual(parseHash("#/events"), { path: "events" });
  });

  it("should parse #/settings route", () => {
    assert.deepEqual(parseHash("#/settings"), { path: "settings" });
  });

  it("should parse #/event/:id/:tab route with fallback to overview tab", () => {
    assert.deepEqual(parseHash("#/event/evt_123/budget"), {
      path: "event",
      eventId: "evt_123",
      tab: "budget"
    });

    assert.deepEqual(parseHash("#/event/evt_123/tasks"), {
      path: "event",
      eventId: "evt_123",
      tab: "tasks"
    });

    // Unknown tab falls back to overview
    assert.deepEqual(parseHash("#/event/evt_123/invalid_tab"), {
      path: "event",
      eventId: "evt_123",
      tab: "overview"
    });

    // Omitted tab defaults to overview
    assert.deepEqual(parseHash("#/event/evt_123"), {
      path: "event",
      eventId: "evt_123",
      tab: "overview"
    });
  });

  describe("Navigation & Router lifecycle", () => {
    it("should update hash and trigger listeners", () => {
      let routeReceived = null;
      let hash = "#/events";

      // Mock window hash and event listener
      const listeners = [];
      globalThis.window = {
        location: {
          get hash() {
            return hash;
          },
          set hash(v) {
            hash = v;
            listeners.forEach((l) => l());
          }
        },
        addEventListener(event, fn) {
          if (event === "hashchange") listeners.push(fn);
        },
        removeEventListener(event, fn) {
          const idx = listeners.indexOf(fn);
          if (idx >= 0) listeners.splice(idx, 1);
        }
      };

      import("../../web/js/router.js").then(({ initRouter, navigate }) => {
        const cleanup = initRouter((r) => {
          routeReceived = r;
        });

        assert.equal(routeReceived.path, "events");

        navigate("#/new");
        assert.equal(routeReceived.path, "new");

        navigate("/settings");
        assert.equal(routeReceived.path, "settings");

        cleanup();
      });
    });
  });
});
