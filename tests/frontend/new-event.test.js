import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { postApi, fetchIntake, fetchPlanSection, fetchCritique } from "../../web/js/api.js";
import { generateBaselinePlan } from "../../web/js/engine/baseline.js";
import { setupMockDOM } from "../helpers/mock-dom.js";
import { renderNewEventFlow } from "../../web/js/views/new-event.js";

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
        json: async () => ({
          risks: [{ severity: "low", title: "Test", detail: "Detail", suggestedFix: "Fix" }]
        })
      };
    };

    const critique = await fetchCritique({ type: "wedding" });
    assert.equal(critique.ok, true);
    assert.equal(critique.data.risks.length, 1);
  });

  describe("renderNewEventFlow Characterisation Tests", () => {
    let cleanupDOM;
    let originalFetch;

    beforeEach(() => {
      cleanupDOM = setupMockDOM();
      originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => {
        if (url.includes("/api/intake")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ ready: true })
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({})
        };
      };
    });

    afterEach(() => {
      if (cleanupDOM) cleanupDOM();
      globalThis.fetch = originalFetch;
    });

    it("should render Step 1 Intake with celebration types and input fields", () => {
      const elWizard = renderNewEventFlow({
        onComplete: () => {}
      });

      assert.ok(elWizard);
      assert.ok(elWizard.classList.contains("new-event-wizard"));

      // Check header and step badge
      const text = elWizard.textContent;
      assert.ok(text.includes("Plan a New Celebration"));
      assert.ok(text.includes("Step 1 of 3"));

      // Check event type choice cards
      const typeCards = elWizard.querySelectorAll(".type-card");
      assert.equal(typeCards.length, 3);

      // Check input fields
      const titleInput = elWizard.querySelector("#event-title");
      assert.ok(titleInput);

      const cityInput = elWizard.querySelector("#event-city");
      assert.ok(cityInput);

      const dateInput = elWizard.querySelector("#event-date");
      assert.ok(dateInput);

      const budgetInput = elWizard.querySelector("#event-budget");
      assert.ok(budgetInput);

      // Check submit button
      const submitBtn = elWizard.querySelector("button[type='submit']");
      assert.ok(submitBtn);
      assert.ok(submitBtn.textContent.includes("Check Feasibility"));
    });

    it("should allow typing inputs and advancing to feasibility directly", async () => {
      const elWizard = renderNewEventFlow({
        onComplete: () => {}
      });

      const titleInput = elWizard.querySelector("#event-title");
      titleInput.value = "Kunal & Sneha Wedding";

      const cityInput = elWizard.querySelector("#event-city");
      cityInput.value = "Udaipur";

      const dateInput = elWizard.querySelector("#event-date");
      dateInput.value = "2026-12-10";

      const budgetInput = elWizard.querySelector("#event-budget");
      budgetInput.value = "1200000";

      const form = elWizard.querySelector(".wizard-form");
      assert.ok(form);

      // Trigger submit and await handler promise
      const submitHandler = form.listeners.get("submit")[0];
      await submitHandler({ preventDefault: () => {} });

      // After intake, step becomes feasibility
      assert.ok(elWizard.textContent.includes("Feasibility Assessment"));
      assert.ok(elWizard.textContent.includes("Step 2 of 3"));
      assert.ok(elWizard.querySelector(".feasibility-card"));
    });

    it("should render clarification questions when intake returns questions, and advance to generating", async () => {
      // Mock intake returning questions
      globalThis.fetch = async (url) => {
        if (url.includes("/api/intake")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ready: false,
              questions: [
                {
                  id: "q1",
                  question: "Indoor hall or open lawns?",
                  whyNeeded: "Affects AC and rain contingency",
                  options: ["Indoor Banquet", "Open Lawn"]
                }
              ]
            })
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({})
        };
      };

      let finishGeneration;
      const donePromise = new Promise((resolve) => {
        finishGeneration = resolve;
      });

      const elWizard = renderNewEventFlow({
        onComplete: () => {
          finishGeneration();
        }
      });

      const form = elWizard.querySelector(".wizard-form");
      const submitHandler = form.listeners.get("submit")[0];
      await submitHandler({ preventDefault: () => {} });

      // Should be on questions step
      assert.ok(elWizard.textContent.includes("Clarification"));
      assert.ok(elWizard.textContent.includes("Indoor hall or open lawns?"));
      const chipButtons = elWizard.querySelectorAll(".chip-option-btn");
      assert.equal(chipButtons.length, 2);

      // Click option chip
      chipButtons[0].dispatchEvent({ type: "click" });

      // Click continue button on questions step
      const continueBtn = elWizard.querySelectorAll(".wizard-form-actions .btn-primary")[0];
      assert.ok(continueBtn);
      continueBtn.dispatchEvent({ type: "click" });

      // Now on feasibility step
      assert.ok(elWizard.textContent.includes("Feasibility Assessment"));

      // Click generate button
      const generateBtn = elWizard.querySelectorAll(".wizard-form-actions .btn-primary")[0];
      assert.ok(generateBtn);
      assert.ok(generateBtn.textContent.includes("Generate Celebration Plan"));
      generateBtn.dispatchEvent({ type: "click" });

      // Now on generating step
      assert.ok(elWizard.textContent.includes("Creating Your Personal Celebration Roadmap"));
      assert.ok(elWizard.textContent.includes("Step 3 of 3"));

      await donePromise;
    });
  });
});
