import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkFeasibility } from "../../web/js/engine/feasibility.js";

describe("Engine: feasibility.js", () => {
  it("should evaluate a comfortable wedding budget correctly", () => {
    // 200 guests in Mumbai (Tier 1 = 1.35, Nov peak = 1.25 -> total ~1.6875)
    // 25 Lakhs INR budget
    const result = checkFeasibility({
      type: "wedding",
      budget: 2500000,
      currency: "INR",
      guests: 150,
      city: "Mumbai",
      date: "2026-11-20"
    });

    assert.equal(result.band, "comfortable");
    assert.ok(result.ratio >= 1.4);
    assert.equal(result.shortfallPercent, 0);
  });

  it("should evaluate a tight budget correctly", () => {
    // 150 guests in Mumbai with ~8 Lakhs budget
    const result = checkFeasibility({
      type: "wedding",
      budget: 800000,
      currency: "INR",
      guests: 150,
      city: "Mumbai",
      date: "2026-11-20"
    });

    assert.equal(result.band, "tight");
    assert.ok(result.ratio >= 1.0 && result.ratio < 1.4);
    assert.ok(result.tradeOffs.some((t) => t.type === "allocate_buffer"));
  });

  it("should evaluate a short budget and compute trade-offs", () => {
    // 200 guests with 5.5 Lakhs budget in Tier 1 peak (ratio ~0.80 -> short band)
    const result = checkFeasibility({
      type: "wedding",
      budget: 550000,
      currency: "INR",
      guests: 200,
      city: "Delhi",
      date: "2026-12-10"
    });

    assert.equal(result.band, "short");
    assert.ok(result.shortfallPercent > 0);
    assert.ok(result.tradeOffs.length > 0);

    // Trade-offs should suggest reducing guests or shifting season
    const hasGuestReduction = result.tradeOffs.some((t) => t.type === "reduce_guests");
    const hasSeasonShift = result.tradeOffs.some((t) => t.type === "shift_season");
    assert.ok(hasGuestReduction || hasSeasonShift);
  });

  it("should evaluate an unrealistic budget with heavy shortfall", () => {
    // 500 guests with 50,000 INR
    const result = checkFeasibility({
      type: "wedding",
      budget: 50000,
      currency: "INR",
      guests: 500,
      city: "Delhi",
      date: "2026-12-10"
    });

    assert.equal(result.band, "unrealistic");
    assert.ok(result.ratio < 0.7);
    assert.ok(result.shortfallPercent >= 30);
  });

  it("should work seamlessly with USD currency input", () => {
    // $30,000 USD ~ 25.5 Lakh INR for 100 guests in Tier 1
    const result = checkFeasibility({
      type: "wedding",
      budget: 30000,
      currency: "USD",
      guests: 100,
      city: "Bengaluru",
      date: "2026-10-15"
    });

    assert.equal(result.currency, "USD");
    assert.equal(result.band, "comfortable");
    assert.ok(result.minimumCost > 0);
    assert.ok(result.comfortableCost > result.minimumCost);
  });
});
