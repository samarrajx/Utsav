import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyPatch, ALLOWED_PATCH_OPS } from "../../web/js/engine/patch.js";

describe("Engine: patch.js", () => {
  const getMockPlan = () => ({
    schemaVersion: 1,
    id: "evt_1",
    type: "wedding",
    title: "Aarav & Diya Wedding",
    date: "2026-11-20",
    budget: {
      total: 1000000,
      categories: [
        { id: "venue", name: "Venue", weight: 31, planned: 310000 },
        { id: "catering", name: "Catering", weight: 26, planned: 260000 },
        { id: "decor", name: "Decor", weight: 18, planned: 180000 },
        { id: "photography", name: "Photography", weight: 12, planned: 120000 },
        { id: "attire", name: "Attire", weight: 8, planned: 80000 },
        { id: "entertainment", name: "Entertainment", weight: 5, planned: 50000 }
      ]
    },
    milestones: [
      { id: "m1", title: "Book venue", weeksBefore: 24, dueDate: "2026-06-05", status: "pending" },
      { id: "m2", title: "Lock caterer", weeksBefore: 16, dueDate: "2026-07-31", status: "pending" }
    ],
    tasks: [
      { id: "t1", milestoneId: "m1", title: "Visit site", due: "2026-06-05", done: false },
      { id: "t2", milestoneId: "m2", title: "Food tasting", due: "2026-07-31", done: false }
    ],
    vendors: [],
    ideas: [
      { id: "i1", section: "decor", title: "Floral chandelier", whyItFits: "Stunning visual", saved: true }
    ]
  });

  describe("set_category_weight", () => {
    it("should update category weight, renormalise other weights, and keep planned amounts EXACTLY equal to budget total", () => {
      const plan = getMockPlan();
      // Increase photography from 12 to 25
      const { plan: updated, diff } = applyPatch(plan, {
        op: "set_category_weight",
        categoryId: "photography",
        weight: 25
      });

      const photoCat = updated.budget.categories.find((c) => c.id === "photography");
      assert.equal(photoCat.weight, 25);

      // Verify all weights sum to 100
      const totalWeight = updated.budget.categories.reduce((s, c) => s + c.weight, 0);
      assert.equal(totalWeight, 100);

      // Verify all planned amounts sum EXACTLY to 1,000,000
      const totalPlanned = updated.budget.categories.reduce((s, c) => s + c.planned, 0);
      assert.equal(totalPlanned, 1000000);

      assert.ok(diff.summary.includes("Photography"));
      // Ensure input plan was not mutated
      assert.equal(plan.budget.categories.find((c) => c.id === "photography").weight, 12);
    });
  });

  describe("set_category_planned", () => {
    it("should adjust category planned amount, renormalise others, and preserve total budget sum", () => {
      const plan = getMockPlan();
      // Set decor to 250,000 (was 180,000)
      const { plan: updated, diff } = applyPatch(plan, {
        op: "set_category_planned",
        categoryId: "decor",
        amount: 250000
      });

      const decorCat = updated.budget.categories.find((c) => c.id === "decor");
      assert.equal(decorCat.planned, 250000);

      const totalPlanned = updated.budget.categories.reduce((s, c) => s + c.planned, 0);
      assert.equal(totalPlanned, 1000000);

      // Total weights must remain 100
      const totalWeight = updated.budget.categories.reduce((s, c) => s + c.weight, 0);
      assert.equal(totalWeight, 100);
      assert.ok(diff.summary.includes("Decor"));
    });
  });

  describe("set_budget_total", () => {
    it("should adjust total budget and scale planned amounts so sum equals new total", () => {
      const plan = getMockPlan();
      const { plan: updated, diff } = applyPatch(plan, {
        op: "set_budget_total",
        total: 1500000
      });

      assert.equal(updated.budget.total, 1500000);
      const totalPlanned = updated.budget.categories.reduce((s, c) => s + c.planned, 0);
      assert.equal(totalPlanned, 1500000);
      assert.ok(diff.summary.includes("1500000"));
    });
  });

  describe("Task & Milestone operations", () => {
    it("should add and remove tasks", () => {
      const plan = getMockPlan();
      const { plan: withTask } = applyPatch(plan, {
        op: "add_task",
        milestoneId: "m1",
        title: "Pay 20% advance"
      });

      assert.equal(withTask.tasks.length, 3);
      const added = withTask.tasks.find((t) => t.title === "Pay 20% advance");
      assert.ok(added);

      const { plan: withoutTask } = applyPatch(withTask, {
        op: "remove_task",
        taskId: added.id
      });
      assert.equal(withoutTask.tasks.length, 2);
    });

    it("should move milestone date and update linked task dates", () => {
      const plan = getMockPlan();
      const { plan: moved } = applyPatch(plan, {
        op: "move_milestone",
        milestoneId: "m1",
        newDueDate: "2026-06-15"
      });

      const m1 = moved.milestones.find((m) => m.id === "m1");
      assert.equal(m1.dueDate, "2026-06-15");

      const linkedTask = moved.tasks.find((t) => t.milestoneId === "m1");
      assert.equal(linkedTask.due, "2026-06-15");
    });
  });

  describe("Idea & Vendor operations", () => {
    it("should add and remove ideas", () => {
      const plan = getMockPlan();
      const { plan: withIdea } = applyPatch(plan, {
        op: "add_idea",
        section: "entertainment",
        title: "Cold pyro entry",
        whyItFits: "Dramatic entrance"
      });

      assert.equal(withIdea.ideas.length, 2);
      const newIdea = withIdea.ideas.find((i) => i.title === "Cold pyro entry");
      assert.ok(newIdea);

      const { plan: withoutIdea } = applyPatch(withIdea, {
        op: "remove_idea",
        ideaId: newIdea.id
      });
      assert.equal(withoutIdea.ideas.length, 1);
    });

    it("should add vendor category", () => {
      const plan = getMockPlan();
      const { plan: withVendor } = applyPatch(plan, {
        op: "add_vendor_category",
        category: "Bridal Mehendi"
      });

      assert.equal(withVendor.vendors.length, 1);
      assert.equal(withVendor.vendors[0].name, "Bridal Mehendi");
    });
  });

  describe("Security and allowlist enforcement", () => {
    it("should reject disallowed operations", () => {
      const plan = getMockPlan();
      assert.throws(() => {
        applyPatch(plan, { op: "drop_database_table", data: {} });
      }, /Unauthorized or unknown patch operation/);

      assert.throws(() => {
        applyPatch(plan, { op: "eval_code", code: "alert(1)" });
      }, /Unauthorized or unknown patch operation/);
    });

    it("should check allowed patch operations list", () => {
      assert.ok(ALLOWED_PATCH_OPS.includes("set_category_weight"));
      assert.ok(ALLOWED_PATCH_OPS.includes("set_category_planned"));
      assert.ok(ALLOWED_PATCH_OPS.includes("add_task"));
    });

    it("should handle error conditions and validation branches", () => {
      assert.throws(() => applyPatch(null, { op: "add_task" }), TypeError);
      assert.throws(() => applyPatch({}, null), TypeError);
      assert.throws(() => applyPatch({}, {}), TypeError);

      const plan = getMockPlan();
      // Unknown category in set_category_weight
      assert.throws(() => {
        applyPatch(plan, { op: "set_category_weight", categoryId: "nonexistent", weight: 20 });
      }, /Category not found/);

      // Unknown category in set_category_planned
      assert.throws(() => {
        applyPatch(plan, { op: "set_category_planned", categoryId: "nonexistent", amount: 1000 });
      }, /Category not found/);

      // Missing task title
      assert.throws(() => {
        applyPatch(plan, { op: "add_task", milestoneId: "m1", title: "" });
      }, /Task title is required/);

      // Remove nonexistent task
      assert.throws(() => {
        applyPatch(plan, { op: "remove_task", taskId: "ghost_task" });
      }, /not found/);

      // Move nonexistent milestone
      assert.throws(() => {
        applyPatch(plan, { op: "move_milestone", milestoneId: "ghost_ms", newDueDate: "2026-12-01" });
      }, /not found/);

      // Missing milestone title in add_milestone
      assert.throws(() => {
        applyPatch(plan, { op: "add_milestone", title: "" });
      }, /Milestone title is required/);

      // Missing idea title in add_idea
      assert.throws(() => {
        applyPatch(plan, { op: "add_idea", title: "" });
      }, /Idea title is required/);

      // Remove nonexistent idea
      assert.throws(() => {
        applyPatch(plan, { op: "remove_idea", ideaId: "ghost_idea" });
      }, /not found/);

      // Missing vendor category name
      assert.throws(() => {
        applyPatch(plan, { op: "add_vendor_category", category: "" });
      }, /Vendor category name is required/);

      // Duplicate vendor category
      const withVendor = applyPatch(plan, { op: "add_vendor_category", category: "Florist" }).plan;
      assert.throws(() => {
        applyPatch(withVendor, { op: "add_vendor_category", category: "Florist" });
      }, /already exists/);

      // Plan without budget categories
      assert.throws(() => {
        applyPatch({ budget: {} }, { op: "set_category_weight", categoryId: "a", weight: 10 });
      }, /Plan has no valid budget categories/);
      assert.throws(() => {
        applyPatch({ budget: {} }, { op: "set_category_planned", categoryId: "a", amount: 10 });
      }, /Plan has no valid budget categories/);
    });
  });
});
