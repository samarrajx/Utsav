/**
 * benchmarks.js - Cost benchmarks, city tiers, and currency conversion for Utsav
 *
 * NOTE: All figures are market approximations based on 2026 vendor surveys and
 * industry averages. Real vendor quotes may vary based on specific requirements,
 * dates, and customisations.
 */

export const BENCHMARK_METADATA = {
  approximate: true,
  lastUpdated: "2026-01",
  currencyBase: "INR",
  notice: "Benchmark figures are market approximations for planning guidance. Always confirm final quotes directly with vendors."
};

/**
 * Documented static exchange rates (Base: INR)
 * 1 Foreign Unit = N INR
 */
export const EXCHANGE_RATES_TO_INR = {
  INR: 1.0,
  USD: 85.0,
  EUR: 92.0,
  GBP: 110.0,
  AED: 23.1
};

/**
 * Convert an amount from one currency to another using static rates
 * @param {number} amount
 * @param {string} [from='INR']
 * @param {string} [to='INR']
 * @returns {number}
 */
export function convertCurrency(amount, from = "INR", to = "INR") {
  const fromCurr = (from || "INR").toUpperCase();
  const toCurr = (to || "INR").toUpperCase();

  if (fromCurr === toCurr) return amount;

  const rateFrom = EXCHANGE_RATES_TO_INR[fromCurr] || 1.0;
  const rateTo = EXCHANGE_RATES_TO_INR[toCurr] || 1.0;

  // Amount in INR
  const inINR = amount * rateFrom;
  // Converted to target currency
  return inINR / rateTo;
}

/**
 * Approximate baseline cost figures in INR
 */
export const COST_BENCHMARKS_INR = {
  wedding: {
    perPlate: { min: 800, mid: 1800, max: 4000 },
    fixedCosts: {
      min: 250000, // Barebones venue hall, basic sound, simple decor
      mid: 850000, // Decent lawn/resort, decor package, photo/video
      max: 2500000 // Luxury banquet, designer florals, premium entertainment
    }
  },
  birthday: {
    perPlate: { min: 400, mid: 900, max: 2000 },
    fixedCosts: {
      min: 35000,  // Small hall/home decor, cake, music
      mid: 120000, // Party venue, themed decor, DJ, photographer
      max: 350000  // Premium club/resort, lavish decor, live act
    }
  },
  community: {
    perPlate: { min: 200, mid: 500, max: 1200 },
    fixedCosts: {
      min: 75000,  // Basic grounds, PA system, basic banners, permits
      mid: 250000, // Staging, lighting, sound engineer, generators, sanitation
      max: 750000  // Large stage, LED walls, extensive security, broadcast
    }
  }
};

/**
 * City tier classification and cost multipliers
 */
export const CITY_TIERS = {
  TIER_1: {
    multiplier: 1.35,
    cities: ["mumbai", "delhi", "new delhi", "bengaluru", "bangalore", "hyderabad", "chennai", "kolkata", "pune", "gurugram", "noida"]
  },
  TIER_2: {
    multiplier: 1.05,
    cities: ["jaipur", "lucknow", "chandigarh", "ahmedabad", "goa", "kochi", "cochin", "indore", "bhopal", "surat", "nagpur", "patna", "vadodara", "dehradun", "udaipur"]
  },
  TIER_3: {
    multiplier: 0.85,
    description: "Other Indian cities, towns, and rural venues"
  }
};

/**
 * International country multipliers
 */
export const COUNTRY_MULTIPLIERS = {
  IN: 1.0,
  US: 1.5,
  UK: 1.45,
  AE: 1.4,
  DE: 1.3,
  FR: 1.35,
  GLOBAL: 1.0
};

/**
 * Get the city/region cost multiplier
 * @param {string} city
 * @param {string} [countryCode='IN']
 * @returns {number}
 */
export function getCityMultiplier(city, countryCode = "IN") {
  const country = (countryCode || "IN").toUpperCase();

  // If outside India, use country level baseline
  if (country !== "IN") {
    return COUNTRY_MULTIPLIERS[country] || COUNTRY_MULTIPLIERS.GLOBAL;
  }

  const cleanCity = (city || "").trim().toLowerCase();
  if (!cleanCity) {
    return 1.0;
  }

  if (CITY_TIERS.TIER_1.cities.some((c) => cleanCity.includes(c))) {
    return CITY_TIERS.TIER_1.multiplier;
  }
  if (CITY_TIERS.TIER_2.cities.some((c) => cleanCity.includes(c))) {
    return CITY_TIERS.TIER_2.multiplier;
  }

  return CITY_TIERS.TIER_3.multiplier;
}

/**
 * Season multipliers based on month of the event date
 * @param {string|Date} date
 * @returns {number}
 */
export function getSeasonMultiplier(date) {
  let month = 0;
  if (date instanceof Date) {
    month = date.getUTCMonth(); // 0 to 11
  } else if (typeof date === "string") {
    const parts = date.split("T")[0].split("-");
    if (parts.length >= 2) {
      month = parseInt(parts[1], 10) - 1;
    }
  }

  // Peak wedding & festive season: Nov (10), Dec (11), Jan (0), Feb (1)
  if (month === 10 || month === 11 || month === 0 || month === 1) {
    return 1.25;
  }
  // Monsoon / Hot summer off-peak: May (4), Jun (5), Jul (6), Aug (7)
  if (month >= 4 && month <= 7) {
    return 0.85;
  }
  // Moderate: Mar (2), Apr (3), Sep (8), Oct (9)
  return 1.0;
}
