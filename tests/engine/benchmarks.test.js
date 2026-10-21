import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BENCHMARK_METADATA,
  convertCurrency,
  getCityMultiplier,
  getSeasonMultiplier,
  CITY_TIERS
} from "../../web/js/engine/benchmarks.js";

describe("Engine: benchmarks.js", () => {
  it("should have metadata explicitly marking figures as approximations", () => {
    assert.equal(BENCHMARK_METADATA.approximate, true);
    assert.ok(BENCHMARK_METADATA.notice.includes("approximations"));
  });

  describe("convertCurrency", () => {
    it("should accurately convert between currencies using static rate table", () => {
      // 100 USD at 85 INR = 8500 INR
      assert.equal(convertCurrency(100, "USD", "INR"), 8500);

      // 8500 INR to USD = 100
      assert.equal(convertCurrency(8500, "INR", "USD"), 100);

      // Same currency identity
      assert.equal(convertCurrency(500, "INR", "INR"), 500);
      assert.equal(convertCurrency(500, "EUR", "EUR"), 500);

      // Cross conversion USD to EUR: 100 USD = 8500 INR; 8500 / 92 ~ 92.39 EUR
      const eur = convertCurrency(100, "USD", "EUR");
      assert.ok(Math.abs(eur - (8500 / 92)) < 0.001);
    });
  });

  describe("getCityMultiplier", () => {
    it("should return Tier 1 multiplier (1.35) for metro cities", () => {
      assert.equal(getCityMultiplier("Mumbai"), CITY_TIERS.TIER_1.multiplier);
      assert.equal(getCityMultiplier("Delhi NCR"), CITY_TIERS.TIER_1.multiplier);
      assert.equal(getCityMultiplier("Bengaluru"), CITY_TIERS.TIER_1.multiplier);
    });

    it("should return Tier 2 multiplier (1.05) for heritage/state capitals", () => {
      assert.equal(getCityMultiplier("Jaipur"), CITY_TIERS.TIER_2.multiplier);
      assert.equal(getCityMultiplier("Lucknow"), CITY_TIERS.TIER_2.multiplier);
      assert.equal(getCityMultiplier("Goa"), CITY_TIERS.TIER_2.multiplier);
    });

    it("should return Tier 3 multiplier (0.85) for other towns", () => {
      assert.equal(getCityMultiplier("Alwar"), CITY_TIERS.TIER_3.multiplier);
      assert.equal(getCityMultiplier("Ranchi"), CITY_TIERS.TIER_3.multiplier);
    });

    it("should apply country multipliers for international destinations", () => {
      assert.equal(getCityMultiplier("New York", "US"), 1.5);
      assert.equal(getCityMultiplier("London", "UK"), 1.45);
      assert.equal(getCityMultiplier("Dubai", "AE"), 1.4);
    });
  });

  describe("getSeasonMultiplier", () => {
    it("should return peak multiplier (1.25) during festive wedding months (Nov, Dec, Jan, Feb)", () => {
      assert.equal(getSeasonMultiplier("2026-11-20"), 1.25);
      assert.equal(getSeasonMultiplier("2026-12-15"), 1.25);
      assert.equal(getSeasonMultiplier("2027-01-10"), 1.25);
      assert.equal(getSeasonMultiplier("2027-02-14"), 1.25);
    });

    it("should return off-peak multiplier (0.85) during monsoon/summer (May-Aug)", () => {
      assert.equal(getSeasonMultiplier("2026-06-15"), 0.85);
      assert.equal(getSeasonMultiplier("2026-07-20"), 0.85);
    });

    it("should return moderate multiplier (1.0) during shoulder months (Mar, Apr, Sep, Oct)", () => {
      assert.equal(getSeasonMultiplier("2026-03-25"), 1.0);
      assert.equal(getSeasonMultiplier("2026-10-10"), 1.0);
    });
  });
});
