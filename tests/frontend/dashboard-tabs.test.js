import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setupMockDOM } from "../helpers/mock-dom.js";
import { generateBaselinePlan } from "../../web/js/engine/baseline.js";
import { renderOverviewTab } from "../../web/js/views/overview-tab.js";
import { renderTasksTab } from "../../web/js/views/tasks-tab.js";
import { renderBudgetTab } from "../../web/js/views/budget-tab.js";
import { renderVendorsTab } from "../../web/js/views/vendors-tab.js";
import { renderTimelineTab } from "../../web/js/views/timeline-tab.js";
import { renderGuestsTab } from "../../web/js/views/guests-tab.js";
import { renderIdeasTab } from "../../web/js/views/ideas-tab.js";
import { renderTablist } from "../../web/js/views/tabs.js";

describe("Frontend Dashboard Tabs Integration Suite", () => {
  let cleanupDOM;
  let testEvent;

  beforeEach(() => {
    cleanupDOM = setupMockDOM();
    testEvent = generateBaselinePlan({
      type: "wedding",
      title: "Royal Jaipur Wedding",
      date: "2026-11-20",
      city: "Jaipur",
      budget: 1000000,
      guests: 150,
      currency: "INR"
    });
  });

  afterEach(() => {
    if (cleanupDOM) cleanupDOM();
  });

  describe("Overview Tab", () => {
    it("should render overview metrics, progress ring, next milestone, and feasibility badge", () => {
      let navigatedTo = null;
      let announcements = [];

      const view = renderOverviewTab(testEvent, {
        onUpdate: () => {},
        onNavigateTab: (tab) => { navigatedTo = tab; },
        announce: (msg) => announcements.push(msg)
      });

      assert.ok(view);
      assert.ok(view.classList.contains("tabpanel-overview"));

      // Check metric values
      const text = view.textContent;
      assert.ok(text.includes("Total Budget"));
      assert.ok(text.includes("Planning Progress"));
      assert.ok(text.includes("Next Major Milestone"));
      assert.ok(text.includes("Guest List Status"));

      // Test navigation trigger
      const links = view.querySelectorAll(".btn-text-link");
      assert.ok(links.length > 0);
      links[0].dispatchEvent({ type: "click" });
      assert.equal(navigatedTo, "budget");
    });

    it("should allow quick task completion from overview and trigger onUpdate", () => {
      let updated = false;
      let announced = null;

      const view = renderOverviewTab(testEvent, {
        onUpdate: () => { updated = true; },
        onNavigateTab: () => {},
        announce: (msg) => { announced = msg; }
      });

      const checkbox = view.querySelector(".task-checkbox");
      if (checkbox) {
        checkbox.dispatchEvent({ type: "change", target: { checked: true } });
        assert.equal(updated, true);
        assert.ok(announced.includes("marked as completed"));
      }
    });
  });

  describe("Tasks Tab", () => {
    it("should render milestone groups and toggle task completion", () => {
      let updated = false;
      let announced = null;

      const view = renderTasksTab(testEvent, {
        onUpdate: () => { updated = true; },
        announce: (msg) => { announced = msg; }
      });

      const initialCount = testEvent.tasks.length;
      assert.ok(initialCount > 0);

      const checkbox = view.querySelector(".task-checkbox-input");
      assert.ok(checkbox);
      checkbox.dispatchEvent({ type: "change", target: { checked: true } });
      assert.equal(updated, true);
      assert.ok(announced.includes("completed"));
    });

    it("should support adding and deleting a task", () => {
      let updated = false;
      const view = renderTasksTab(testEvent, {
        onUpdate: () => { updated = true; },
        announce: () => {}
      });

      const initialLength = testEvent.tasks.length;

      // Add task via form
      const form = view.querySelector(".add-task-card");
      assert.ok(form);
      const titleInput = form.querySelector("#new-task-title");
      titleInput.value = "Schedule final tasting session";

      form.dispatchEvent({ type: "submit", preventDefault: () => {} });
      assert.equal(updated, true);
      assert.equal(testEvent.tasks.length, initialLength + 1);

      // Delete task
      const deleteBtn = view.querySelector(".btn-delete-task");
      assert.ok(deleteBtn);
      deleteBtn.dispatchEvent({ type: "click" });
      assert.equal(testEvent.tasks.length, initialLength);
    });
  });

  describe("Budget Tab", () => {
    it("should render KPI summary, donut chart, category table, and log an expense", () => {
      let updated = false;
      let announced = null;

      const view = renderBudgetTab(testEvent, {
        onUpdate: () => { updated = true; },
        announce: (msg) => { announced = msg; }
      });

      const text = view.textContent;
      assert.ok(text.includes("Total Budget"));
      assert.ok(text.includes("Recorded Expenses"));

      // Log an expense
      const form = view.querySelector(".add-expense-form");
      assert.ok(form);
      form.querySelector("#exp-desc").value = "Advance for venue hall";
      form.querySelector("#exp-amount").value = "250000";

      form.dispatchEvent({ type: "submit", preventDefault: () => {} });
      assert.equal(updated, true);
      assert.equal(testEvent.expenses.length, 1);
      assert.ok(announced.includes("2,50,000") || announced.includes("250000") || announced.includes("₹"));

      // Delete expense
      const deleteBtn = view.querySelector(".btn-delete-expense");
      assert.ok(deleteBtn);
      deleteBtn.dispatchEvent({ type: "click" });
      assert.equal(testEvent.expenses.length, 0);
    });
  });

  describe("Vendors Tab", () => {
    it("should render vendor cards, update status, quote, and handle outreach drafting", () => {
      let updated = false;
      let drafted = null;

      const view = renderVendorsTab(testEvent, {
        onUpdate: () => { updated = true; },
        onDraftMessage: (v) => { drafted = v; },
        announce: () => {}
      });

      const select = view.querySelector(".vendor-status-select");
      assert.ok(select);
      select.dispatchEvent({ type: "change", target: { value: "booked" } });
      assert.equal(updated, true);
      assert.equal(testEvent.vendors[0].status, "booked");

      const quoteInput = view.querySelector(".quote-input");
      assert.ok(quoteInput);
      quoteInput.dispatchEvent({ type: "change", target: { value: "75000" } });
      assert.equal(testEvent.vendors[0].quote, 75000);

      const draftBtn = view.querySelector(".btn-draft-outreach");
      assert.ok(draftBtn);
      draftBtn.dispatchEvent({ type: "click" });
      assert.ok(drafted);
    });

    it("should allow adding a custom vendor category", () => {
      let updated = false;
      const view = renderVendorsTab(testEvent, {
        onUpdate: () => { updated = true; },
        announce: () => {}
      });

      const initialCount = testEvent.vendors.length;
      const form = view.querySelector(".add-vendor-card");
      assert.ok(form);
      form.querySelector("#new-vendor-name").value = "Fireworks & Pyrotechnics";

      form.dispatchEvent({ type: "submit", preventDefault: () => {} });
      assert.equal(updated, true);
      assert.equal(testEvent.vendors.length, initialCount + 1);
    });
  });

  describe("Timeline Tab", () => {
    it("should render milestone countdown, sequence, and toggle milestone completion", () => {
      let updated = false;
      const view = renderTimelineTab(testEvent, {
        onUpdate: () => { updated = true; },
        announce: () => {}
      });

      assert.ok(view.textContent.includes("Milestone Countdown Timeline"));
      const toggleBtn = view.querySelector(".btn-toggle-milestone");
      assert.ok(toggleBtn);

      toggleBtn.dispatchEvent({ type: "click" });
      assert.equal(updated, true);
      assert.equal(testEvent.milestones[0].status, "completed");
    });

    it("should allow scheduling a new custom milestone", () => {
      let updated = false;
      const view = renderTimelineTab(testEvent, {
        onUpdate: () => { updated = true; },
        announce: () => {}
      });

      const initialCount = testEvent.milestones.length;
      const form = view.querySelector(".add-milestone-card");
      form.querySelector("#new-milestone-title").value = "Send Invitation Parcels";
      form.querySelector("#new-milestone-date").value = "2026-10-15";

      form.dispatchEvent({ type: "submit", preventDefault: () => {} });
      assert.equal(updated, true);
      assert.equal(testEvent.milestones.length, initialCount + 1);
    });
  });

  describe("Guests Tab", () => {
    it("should compute catering plates and support adding and updating guest RSVPs", () => {
      let updated = false;
      const view = renderGuestsTab(testEvent, {
        onUpdate: () => { updated = true; },
        announce: () => {}
      });

      assert.ok(view.textContent.includes("Catering Maths"));
      assert.ok(view.textContent.includes("RECOMMENDED PLATES"));

      // Add a guest
      const form = view.querySelector(".add-guest-card");
      form.querySelector("#guest-name").value = "Dr. Vikram & Sunita Malhotra";
      form.querySelector("#guest-status").value = "confirmed";
      form.querySelector("#guest-diet").value = "Pure Vegetarian";

      form.dispatchEvent({ type: "submit", preventDefault: () => {} });
      assert.equal(updated, true);
      assert.equal(testEvent.guests.list.length, 1);

      // Change status
      const select = view.querySelector(".guest-status-select");
      assert.ok(select);
      select.dispatchEvent({ type: "change", target: { value: "declined" } });
      assert.equal(testEvent.guests.list[0].status, "declined");

      // Delete guest
      const deleteBtn = view.querySelector(".btn-delete-guest");
      assert.ok(deleteBtn);
      deleteBtn.dispatchEvent({ type: "click" });
      assert.equal(testEvent.guests.list.length, 0);
    });
  });

  describe("Ideas Tab", () => {
    it("should render idea cards and toggle favorite heart status", () => {
      let updated = false;
      const view = renderIdeasTab(testEvent, {
        onUpdate: () => { updated = true; },
        announce: () => {}
      });

      assert.ok(view.textContent.includes("Curated Celebration Concepts"));

      const heartBtn = view.querySelector(".btn-heart-toggle");
      assert.ok(heartBtn);
      const initialSaved = testEvent.ideas[0].saved;

      heartBtn.dispatchEvent({ type: "click" });
      assert.equal(updated, true);
      assert.equal(testEvent.ideas[0].saved, !initialSaved);
    });

    it("should allow proposing a custom concept", () => {
      let updated = false;
      const view = renderIdeasTab(testEvent, {
        onUpdate: () => { updated = true; },
        announce: () => {}
      });

      const initialCount = testEvent.ideas.length;
      const form = view.querySelector(".add-idea-card");
      form.querySelector("#new-idea-title").value = "Drone flower petal drop during varmala";
      form.querySelector("#new-idea-section").value = "rituals";

      form.dispatchEvent({ type: "submit", preventDefault: () => {} });
      assert.equal(updated, true);
      assert.equal(testEvent.ideas.length, initialCount + 1);
    });
  });

  describe("In-Place Tab Navigation & Accessibility", () => {
    it("should render accessible tablist with correct ARIA attributes and selection", () => {
      let selected = null;
      const nav = renderTablist("budget", (tabId) => { selected = tabId; });

      const budgetTab = nav.querySelector("#tab-budget");
      assert.ok(budgetTab);
      assert.equal(budgetTab.getAttribute("aria-selected"), "true");
      assert.equal(budgetTab.getAttribute("tabindex"), "0");
      assert.ok(budgetTab.classList.contains("is-active"));

      const tasksTab = nav.querySelector("#tab-tasks");
      assert.equal(tasksTab.getAttribute("aria-selected"), "false");
      assert.equal(tasksTab.getAttribute("tabindex"), "-1");

      tasksTab.dispatchEvent({ type: "click" });
      assert.equal(selected, "tasks");
    });
  });
});
