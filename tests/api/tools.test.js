import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { executeEngineTool, ENGINE_TOOLS } from "../../api/_lib/tools.js";

describe("API Tool Loop & Grounding Tools", () => {
  it("should have all documented tools registered", () => {
    assert.ok(ENGINE_TOOLS.get_event_template);
    assert.ok(ENGINE_TOOLS.check_feasibility);
    assert.ok(ENGINE_TOOLS.allocate_budget);
    assert.ok(ENGINE_TOOLS.schedule_milestones);
  });

  it("should execute get_event_template tool", () => {
    const template = executeEngineTool("get_event_template", { type: "wedding" });
    assert.equal(template.type, "wedding");
  });

  it("should execute check_feasibility tool", () => {
    const result = executeEngineTool("check_feasibility", {
      type: "wedding",
      budget: 1000000,
      currency: "INR",
      guests: 100,
      city: "Jaipur",
      date: "2026-11-20"
    });
    assert.ok(["comfortable", "tight", "short", "unrealistic"].includes(result.band));
  });

  it("should execute allocate_budget tool", () => {
    const allocated = executeEngineTool("allocate_budget", {
      totalBudget: 10000,
      categories: [
        { id: "a", weight: 50 },
        { id: "b", weight: 50 }
      ]
    });
    assert.equal(allocated[0].planned + allocated[1].planned, 10000);
  });

  it("should execute schedule_milestones tool", () => {
    const scheduled = executeEngineTool("schedule_milestones", {
      eventDate: "2026-11-20",
      milestones: [{ id: "m1", title: "Venue", weeksBefore: 12 }]
    });
    assert.equal(scheduled.length, 1);
  });

  it("should throw for unknown tools", () => {
    assert.throws(() => {
      executeEngineTool("unknown_tool", {});
    }, /not found/);
  });
});
