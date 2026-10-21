/**
 * feasibility.js - Deterministic feasibility engine and trade-off calculator for Utsav
 *
 * Compares user budget against realistic venue/catering/fixed market costs,
 * assigns a feasibility band, and computes mathematical trade-offs.
 */

import {
  COST_BENCHMARKS_INR,
  getCityMultiplier,
  getSeasonMultiplier,
  convertCurrency
} from "./benchmarks.js";

/**
 * Check event feasibility against deterministic market benchmarks
 *
 * @param {Object} params
 * @param {string} params.type - 'wedding' | 'birthday' | 'community'
 * @param {number} params.budget - Total planned budget in specified currency
 * @param {string} [params.currency='INR']
 * @param {number} params.guests - Target guest headcount
 * @param {string} [params.city=''] - Host city
 * @param {string|Date} [params.date] - Target event date
 * @param {string} [params.countryCode='IN'] - Two-letter country code
 * @returns {Object} Feasibility evaluation with band, shortfall, and trade-offs
 */
export function checkFeasibility({
  type = "wedding",
  budget = 0,
  currency = "INR",
  guests = 100,
  city = "",
  date = new Date(),
  countryCode = "IN"
}) {
  const eventType = (type || "wedding").toLowerCase();
  const benchmark = COST_BENCHMARKS_INR[eventType] || COST_BENCHMARKS_INR.wedding;

  const guestCount = Math.max(1, Number(guests) || 1);
  const userBudget = Math.max(0, Number(budget) || 0);
  const curr = (currency || "INR").toUpperCase();

  // Convert user budget to base INR for benchmark comparison
  const userBudgetINR = convertCurrency(userBudget, curr, "INR");

  const cityMultiplier = getCityMultiplier(city, countryCode);
  const seasonMultiplier = getSeasonMultiplier(date);
  const totalMultiplier = cityMultiplier * seasonMultiplier;

  // Minimum realistic costs in INR
  const minCateringINR = benchmark.perPlate.min * guestCount;
  const minFixedINR = benchmark.fixedCosts.min;
  const minRealisticINR = (minCateringINR + minFixedINR) * totalMultiplier;

  // Mid / comfortable realistic costs in INR
  const midCateringINR = benchmark.perPlate.mid * guestCount;
  const midFixedINR = benchmark.fixedCosts.mid;
  const comfortableINR = (midCateringINR + midFixedINR) * totalMultiplier;

  // Ratio of user budget to minimum realistic threshold
  const ratio = minRealisticINR > 0 ? userBudgetINR / minRealisticINR : 1.0;

  let band = "comfortable";
  let shortfallPercent = 0;
  let summary = "";

  if (ratio >= 1.4) {
    band = "comfortable";
    summary = "Your budget is well-positioned for a high-quality experience with ample creative freedom.";
  } else if (ratio >= 1.0) {
    band = "tight";
    summary = "Your budget covers the essentials, but requires disciplined vendor negotiations and lean decor choices.";
  } else if (ratio >= 0.7) {
    band = "short";
    shortfallPercent = Math.round((1 - ratio) * 100);
    summary = `Your budget is approximately ${shortfallPercent}% below the estimated minimum market benchmark for this guest count and location.`;
  } else {
    band = "unrealistic";
    shortfallPercent = Math.round((1 - ratio) * 100);
    summary = `Your budget faces a significant shortfall of ~${shortfallPercent}%. Substantial adjustments to guest count or venue scale are strongly advised.`;
  }

  // Convert computed benchmark thresholds back to user currency
  const minimumCost = Math.round(convertCurrency(minRealisticINR, "INR", curr));
  const comfortableCost = Math.round(convertCurrency(comfortableINR, "INR", curr));

  // Compute actionable trade-offs
  const tradeOffs = [];

  if (band === "short" || band === "unrealistic") {
    // 1. Guest count reduction trade-off
    // What is max guests if we keep minimum fixed costs?
    const availableForFoodINR = (userBudgetINR / totalMultiplier) - minFixedINR;
    if (availableForFoodINR > 0) {
      const maxAffordableGuests = Math.floor(availableForFoodINR / benchmark.perPlate.min);
      if (maxAffordableGuests > 0 && maxAffordableGuests < guestCount) {
        tradeOffs.push({
          type: "reduce_guests",
          targetGuests: maxAffordableGuests,
          detail: `Limiting guest list to ~${maxAffordableGuests} attendees aligns your spend with market catering rates.`
        });
      }
    }

    // 2. Per-plate target catering trade-off
    const achievablePerPlateINR = ((userBudgetINR / totalMultiplier) - (minFixedINR * 0.75)) / guestCount;
    if (achievablePerPlateINR > 0) {
      const achievablePerPlate = Math.round(convertCurrency(achievablePerPlateINR, "INR", curr));
      tradeOffs.push({
        type: "lower_per_plate",
        targetPerPlate: achievablePerPlate,
        detail: `Targeting simplified catering menus or buffet setups at ~${achievablePerPlate} ${curr}/plate keeps your full guest count intact.`
      });
    }

    // 3. Season trade-off
    if (seasonMultiplier > 1.0) {
      tradeOffs.push({
        type: "shift_season",
        detail: "Moving from peak festive season (Nov-Feb) to moderate or off-peak months (May-Aug) typically unlocks 15% to 30% savings on venue and vendor rates."
      });
    }
  } else if (band === "tight") {
    tradeOffs.push({
      type: "allocate_buffer",
      detail: "Maintain a strict 10% contingency reserve before locking non-refundable vendor advances."
    });
  }

  return {
    band,
    ratio: Math.round(ratio * 100) / 100,
    shortfallPercent,
    minimumCost,
    comfortableCost,
    currency: curr,
    tradeOffs,
    summary,
    multipliers: {
      city: cityMultiplier,
      season: seasonMultiplier,
      combined: Math.round(totalMultiplier * 100) / 100
    }
  };
}
