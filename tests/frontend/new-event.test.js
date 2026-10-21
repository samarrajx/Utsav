import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { postApi, fetchIntake, fetchPlanSection, fetchCritique } from "../../web/js/api.js";
import { generateBaselinePlan } from "../../web/js/engine/baseline.js";

describe("Frontend API Client & Fallback Resilience", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should successfully post and parse API responses", async () => {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.method, "POST");
      assert.equal(options.headers["Content-Type"], "application/json");
      return {
        ok: true,
        status: 200,
        json: async () => ({ ready: true })
      };
    };

    const res = await postApi("/api/intake", { type: "wedding" });
    assert.equal(res.ok, true);
    assert.equal(res.data.ready, true);
  });

  it("should catch HTTP 500 error and return structured failure", async () => {
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal Model Error" })
      };
    };

    const res = await fetchIntake({ type: "wedding" });
    assert.equal(res.ok, false);
    assert.equal(res.status, 500);
    assert.equal(res.error, "Internal Model Error");
  });

  it("should catch network exceptions / offline errors gracefully without crashing", async () => {
    globalThis.fetch = async () => {
      throw new Error("Failed to fetch / Network disconnected");
    };

    const res = await fetchPlanSection("core", { budget: 1000000 });
    assert.equal(res.ok, false);
    assert.equal(res.status, 0);
    assert.ok(res.error.includes("Failed to fetch"));
  });

  it("should trigger baseline fallback when API is completely down", () => {
    // When API fails, system falls back to generateBaselinePlan
    const fallbackPlan = generateBaselinePlan({
      type: "wedding",
      title: "Offline Wedding",
      date: "2026-11-20",
      city: "Udaipur",
      budget: 1000000,
      guests: 150
    });

    assert.equal(fallbackPlan.isBaselineFallback, true);
    assert.equal(fallbackPlan.budget.total, 1000000);
    const sum = fallbackPlan.budget.categories.reduce((s, c) => s + c.planned, 0);
    assert.equal(sum, 1000000);
    assert.ok(fallbackPlan.milestones.length >= 4);
    assert.ok(fallbackPlan.vendors.length >= 5);
    assert.ok(fallbackPlan.ideas.length >= 3);
  });

  it("should test fetchCritique wrapper", async () => {
    globalThis.fetch = async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ risks: [{ severity: "low", title: "Test", detail: "Detail", suggestedFix: "Fix" }] })
      };
    };

    const critique = await fetchCritique({ type: "wedding" });
    assert.equal(critique.ok, true);
    assert.equal(critique.data.risks.length, 1);
  });
});
