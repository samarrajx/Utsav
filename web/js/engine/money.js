/**
 * money.js - Pure financial and currency engine for Utsav
 *
 * Implements the Largest-Remainder (Hamilton-Hare) allocation algorithm
 * ensuring category allocations ALWAYS sum exactly to the total budget,
 * avoiding fractional penny/rupee rounding leakage.
 */

/**
 * Number denomination constants
 */
export const ONE_CRORE = 10000000;
export const ONE_LAKH = 100000;
export const ONE_THOUSAND = 1000;
export const ONE_MILLION = 1000000;

function validateBudgetInput(totalBudget, categories) {
  if (typeof totalBudget !== "number" || totalBudget < 0 || !Number.isFinite(totalBudget)) {
    throw new TypeError("totalBudget must be a non-negative finite number");
  }
  return Array.isArray(categories) && categories.length > 0;
}

function allocateZeroWeights(totalBudget, categories) {
  const equalShare = Math.floor(totalBudget / categories.length);
  const remainder = totalBudget - equalShare * categories.length;
  return categories.map((cat, idx) => ({
    ...cat,
    planned: equalShare + (idx < remainder ? 1 : 0)
  }));
}

function distributeDiscrepancy(items, initialDiscrepancy) {
  let discrepancy = initialDiscrepancy;
  // Sort by largest remainder descending, tie-break by original index
  items.sort((a, b) =>
    b.remainder !== a.remainder ? b.remainder - a.remainder : a.index - b.index
  );

  for (let i = 0; i < items.length && discrepancy > 0; i++) {
    items[i].floor += 1;
    discrepancy -= 1;
  }

  items.sort((a, b) => a.index - b.index);
}

/**
 * Allocate a total budget among items according to weights using the
 * Largest-Remainder (Hamilton) method.
 *
 * @param {number} totalBudget - Positive number (integer or currency units)
 * @param {Array<{ id: string, weight: number, [key: string]: any }>} categories
 * @returns {Array<{ id: string, weight: number, planned: number, [key: string]: any }>}
 */
export function allocateBudget(totalBudget, categories) {
  if (!validateBudgetInput(totalBudget, categories)) {
    return [];
  }

  if (totalBudget === 0) {
    return categories.map((cat) => ({ ...cat, planned: 0 }));
  }

  const totalWeight = categories.reduce((sum, cat) => sum + (Number(cat.weight) || 0), 0);
  if (totalWeight <= 0) {
    return allocateZeroWeights(totalBudget, categories);
  }

  const items = categories.map((cat, index) => {
    const weight = Number(cat.weight) || 0;
    const exact = (totalBudget * weight) / totalWeight;
    const floor = Math.floor(exact);
    return { cat, index, floor, remainder: exact - floor };
  });

  const sumFloors = items.reduce((sum, item) => sum + item.floor, 0);
  distributeDiscrepancy(items, Math.round(totalBudget - sumFloors));

  return items.map((item) => ({ ...item.cat, planned: item.floor }));
}

/**
 * Format a numeric amount in the requested currency locale.
 * INR uses Indian lakh/crore numbering system (e.g., ₹12,50,000).
 *
 * @param {number} amount
 * @param {string} [currency='INR']
 * @param {string} [locale]
 * @returns {string}
 */
export function formatCurrency(amount, currency = "INR", locale) {
  const num = Number(amount) || 0;
  const curr = (currency || "INR").toUpperCase();

  const localeMap = {
    INR: "en-IN",
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB",
    AED: "en-AE"
  };

  const targetLocale = locale || localeMap[curr] || "en-US";

  return new Intl.NumberFormat(targetLocale, {
    style: "currency",
    currency: curr,
    maximumFractionDigits: 0
  }).format(num);
}

const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED "
};

function formatCompactINR(num, cleanNum) {
  if (Math.abs(num) >= ONE_CRORE) {
    return `₹${cleanNum(num / ONE_CRORE, 2)} Cr`;
  }
  if (Math.abs(num) >= ONE_LAKH) {
    return `₹${cleanNum(num / ONE_LAKH, 2)} Lakh`;
  }
  if (Math.abs(num) >= ONE_THOUSAND) {
    return `₹${cleanNum(num / ONE_THOUSAND, 1)}k`;
  }
  return `₹${num}`;
}

function formatCompactInternational(num, curr, cleanNum) {
  const sym = CURRENCY_SYMBOLS[curr] || `${curr} `;
  if (Math.abs(num) >= ONE_MILLION) {
    return `${sym}${cleanNum(num / ONE_MILLION, 2)}M`;
  }
  if (Math.abs(num) >= ONE_THOUSAND) {
    return `${sym}${cleanNum(num / ONE_THOUSAND, 1)}k`;
  }
  return `${sym}${num}`;
}

/**
 * Format a large number with compact notation (e.g. ₹15 L, $1.5M)
 *
 * @param {number} amount
 * @param {string} [currency='INR']
 * @returns {string}
 */
export function formatCompactCurrency(amount, currency = "INR") {
  const num = Number(amount) || 0;
  const curr = (currency || "INR").toUpperCase();
  const cleanNum = (val, digits = 2) => parseFloat(val.toFixed(digits)).toString();

  if (curr === "INR") {
    return formatCompactINR(num, cleanNum);
  }
  return formatCompactInternational(num, curr, cleanNum);
}
