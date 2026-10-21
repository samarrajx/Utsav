/**
 * dates.js - Pure date math and milestone back-scheduling for Utsav
 *
 * Supports back-scheduling from event date across leap years, month boundaries,
 * and handles overdue milestone pull-forward with an injectable test clock.
 */

/**
 * Parse an ISO date or YYYY-MM-DD string into a clean UTC date at midnight
 * to avoid local timezone shifting issues.
 *
 * @param {string|Date} dateInput
 * @returns {Date}
 */
export function parseDate(dateInput) {
  if (dateInput instanceof Date) {
    return new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
  }
  if (typeof dateInput === "string") {
    const parts = dateInput.trim().split("T")[0].split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        const d = new Date(Date.UTC(year, month, day));
        if (!Number.isNaN(d.getTime())) {
          return d;
        }
      }
    }
  }
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date input: ${dateInput}`);
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

/**
 * Format a Date to standard YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function toISODateString(date) {
  const d = parseDate(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Add or subtract days from a date
 * @param {string|Date} baseDate
 * @param {number} days
 * @returns {string} YYYY-MM-DD
 */
export function addDays(baseDate, days) {
  const d = parseDate(baseDate);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODateString(d);
}

/**
 * Add or subtract weeks from a date
 * @param {string|Date} baseDate
 * @param {number} weeks
 * @returns {string} YYYY-MM-DD
 */
export function addWeeks(baseDate, weeks) {
  return addDays(baseDate, weeks * 7);
}

/**
 * Calculate the number of days between two dates (to - from).
 * @param {string|Date} fromDate
 * @param {string|Date} toDate
 * @returns {number}
 */
export function daysBetween(fromDate, toDate) {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  const msDiff = to.getTime() - from.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
}

/**
 * Format a date nicely for human reading (e.g., "24 Oct 2026")
 * @param {string|Date} date
 * @param {string} [locale='en-GB']
 * @returns {string}
 */
export function formatDisplayDate(date, locale = "en-GB") {
  const d = parseDate(date);
  return d.toLocaleDateString(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/**
 * Back-schedule milestones from an event date.
 * If a milestone's calculated due date is in the past relative to `nowFn()`,
 * it is flagged as overdue and pulled forward to today with "Do now".
 *
 * @param {string|Date} eventDate
 * @param {Array<{ id?: string, title: string, weeksBefore: number, tasks?: Array<any> }>} milestoneTemplates
 * @param {Function} [nowFn] - Optional clock injection for testing
 * @returns {Array<any>} Scheduled milestones with due dates and overdue flags
 */
export function scheduleMilestones(eventDate, milestoneTemplates, nowFn = () => new Date()) {
  const eventDateParsed = parseDate(eventDate);
  const eventDateStr = toISODateString(eventDateParsed);
  const nowParsed = parseDate(nowFn());
  const nowStr = toISODateString(nowParsed);

  return milestoneTemplates.map((template, idx) => {
    const weeksBefore = Number(template.weeksBefore) || 0;
    // Calculate raw back-scheduled target date
    const targetDateStr = addWeeks(eventDateStr, -weeksBefore);
    const targetDateParsed = parseDate(targetDateStr);

    const isPast = targetDateParsed.getTime() < nowParsed.getTime();

    // If past, pull forward to today and flag "Do now"
    const dueDate = isPast ? nowStr : targetDateStr;
    const overdue = isPast;
    const status = isPast ? "overdue" : "pending";
    const actionNote = isPast ? "Do now" : undefined;

    return {
      id: template.id || `m_${idx + 1}`,
      title: template.title,
      weeksBefore,
      originalTargetDate: targetDateStr,
      dueDate,
      status,
      overdue,
      actionNote,
      tasks: (template.tasks || []).map((task, tIdx) => ({
        id: task.id || `t_${idx + 1}_${tIdx + 1}`,
        milestoneId: template.id || `m_${idx + 1}`,
        title: typeof task === "string" ? task : task.title,
        due: dueDate,
        done: Boolean(task.done),
        overdue
      }))
    };
  });
}
