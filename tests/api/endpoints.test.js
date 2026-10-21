import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setGeminiMock } from "../../api/_lib/gemini.js";
import { resetRateLimits } from "../../api/_lib/security.js";
import { createMockRequest, createMockResponse } from "../helpers/mock-http.js";

import intakeHandler from "../../api/intake.js";
import planHandler from "../../api/plan.js";
import critiqueHandler from "../../api/critique.js";
import assistHandler from "../../api/assist.js";
import vendorMessageHandler from "../../api/vendor-message.js";

describe("API Endpoints Integration", () => {
  beforeEach(() => {
    resetRateLimits();
    setGeminiMock(null);
  });

  afterEach(() => {
    setGeminiMock(null);
  });

  // ==========================================================================
  // 1. /api/intake
  // ==========================================================================
  describe("POST /api/intake", () => {
    it("should return ready: true when core context is complete", async () => {
      const req = createMockRequest({
        body: {
          type: "wedding",
          city: "Jaipur",
          date: "2026-11-20",
          guests: 150,
          budget: 1500000,
          currency: "INR"
        }
      });
      const res = createMockResponse();

      await intakeHandler(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.ready, true);
      assert.ok(res.data.feasibilityPreview);
      assert.ok(["comfortable", "tight", "short", "unrealistic"].includes(res.data.feasibilityPreview.band));
    });

    it("should return ready: false with targeted questions when context is incomplete", async () => {
      setGeminiMock(async () => {
        return JSON.stringify({
          ready: false,
          questions: [
            {
              id: "q_guests",
              question: "How many guests are you expecting?",
              whyNeeded: "Guest headcount directly dictates catering and venue sizing.",
              options: ["50-100", "150-250", "300+"]
            }
          ]
        });
      });

      const req = createMockRequest({
        body: {
          type: "wedding",
          city: "Mumbai"
          // Missing budget, guests, date
        }
      });
      const res = createMockResponse();

      await intakeHandler(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.ready, false);
      assert.ok(Array.isArray(res.data.questions));
      assert.equal(res.data.questions[0].id, "q_guests");
    });
  });

  // ==========================================================================
  // 2. /api/plan
  // ==========================================================================
  describe("POST /api/plan", () => {
    it("should generate core plan and guarantee exact budget allocation invariant", async () => {
      setGeminiMock(async () => {
        return JSON.stringify({
          section: "core",
          categories: [
            { id: "venue", name: "Royal Palace Venue", weight: 30, planned: 300000 },
            { id: "catering", name: "Gourmet Catering", weight: 30, planned: 300000 },
            { id: "decor", name: "Floral Decor", weight: 20, planned: 200000 },
            { id: "photo", name: "Photography", weight: 20, planned: 200000 }
          ],
          milestones: [
            {
              id: "m1",
              title: "Lock Palace Venue",
              weeksBefore: 20,
              dueDate: "2026-07-01",
              tasks: [{ id: "t1", title: "Site visit", due: "2026-07-01" }]
            },
            {
              id: "m2",
              title: "Tasting & Menu",
              weeksBefore: 12,
              dueDate: "2026-08-25",
              tasks: [{ id: "t2", title: "Final menu", due: "2026-08-25" }]
            },
            {
              id: "m3",
              title: "Send Invites",
              weeksBefore: 6,
              dueDate: "2026-10-05",
              tasks: [{ id: "t3", title: "Post cards", due: "2026-10-05" }]
            }
          ]
        });
      });

      const totalBudget = 1000000;
      const req = createMockRequest({
        body: {
          section: "core",
          type: "wedding",
          city: "Udaipur",
          date: "2026-11-20",
          guests: 150,
          budget: totalBudget,
          currency: "INR"
        }
      });
      const res = createMockResponse();

      await planHandler(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.section, "core");

      // Verify exact budget invariant
      const sumPlanned = res.data.categories.reduce((s, c) => s + c.planned, 0);
      assert.equal(sumPlanned, totalBudget, "Core categories planned sum must equal total budget");
    });

    it("should generate vendor checklist section", async () => {
      setGeminiMock(async () => {
        return JSON.stringify({
          section: "vendors",
          vendors: [
            {
              id: "v1",
              category: "venue",
              name: "Banquet Venue",
              bookBy: "2026-06-01",
              lookFor: ["AC capacity", "Power backup"],
              askThem: ["Do you allow outside caterers?"]
            },
            {
              id: "v2",
              category: "caterer",
              name: "Wedding Caterer",
              bookBy: "2026-07-01",
              lookFor: ["Live counters"],
              askThem: ["Included servers ratio?"]
            },
            {
              id: "v3",
              category: "photographer",
              name: "Lead Photographer",
              bookBy: "2026-08-01",
              lookFor: ["Candid samples"],
              askThem: ["Turnaround time for raw video?"]
            }
          ]
        });
      });

      const req = createMockRequest({
        body: {
          section: "vendors",
          type: "wedding",
          city: "Delhi",
          date: "2026-12-15",
          guests: 200,
          budget: 2000000
        }
      });
      const res = createMockResponse();

      await planHandler(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.section, "vendors");
      assert.ok(res.data.vendors.length >= 3);
    });

    it("should generate ideas section", async () => {
      setGeminiMock(async () => {
        return JSON.stringify({
          section: "ideas",
          ideas: [
            {
              id: "idea_1",
              section: "hospitality",
              title: "Chai & Samosa Welcome Stall",
              whyItFits: "Delights morning guests arriving from long train journeys."
            },
            {
              id: "idea_2",
              section: "entertainment",
              title: "Retro Karaoke Hour",
              whyItFits: "Brings both older and younger generations together."
            }
          ]
        });
      });

      const req = createMockRequest({
        body: {
          section: "ideas",
          type: "birthday",
          city: "Pune",
          date: "2026-10-30",
          guests: 50,
          budget: 60000
        }
      });
      const res = createMockResponse();

      await planHandler(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.section, "ideas");
      assert.equal(res.data.ideas.length, 2);
    });
  });

  // ==========================================================================
  // 3. /api/critique
  // ==========================================================================
  describe("POST /api/critique", () => {
    it("should audit plan and return severity-rated risks", async () => {
      setGeminiMock(async () => {
        return JSON.stringify({
          risks: [
            {
              severity: "high",
              title: "Peak wedding weekend bottleneck",
              detail: "November 20 is an auspicious date in Mumbai; venues will book out fast.",
              suggestedFix: "Lock venue token within 7 days."
            }
          ]
        });
      });

      const req = createMockRequest({
        body: {
          plan: {
            type: "wedding",
            city: "Mumbai",
            date: "2026-11-20",
            currency: "INR",
            budget: { total: 1000000, categories: [] },
            guests: { target: 150 }
          }
        }
      });
      const res = createMockResponse();

      await critiqueHandler(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(Array.isArray(res.data.risks));
      assert.equal(res.data.risks[0].severity, "high");
    });
  });

  // ==========================================================================
  // 4. /api/assist
  // ==========================================================================
  describe("POST /api/assist", () => {
    it("should answer chat and provide allowlisted patch", async () => {
      setGeminiMock(async () => {
        return JSON.stringify({
          reply: "I have reallocated 5% from venue to photography to help book a candid photographer.",
          patch: {
            op: "set_category_weight",
            categoryId: "photography",
            weight: 20
          }
        });
      });

      const req = createMockRequest({
        body: {
          message: "Can we spend more on photography?",
          plan: { id: "p1" }
        }
      });
      const res = createMockResponse();

      await assistHandler(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(res.data.reply.includes("photography"));
      assert.equal(res.data.patch.op, "set_category_weight");
    });
  });

  // ==========================================================================
  // 5. /api/vendor-message
  // ==========================================================================
  describe("POST /api/vendor-message", () => {
    it("should draft copyable outreach message for WhatsApp and Email", async () => {
      setGeminiMock(async () => {
        return JSON.stringify({
          channel: "whatsapp",
          body: "Namaste! We are planning a wedding in Jaipur on 25 Nov 2026. Are you available?"
        });
      });

      const req = createMockRequest({
        body: {
          category: "caterer",
          vendorName: "Royal Flavours Catering",
          eventType: "wedding",
          eventDate: "2026-11-25",
          city: "Jaipur",
          guestCount: 200,
          channel: "whatsapp"
        }
      });
      const res = createMockResponse();

      await vendorMessageHandler(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.data.channel, "whatsapp");
      assert.ok(res.data.body.includes("Jaipur"));
    });
  });
});
