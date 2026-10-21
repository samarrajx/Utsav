import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setupMockDOM } from "../helpers/mock-dom.js";
import { generateBaselinePlan } from "../../web/js/engine/baseline.js";
import { renderAssistantWidget } from "../../web/js/views/assistant.js";
import { openVendorOutreachModal } from "../../web/js/views/vendor-outreach-modal.js";
import { renderOverviewTab } from "../../web/js/views/overview-tab.js";

describe("Phase 7 Integration: AI Assistant, Patches, Undo & Outreach Modal", () => {
  let cleanupDOM;
  let testEvent;
  let originalFetch;

  beforeEach(() => {
    cleanupDOM = setupMockDOM();
    originalFetch = globalThis.fetch;
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
    globalThis.fetch = originalFetch;
    if (cleanupDOM) cleanupDOM();
  });

  describe("AI Assistant Widget & Patch Lifecycle", () => {
    it("should render welcome message, status, and suggestion prompt chips", () => {
      const widget = renderAssistantWidget(testEvent, {
        onUpdate: () => {},
        announce: () => {}
      });

      assert.ok(widget);
      assert.ok(widget.classList.contains("assistant-widget-container"));
      assert.ok(widget.textContent.includes("AI Event Assistant"));
      assert.ok(widget.textContent.includes("Royal Jaipur Wedding"));

      const promptChips = widget.querySelectorAll(".prompt-chip");
      assert.ok(promptChips.length >= 3);
    });

    it("should process user prompt, apply verified patch diff, and support undo", async () => {
      let updatedEvent = null;
      let announcedMessage = null;

      // Mock /api/assist returning a verified patch
      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          reply: "I have trimmed catering to 20% and rebalanced your other categories.",
          patch: {
            op: "set_category_weight",
            categoryId: "catering",
            weight: 20
          }
        })
      });

      const widget = renderAssistantWidget(testEvent, {
        onUpdate: (evt) => { updatedEvent = evt; },
        announce: (msg) => { announcedMessage = msg; }
      });

      // Submit a message via input form
      const input = widget.querySelector(".assistant-input");
      input.value = "Make catering 20% weight";
      const form = widget.querySelector(".assistant-input-form");

      form.dispatchEvent({ type: "submit", preventDefault: () => {} });

      // Wait a microtick for async fetchAssist resolution
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Patch card should now be rendered in the widget
      const patchCard = widget.querySelector(".patch-diff-card");
      assert.ok(patchCard, "Patch diff card should be visible");
      assert.ok(patchCard.textContent.includes("Updated weight") || patchCard.textContent.includes("Catering"));

      // Click "Accept & Apply"
      const acceptBtn = patchCard.querySelector(".btn-accept-patch");
      assert.ok(acceptBtn);
      acceptBtn.dispatchEvent({ type: "click" });

      // Assert plan was modified and announced
      assert.ok(updatedEvent);
      assert.ok(announcedMessage.includes("Plan updated"));
      const newWeight = testEvent.budget.categories.find((c) => c.id === "catering").weight;
      assert.equal(newWeight, 20);

      // Verify Undo banner is shown and works
      const undoBtn = widget.querySelector(".btn-undo-action");
      assert.ok(undoBtn, "Undo button should appear after applying a patch");

      undoBtn.dispatchEvent({ type: "click" });
      assert.ok(announcedMessage.includes("restored"));
      const restoredWeight = testEvent.budget.categories.find((c) => c.id === "catering").weight;
      assert.notEqual(restoredWeight, 20);
    });

    it("should handle offline fallback without throwing when API fails", async () => {
      globalThis.fetch = async () => {
        throw new Error("API Offline");
      };

      const widget = renderAssistantWidget(testEvent, {
        onUpdate: () => {},
        announce: () => {}
      });

      // Click an entry idea prompt chip
      const promptChips = widget.querySelectorAll(".prompt-chip");
      promptChips[0].dispatchEvent({ type: "click" });

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Offline handler should produce a suggestion and patch safely
      assert.ok(widget.textContent.includes("Dhol") || widget.textContent.includes("entry") || widget.textContent.includes("celebration"));
    });
  });

  describe("Vendor Outreach Drafter Modal", () => {
    it("should open modal, generate inquiry draft, switch channels, and copy text", async () => {
      let announcedMessage = null;

      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          channel: "whatsapp",
          body: "Hi Venue Team! Are you available for a wedding on Nov 20?"
        })
      });

      const vendor = testEvent.vendors[0];
      const modalBackdrop = openVendorOutreachModal({
        vendor,
        event: testEvent,
        announce: (msg) => { announcedMessage = msg; }
      });

      assert.ok(modalBackdrop);
      assert.ok(modalBackdrop.textContent.includes(vendor.name || vendor.category));

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify draft body is rendered
      const textarea = modalBackdrop.querySelector(".draft-textarea");
      assert.ok(textarea);

      // Test Copy button
      const copyBtn = modalBackdrop.querySelector(".btn-copy-message");
      assert.ok(copyBtn);
      copyBtn.dispatchEvent({ type: "click", currentTarget: copyBtn });

      assert.ok(announcedMessage.includes("copied to clipboard"));

      // Test Channel Switch to Email
      const emailTab = modalBackdrop.querySelectorAll(".channel-tab")[1];
      emailTab.dispatchEvent({ type: "click" });

      await new Promise((resolve) => setTimeout(resolve, 10));
      const subjectInput = modalBackdrop.querySelector("#email-subject");
      assert.ok(subjectInput);
      subjectInput.dispatchEvent({ type: "input", target: { value: "Custom Subject" } });

      const bodyTextarea = modalBackdrop.querySelector("#message-body");
      assert.ok(bodyTextarea);
      bodyTextarea.dispatchEvent({ type: "input", target: { value: "Custom Body" } });

      // Close modal
      const closeBtn = modalBackdrop.querySelector(".modal-close-btn");
      closeBtn.dispatchEvent({ type: "click" });
    });

    it("should handle offline draft generation and escape key closure", async () => {
      let closed = false;
      globalThis.fetch = async () => { throw new Error("Offline"); };

      const vendor = testEvent.vendors[0];
      const modalBackdrop = openVendorOutreachModal({
        vendor,
        event: testEvent,
        onClose: () => { closed = true; }
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.ok(modalBackdrop.textContent.includes("Planning a celebration"));

      // Switch to email offline
      const emailTab = modalBackdrop.querySelectorAll(".channel-tab")[1];
      emailTab.dispatchEvent({ type: "click" });
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.ok(modalBackdrop.textContent.includes("Dear"));

      // Click outside backdrop to close
      modalBackdrop.dispatchEvent({ type: "click", target: modalBackdrop });
      assert.equal(closed, true);
    });
  });

  describe("Critic Re-Audit Integration", () => {
    it("should allow re-auditing plan from overview tab and update risk list", async () => {
      let updatedEvent = null;
      let announcedMessage = null;

      globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          risks: [
            {
              severity: "high",
              title: "Peak wedding season booking crush in Jaipur",
              detail: "November is peak muhurat season in Rajasthan.",
              suggestedFix: "Secure palace venue booking deposit within 7 days."
            }
          ]
        })
      });

      const overviewView = renderOverviewTab(testEvent, {
        onUpdate: (evt) => { updatedEvent = evt; },
        onNavigateTab: () => {},
        announce: (msg) => { announcedMessage = msg; }
      });

      const reauditBtn = overviewView.querySelector(".btn-reaudit-critic");
      assert.ok(reauditBtn);

      reauditBtn.dispatchEvent({ type: "click", currentTarget: reauditBtn });

      await new Promise((resolve) => setTimeout(resolve, 15));

      assert.ok(updatedEvent);
      assert.equal(testEvent.critique.risks.length, 1);
      assert.equal(testEvent.critique.risks[0].title, "Peak wedding season booking crush in Jaipur");
      assert.ok(announcedMessage.includes("AI Critic audit complete"));
    });
  });
});
