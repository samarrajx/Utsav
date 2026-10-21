/**
 * money.js - Pure financial and currency engine for Utsav
 *
 * Implements the Largest-Remainder (Hamilton-Hare) allocation algorithm
 * ensuring category allocations ALWAYS sum exactly to the total budget,
 * avoiding fractional penny/rupee rounding leakage.
 */

/**
 * Allocate a total budget among items according to weights using the
 * Largest-Remainder (Hamilton) method.
 *
 * @param {number} totalBudget - Positive number (integer or currency units)
 * @param {Array<{ id: string, weight: number, [key: string]: any }>} categories
 * @returns {Array<{ id: string, weight: number, planned: number, [key: string]: any }>}
 */
export function allocateBudget(totalBudget, categories) {
  if (typeof totalBudget !== "number" || totalBudget < 0 || !Number.isFinite(totalBudget)) {
    throw new TypeError("totalBudget must be a non-negative finite number");
  }

  if (!Array.isArray(categories) || categories.length === 0) {
    return [];
  }

  // Handle 0 budget
  if (totalBudget === 0) {
    return categories.map((cat) => ({
      ...cat,
      planned: 0
    }));
  }

  const totalWeight = categories.reduce((sum, cat) => sum + (Number(cat.weight) || 0), 0);
  if (totalWeight <= 0) {
    // Equal distribution if all weights are zero
    const equalShare = Math.floor(totalBudget / categories.length);
    const remainder = totalBudget - (equalShare * categories.length);
    return categories.map((cat, idx) => ({
      ...cat,
      planned: equalShare + (idx < remainder ? 1 : 0)
    }));
  }

  // Largest-Remainder allocation (Hamilton-Hare method)
  // 1. Calculate exact float allocations and integer parts
  const items = categories.map((cat, index) => {
    const weight = Number(cat.weight) || 0;
    const exact = (totalBudget * weight) / totalWeight;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    return {
      cat,
      index,
      floor,
      remainder
    };
  });

  const sumFloors = items.reduce((sum, item) => sum + item.floor, 0);
  let discrepancy = Math.round(totalBudget - sumFloors);

  // 2. Sort by largest remainder descending (tie-break by index)
  items.sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    return a.index - b.index;
  });

  // 3. Distribute +1 to top `discrepancy` items
  for (let i = 0; i < items.length && discrepancy > 0; i++) {
    items[i].floor += 1;
    discrepancy -= 1;
  }

  // 4. Restore original category order
  items.sort((a, b) => a.index - b.index);

  return items.map((item) => ({
    ...item.cat,
    planned: item.floor
  }));
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
    if (Math.abs(num) >= 10000000) {
      return `₹${cleanNum(num / 10000000, 2)} Cr`;
    }
    if (Math.abs(num) >= 100000) {
      return `₹${cleanNum(num / 100000, 2)} Lakh`;
    }
    if (Math.abs(num) >= 1000) {
      return `₹${cleanNum(num / 1000, 1)}k`;
    }
    return `₹${num}`;
  }

  const symbolMap = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "AED "
  };
  const sym = symbolMap[curr] || `${curr} `;

  if (Math.abs(num) >= 1000000) {
    return `${sym}${cleanNum(num / 1000000, 2)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `${sym}${cleanNum(num / 1000, 1)}k`;
  }
  return `${sym}${num}`;
}
