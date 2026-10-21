import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  allocateBudget,
  formatCurrency,
  formatCompactCurrency
} from "../../web/js/engine/money.js";

describe("Engine: money.js", () => {
  describe("allocateBudget (Largest-Remainder Hamilton Method)", () => {
    it("should allocate budget so category amounts sum EXACTLY to total budget", () => {
      const categories = [
        { id: "venue", weight: 31 },
        { id: "catering", weight: 26 },
        { id: "decor", weight: 18 },
        { id: "photography", weight: 12 },
        { id: "attire", weight: 8 },
        { id: "entertainment", weight: 5 }
      ];

      const testBudgets = [1000000, 1500000, 777777, 100001, 1, 2, 3, 7, 9999999, 50000];

      for (const budget of testBudgets) {
        const allocated = allocateBudget(budget, categories);
        const sumPlanned = allocated.reduce((sum, c) => sum + c.planned, 0);
        assert.equal(sumPlanned, budget, `Failed exact sum for budget: ${budget}`);
      }
    });

    it("should handle odd weights that don't sum to 100", () => {
      const oddCategories = [
        { id: "a", weight: 7 },
        { id: "b", weight: 13 },
        { id: "c", weight: 29 }
      ];
      const budget = 50000;
      const allocated = allocateBudget(budget, oddCategories);
      const sum = allocated.reduce((s, c) => s + c.planned, 0);
      assert.equal(sum, budget);
    });

    it("should handle edge cases: zero budget and empty categories", () => {
      const categories = [
        { id: "a", weight: 50 },
        { id: "b", weight: 50 }
      ];
      const zeroAlloc = allocateBudget(0, categories);
      assert.equal(zeroAlloc[0].planned, 0);
      assert.equal(zeroAlloc[1].planned, 0);

      const emptyAlloc = allocateBudget(1000, []);
      assert.deepEqual(emptyAlloc, []);
    });

    it("should handle all zero weights gracefully by equal distribution", () => {
      const categories = [
        { id: "a", weight: 0 },
        { id: "b", weight: 0 },
        { id: "c", weight: 0 }
      ];
      const allocated = allocateBudget(10, categories);
      const sum = allocated.reduce((s, c) => s + c.planned, 0);
      assert.equal(sum, 10);
    });

    it("should reject negative or non-finite budgets", () => {
      assert.throws(() => allocateBudget(-100, [{ id: "a", weight: 10 }]), TypeError);
      assert.throws(() => allocateBudget(NaN, [{ id: "a", weight: 10 }]), TypeError);
      assert.throws(() => allocateBudget(Infinity, [{ id: "a", weight: 10 }]), TypeError);
    });
  });

  describe("formatCurrency", () => {
    it("should format INR with Indian numbering system (lakhs & crores)", () => {
      const formattedLakh = formatCurrency(1250000, "INR");
      // In en-IN locale, 12,50,000 should contain lakh grouping
      assert.ok(formattedLakh.includes("12,50,000") || formattedLakh.includes("₹"));

      const formattedCrore = formatCurrency(10000000, "INR");
      assert.ok(formattedCrore.includes("1,00,00,000") || formattedCrore.includes("₹"));
    });

    it("should format USD, EUR, GBP, AED correctly", () => {
      const usd = formatCurrency(5000, "USD");
      assert.ok(usd.includes("5,000") || usd.includes("$"));

      const gbp = formatCurrency(5000, "GBP");
      assert.ok(gbp.includes("5,000") || gbp.includes("£"));

      const aed = formatCurrency(5000, "AED");
      assert.ok(aed.includes("5,000") || aed.includes("AED"));
    });
  });

  describe("formatCompactCurrency", () => {
    it("should format compact INR units (Lakh, Cr, k)", () => {
      assert.equal(formatCompactCurrency(1500000, "INR"), "₹15 Lakh");
      assert.equal(formatCompactCurrency(25000000, "INR"), "₹2.5 Cr");
      assert.equal(formatCompactCurrency(50000, "INR"), "₹50k");
      assert.equal(formatCompactCurrency(500, "INR"), "₹500");
    });

    it("should format compact international currencies", () => {
      assert.equal(formatCompactCurrency(1500000, "USD"), "$1.5M");
      assert.equal(formatCompactCurrency(25000, "EUR"), "€25k");
    });
  });
});
