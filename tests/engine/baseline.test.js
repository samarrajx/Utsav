import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateBaselinePlan } from "../../web/js/engine/baseline.js";
import { EVENT_TYPES } from "../../web/js/engine/templates.js";

describe("Engine: baseline.js", () => {
  it("should generate a complete, valid baseline wedding plan conforming to Section 4 schema", () => {
    const mockNow = () => new Date(Date.UTC(2026, 0, 1)); // 2026-01-01

    const plan = generateBaselinePlan({
      type: "wedding",
      title: "Priya & Kabir's Wedding",
      date: "2026-11-25",
      city: "Jaipur",
      countryCode: "IN",
      currency: "INR",
      budget: 1500000,
      guests: 200,
      language: "en"
    }, mockNow);

    // Schema verification
    assert.equal(plan.schemaVersion, 1);
    assert.ok(plan.id.startsWith("event_"));
    assert.equal(plan.isBaselineFallback, true);
    assert.equal(plan.type, "wedding");
    assert.equal(plan.title, "Priya & Kabir's Wedding");
    assert.equal(plan.date, "2026-11-25");
    assert.equal(plan.city, "Jaipur");
    assert.equal(plan.currency, "INR");
    assert.equal(plan.guests.target, 200);
    assert.equal(plan.budget.total, 1500000);

    // Budget math verification: sum of categories must equal budget.total EXACTLY
    const plannedSum = plan.budget.categories.reduce((s, c) => s + c.planned, 0);
    assert.equal(plannedSum, 1500000, "Categories planned sum does not match total budget");

    // Weights must sum to 100
    const weightSum = plan.budget.categories.reduce((s, c) => s + c.weight, 0);
    assert.equal(weightSum, 100);

    // Milestones and tasks
    assert.ok(plan.milestones.length >= 4);
    assert.ok(plan.tasks.length >= 10);

    // Vendors
    assert.ok(plan.vendors.length >= 5);
    const venueVendor = plan.vendors.find((v) => v.category === "venue");
    assert.ok(venueVendor);
    assert.equal(venueVendor.status, "to_find");

    // Ideas
    assert.ok(plan.ideas.length >= 3);
    assert.ok(plan.ideas.every((i) => i.title && i.whyItFits));

    // Feasibility & critique
    assert.ok(plan.feasibility);
    assert.ok(["comfortable", "tight", "short", "unrealistic"].includes(plan.feasibility.band));
    assert.ok(plan.critique);
    assert.ok(Array.isArray(plan.critique.risks));
  });

  it("should generate complete baseline plans for birthday and community events", () => {
    const birthday = generateBaselinePlan({
      type: EVENT_TYPES.BIRTHDAY,
      city: "Bengaluru",
      budget: 80000,
      guests: 40
    });
    assert.equal(birthday.type, "birthday");
    const bdaySum = birthday.budget.categories.reduce((s, c) => s + c.planned, 0);
    assert.equal(bdaySum, 80000);

    const community = generateBaselinePlan({
      type: EVENT_TYPES.COMMUNITY,
      city: "Pune",
      budget: 350000,
      guests: 500
    });
    assert.equal(community.type, "community");
    const commSum = community.budget.categories.reduce((s, c) => s + c.planned, 0);
    assert.equal(commSum, 350000);
  });

  it("should support international currencies in baseline plans", () => {
    const usdPlan = generateBaselinePlan({
      type: "wedding",
      currency: "USD",
      budget: 25000,
      guests: 120,
      city: "Goa"
    });

    assert.equal(usdPlan.currency, "USD");
    assert.equal(usdPlan.budget.total, 25000);
    const sum = usdPlan.budget.categories.reduce((s, c) => s + c.planned, 0);
    assert.equal(sum, 25000);
    assert.equal(usdPlan.feasibility.currency, "USD");
  });
});
