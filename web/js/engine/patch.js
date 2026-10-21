/**
 * patch.js - Deterministic plan patching and budget renormalisation for Utsav
 *
 * Implements strict allowlist validation and guarantees budget invariants:
 * category allocations always sum to the budget total.
 */

import { allocateBudget } from "./money.js";
import { parseDate, toISODateString } from "./dates.js";

export const ALLOWED_PATCH_OPS = [
  "set_category_weight",
  "set_category_planned",
  "add_task",
  "remove_task",
  "move_milestone",
  "add_milestone",
  "add_idea",
  "remove_idea",
  "add_vendor_category",
  "set_budget_total"
];

/**
 * Deep clone a plain JavaScript object
 * @template T
 * @param {T} obj
 * @returns {T}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Apply a validated, allowlisted patch to an event plan.
 *
 * @param {Object} plan - Current event state
 * @param {Object} patch - Patch payload with { op, ...params }
 * @returns {{ plan: Object, diff: { op: string, summary: string, details: any } }}
 */
export function applyPatch(plan, patch) {
  if (!plan || typeof plan !== "object") {
    throw new TypeError("plan must be an object");
  }
  if (!patch || typeof patch !== "object" || !patch.op) {
    throw new TypeError("patch must be an object with an 'op' property");
  }

  const op = patch.op;
  if (!ALLOWED_PATCH_OPS.includes(op)) {
    throw new Error(`Unauthorized or unknown patch operation: '${op}'`);
  }

  const nextPlan = deepClone(plan);
  let summary = "";
  let details = {};

  switch (op) {
    case "set_category_weight": {
      const { categoryId, weight } = patch;
      const targetWeight = Math.min(100, Math.max(1, Math.round(Number(weight) || 1)));

      if (!nextPlan.budget || !Array.isArray(nextPlan.budget.categories)) {
        throw new Error("Plan has no valid budget categories");
      }

      const cats = nextPlan.budget.categories;
      const targetIdx = cats.findIndex((c) => c.id === categoryId);
      if (targetIdx === -1) {
        throw new Error(`Category not found: ${categoryId}`);
      }

      const oldWeight = cats[targetIdx].weight;
      const remainingWeight = 100 - targetWeight;
      const otherCats = cats.filter((_, idx) => idx !== targetIdx);
      const otherTotalWeight = otherCats.reduce((sum, c) => sum + (c.weight || 0), 0);

      // Proportionally distribute remaining weight to other categories
      if (otherCats.length > 0) {
        if (otherTotalWeight > 0) {
          otherCats.forEach((c) => {
            c.weight = (c.weight / otherTotalWeight) * remainingWeight;
          });
        } else {
          const equal = remainingWeight / otherCats.length;
          otherCats.forEach((c) => {
            c.weight = equal;
          });
        }

        // Integer rounding using largest-remainder for weights
        const allocatedWeights = allocateBudget(remainingWeight, otherCats);
        otherCats.forEach((c, i) => {
          c.weight = allocatedWeights[i].planned;
        });
      }

      cats[targetIdx].weight = targetWeight;

      // Re-allocate budget amounts to ensure planned amounts sum exactly to budget.total
      const reallocated = allocateBudget(nextPlan.budget.total, cats);
      cats.forEach((c, idx) => {
        c.planned = reallocated[idx].planned;
      });

      summary = `Updated weight for ${cats[targetIdx].name} to ${targetWeight}% (was ${oldWeight}%)`;
      details = { categoryId, oldWeight, newWeight: targetWeight };
      break;
    }

    case "set_category_planned": {
      const { categoryId, amount } = patch;
      const targetPlanned = Math.max(0, Math.round(Number(amount) || 0));

      if (!nextPlan.budget || !Array.isArray(nextPlan.budget.categories)) {
        throw new Error("Plan has no valid budget categories");
      }

      const cats = nextPlan.budget.categories;
      const targetIdx = cats.findIndex((c) => c.id === categoryId);
      if (targetIdx === -1) {
        throw new Error(`Category not found: ${categoryId}`);
      }

      const totalBudget = nextPlan.budget.total;
      const cappedPlanned = Math.min(totalBudget, targetPlanned);
      const oldPlanned = cats[targetIdx].planned;
      const remainingBudget = totalBudget - cappedPlanned;

      const otherCats = cats.filter((_, idx) => idx !== targetIdx);

      if (otherCats.length > 0) {
        const reallocatedOthers = allocateBudget(remainingBudget, otherCats);
        otherCats.forEach((c, i) => {
          c.planned = reallocatedOthers[i].planned;
        });
      }

      cats[targetIdx].planned = cappedPlanned;

      // Re-normalize weights according to new planned split
      const weightAllocated = allocateBudget(100, cats.map((c) => ({ ...c, weight: c.planned })));
      cats.forEach((c, idx) => {
        c.weight = weightAllocated[idx].planned;
      });

      summary = `Adjusted planned budget for ${cats[targetIdx].name} to ${cappedPlanned} (was ${oldPlanned})`;
      details = { categoryId, oldPlanned, newPlanned: cappedPlanned };
      break;
    }

    case "set_budget_total": {
      const newTotal = Math.max(0, Math.round(Number(patch.total) || 0));
      const oldTotal = nextPlan.budget.total;

      nextPlan.budget.total = newTotal;
      const reallocated = allocateBudget(newTotal, nextPlan.budget.categories);
      nextPlan.budget.categories.forEach((c, idx) => {
        c.planned = reallocated[idx].planned;
      });

      summary = `Updated total event budget to ${newTotal} (was ${oldTotal})`;
      details = { oldTotal, newTotal };
      break;
    }

    case "add_task": {
      const { milestoneId, title, due } = patch;
      if (!title || typeof title !== "string") {
        throw new Error("Task title is required");
      }

      const milestone = (nextPlan.milestones || []).find((m) => m.id === milestoneId) || (nextPlan.milestones || [])[0];
      const taskDueDate = due || (milestone ? milestone.dueDate : nextPlan.date);

      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        milestoneId: milestone ? milestone.id : "m_general",
        title: title.trim(),
        due: taskDueDate,
        done: false,
        overdue: false
      };

      if (!Array.isArray(nextPlan.tasks)) {
        nextPlan.tasks = [];
      }
      nextPlan.tasks.push(newTask);

      summary = `Added task: "${newTask.title}"`;
      details = { task: newTask };
      break;
    }

    case "remove_task": {
      const { taskId } = patch;
      const initialCount = (nextPlan.tasks || []).length;
      nextPlan.tasks = (nextPlan.tasks || []).filter((t) => t.id !== taskId);

      if (nextPlan.tasks.length === initialCount) {
        throw new Error(`Task with id '${taskId}' not found`);
      }

      summary = `Removed task ID ${taskId}`;
      details = { taskId };
      break;
    }

    case "move_milestone": {
      const { milestoneId, newDueDate } = patch;
      const milestone = (nextPlan.milestones || []).find((m) => m.id === milestoneId);
      if (!milestone) {
        throw new Error(`Milestone '${milestoneId}' not found`);
      }

      const formattedDate = toISODateString(parseDate(newDueDate));
      const oldDate = milestone.dueDate;
      milestone.dueDate = formattedDate;

      // Update linked tasks that share this due date
      (nextPlan.tasks || []).forEach((t) => {
        if (t.milestoneId === milestoneId) {
          t.due = formattedDate;
        }
      });

      summary = `Rescheduled milestone "${milestone.title}" to ${formattedDate} (was ${oldDate})`;
      details = { milestoneId, oldDate, newDate: formattedDate };
      break;
    }

    case "add_milestone": {
      const { title, weeksBefore = 4, dueDate } = patch;
      if (!title || typeof title !== "string") {
        throw new Error("Milestone title is required");
      }

      const calculatedDue = dueDate || toISODateString(parseDate(nextPlan.date));
      const newMilestone = {
        id: `ms_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim(),
        weeksBefore: Number(weeksBefore) || 0,
        dueDate: calculatedDue,
        status: "pending",
        overdue: false
      };

      if (!Array.isArray(nextPlan.milestones)) {
        nextPlan.milestones = [];
      }
      nextPlan.milestones.push(newMilestone);

      summary = `Added milestone: "${newMilestone.title}" due ${newMilestone.dueDate}`;
      details = { milestone: newMilestone };
      break;
    }

    case "add_idea": {
      const { section = "general", title, whyItFits } = patch;
      if (!title || typeof title !== "string") {
        throw new Error("Idea title is required");
      }

      const newIdea = {
        id: `idea_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        section,
        title: title.trim(),
        whyItFits: (whyItFits || "").trim(),
        saved: true
      };

      if (!Array.isArray(nextPlan.ideas)) {
        nextPlan.ideas = [];
      }
      nextPlan.ideas.push(newIdea);

      summary = `Added idea: "${newIdea.title}"`;
      details = { idea: newIdea };
      break;
    }

    case "remove_idea": {
      const { ideaId } = patch;
      const initialCount = (nextPlan.ideas || []).length;
      nextPlan.ideas = (nextPlan.ideas || []).filter((i) => i.id !== ideaId);

      if (nextPlan.ideas.length === initialCount) {
        throw new Error(`Idea with id '${ideaId}' not found`);
      }

      summary = `Removed idea ID ${ideaId}`;
      details = { ideaId };
      break;
    }

    case "add_vendor_category": {
      const { category, weight = 5 } = patch;
      if (!category || typeof category !== "string") {
        throw new Error("Vendor category name is required");
      }

      const catId = category.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const existing = (nextPlan.vendors || []).find((v) => v.category === catId);
      if (existing) {
        throw new Error(`Vendor category '${category}' already exists`);
      }

      const newVendor = {
        id: `v_${catId}`,
        category: catId,
        name: category,
        status: "to_find",
        quote: 0,
        bookBy: nextPlan.date,
        lookFor: ["Reliable service", "Portfolio review", "Transparent contract"],
        askThem: ["Are you available on our date?", "What is your payment structure?"]
      };

      if (!Array.isArray(nextPlan.vendors)) {
        nextPlan.vendors = [];
      }
      nextPlan.vendors.push(newVendor);

      summary = `Added vendor category "${category}"`;
      details = { vendor: newVendor, weight };
      break;
    }
  }

  return {
    plan: nextPlan,
    diff: {
      op,
      summary,
      details
    }
  };
}
