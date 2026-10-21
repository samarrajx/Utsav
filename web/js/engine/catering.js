/**
 * catering.js - Headcount maths, attendance projections, and catering calculations
 *
 * Implements the documented formula:
 * Expected Attendance = Confirmed + (Pending × Assumed Show-Up Rate)
 * Default show-up rate: 0.75 (75%)
 */

export const DEFAULT_SHOW_UP_RATE = 0.75;
export const DEFAULT_FOOD_BUFFER_PERCENT = 5;

/**
 * Calculate attendance metrics from guest status lists
 *
 * @param {Object} params
 * @param {number} [params.confirmed=0] - Number of confirmed RSVPs
 * @param {number} [params.pending=0] - Number of unconfirmed / pending RSVPs
 * @param {number} [params.declined=0] - Number of declined RSVPs
 * @param {number} [params.showUpRate=0.75] - Probability of pending guests attending
 * @returns {Object} Attendance summary
 */
export function calculateAttendance({
  confirmed = 0,
  pending = 0,
  declined = 0,
  showUpRate = DEFAULT_SHOW_UP_RATE
}) {
  const conf = Math.max(0, Number(confirmed) || 0);
  const pend = Math.max(0, Number(pending) || 0);
  const decl = Math.max(0, Number(declined) || 0);
  const rate = Math.min(1.0, Math.max(0.0, Number(showUpRate) || DEFAULT_SHOW_UP_RATE));

  const totalInvited = conf + pend + decl;
  const rawExpected = conf + (pend * rate);
  const expectedAttendance = Math.round(rawExpected);

  return {
    confirmed: conf,
    pending: pend,
    declined: decl,
    totalInvited,
    showUpRate: rate,
    expectedAttendance
  };
}

/**
 * Calculate expected attendance from an array of guest objects
 *
 * @param {Array<{ status: 'confirmed'|'pending'|'declined' }>} guestList
 * @param {number} [showUpRate=0.75]
 * @returns {Object}
 */
export function calculateAttendanceFromList(guestList = [], showUpRate = DEFAULT_SHOW_UP_RATE) {
  let confirmed = 0;
  let pending = 0;
  let declined = 0;

  for (const guest of guestList) {
    const status = (guest.status || "pending").toLowerCase();
    if (status === "confirmed") {
      confirmed += 1;
    } else if (status === "declined") {
      declined += 1;
    } else {
      pending += 1;
    }
  }

  return calculateAttendance({ confirmed, pending, declined, showUpRate });
}

/**
 * Calculate catering budget and plate orders based on expected attendance
 *
 * @param {Object} params
 * @param {number} params.expectedAttendance
 * @param {number} params.perPlateCost
 * @param {number} [params.bufferPercent=5] - Percentage buffer to prevent food shortages
 * @returns {Object} Catering estimation breakdown
 */
export function calculateCateringEstimate({
  expectedAttendance = 0,
  perPlateCost = 0,
  bufferPercent = DEFAULT_FOOD_BUFFER_PERCENT
}) {
  const attendance = Math.max(0, Number(expectedAttendance) || 0);
  const perPlate = Math.max(0, Number(perPlateCost) || 0);
  const buffer = Math.max(0, Number(bufferPercent) || 0);

  // Number of plates to order (including safety buffer)
  const bufferPlates = Math.ceil(attendance * (buffer / 100));
  const platesToOrder = attendance + bufferPlates;

  const baseCateringCost = attendance * perPlate;
  const totalCateringCost = platesToOrder * perPlate;

  return {
    expectedAttendance: attendance,
    bufferPercent: buffer,
    bufferPlates,
    platesToOrder,
    perPlateCost: perPlate,
    baseCateringCost,
    totalCateringCost
  };
}
