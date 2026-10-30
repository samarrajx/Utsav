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

export const FEASIBILITY_THRESHOLDS = {
  COMFORTABLE: 1.4,
  TIGHT: 1.0,
  SHORT: 0.7
};

function determineFeasibilityBand(ratio) {
  if (ratio >= FEASIBILITY_THRESHOLDS.COMFORTABLE) {
    return {
      band: "comfortable",
      shortfallPercent: 0,
      summary:
        "Your budget is well-positioned for a high-quality experience with ample creative freedom."
    };
  }
  if (ratio >= FEASIBILITY_THRESHOLDS.TIGHT) {
    return {
      band: "tight",
      shortfallPercent: 0,
      summary:
        "Your budget covers the essentials, but requires disciplined vendor negotiations and lean decor choices."
    };
  }
  if (ratio >= FEASIBILITY_THRESHOLDS.SHORT) {
    const shortfallPercent = Math.round((1 - ratio) * 100);
    return {
      band: "short",
      shortfallPercent,
      summary: `Your budget is approximately ${shortfallPercent}% below the estimated minimum market benchmark for this guest count and location.`
    };
  }
  const shortfallPercent = Math.round((1 - ratio) * 100);
  return {
    band: "unrealistic",
    shortfallPercent,
    summary: `Your budget faces a significant shortfall of ~${shortfallPercent}%. Substantial adjustments to guest count or venue scale are strongly advised.`
  };
}

function calculateTradeOffs({
  band,
  userBudgetINR,
  totalMultiplier,
  minFixedINR,
  benchmark,
  guestCount,
  curr,
  seasonMultiplier
}) {
  const tradeOffs = [];

  if (band === "short" || band === "unrealistic") {
    const availableForFoodINR = userBudgetINR / totalMultiplier - minFixedINR;
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

    const achievablePerPlateINR =
      (userBudgetINR / totalMultiplier - minFixedINR * 0.75) / guestCount;
    if (achievablePerPlateINR > 0) {
      const achievablePerPlate = Math.round(convertCurrency(achievablePerPlateINR, "INR", curr));
      tradeOffs.push({
        type: "lower_per_plate",
        targetPerPlate: achievablePerPlate,
        detail: `Targeting simplified catering menus or buffet setups at ~${achievablePerPlate} ${curr}/plate keeps your full guest count intact.`
      });
    }

    if (seasonMultiplier > 1.0) {
      tradeOffs.push({
        type: "shift_season",
        detail:
          "Moving from peak festive season (Nov-Feb) to moderate or off-peak months (May-Aug) typically unlocks 15% to 30% savings on venue and vendor rates."
      });
    }
  } else if (band === "tight") {
    tradeOffs.push({
      type: "allocate_buffer",
      detail:
        "Maintain a strict 10% contingency reserve before locking non-refundable vendor advances."
    });
  }

  return tradeOffs;
}

/**
 * Check event feasibility against deterministic market benchmarks
 *
 * @param {Object} params
 * @param {string} [params.type='wedding'] - 'wedding' | 'birthday' | 'community'
 * @param {number} [params.budget=0] - Total planned budget in specified currency
 * @param {string} [params.currency='INR']
 * @param {number} [params.guests=100] - Target guest headcount
 * @param {string} [params.city=''] - Host city
 * @param {string|Date} [params.date] - Target event date
 * @param {string} [params.countryCode='IN'] - Two-letter country code
 * @returns {Object} Feasibility evaluation with band, shortfall, and trade-offs
 */
function resolveFeasibilityInputs(params = {}) {
  const eventType = (params.type || "wedding").toLowerCase();
  const benchmark = COST_BENCHMARKS_INR[eventType] || COST_BENCHMARKS_INR.wedding;
  const guestCount = Math.max(1, Number(params.guests) || 1);
  const userBudget = Math.max(0, Number(params.budget) || 0);
  const curr = (params.currency || "INR").toUpperCase();
  const date = params.date || new Date();
  const city = params.city || "";
  const countryCode = params.countryCode || "IN";

  return { benchmark, guestCount, userBudget, curr, date, city, countryCode };
}

/**
 * Analyze budget and guest count against industry benchmarks and seasonal multipliers.
 *
 * @param {Object} [params={}]
 * @param {string} [params.type='wedding']
 * @param {number} [params.guests=1]
 * @param {number} [params.budget=0]
 * @param {string} [params.currency='INR']
 * @param {string|Date} [params.date]
 * @param {string} [params.city='']
 * @param {string} [params.countryCode='IN']
 * @returns {Object} Feasibility evaluation result
 */
export function checkFeasibility(params = {}) {
  const { benchmark, guestCount, userBudget, curr, date, city, countryCode } =
    resolveFeasibilityInputs(params);

  const userBudgetINR = convertCurrency(userBudget, curr, "INR");
  const cityMultiplier = getCityMultiplier(city, countryCode);
  const seasonMultiplier = getSeasonMultiplier(date);
  const totalMultiplier = cityMultiplier * seasonMultiplier;

  const minCateringINR = benchmark.perPlate.min * guestCount;
  const minFixedINR = benchmark.fixedCosts.min;
  const minRealisticINR = (minCateringINR + minFixedINR) * totalMultiplier;

  const midCateringINR = benchmark.perPlate.mid * guestCount;
  const midFixedINR = benchmark.fixedCosts.mid;
  const comfortableINR = (midCateringINR + midFixedINR) * totalMultiplier;

  const ratio = minRealisticINR > 0 ? userBudgetINR / minRealisticINR : 1.0;
  const { band, shortfallPercent, summary } = determineFeasibilityBand(ratio);

  const minimumCost = Math.round(convertCurrency(minRealisticINR, "INR", curr));
  const comfortableCost = Math.round(convertCurrency(comfortableINR, "INR", curr));

  const tradeOffs = calculateTradeOffs({
    band,
    userBudgetINR,
    totalMultiplier,
    minFixedINR,
    benchmark,
    guestCount,
    curr,
    seasonMultiplier
  });

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
