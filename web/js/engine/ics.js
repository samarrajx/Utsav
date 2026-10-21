/**
 * ics.js - RFC 5545 iCalendar generator for Utsav milestones and event timelines
 *
 * Emits strictly valid .ics files compatible with Google Calendar, Apple Calendar,
 * Microsoft Outlook, and standard calendar applications.
 */

import { parseDate } from "./dates.js";

/**
 * Escape text for RFC 5545 iCalendar compliance
 * Special characters that must be escaped: \ ; , and newlines
 * @param {string} str
 * @returns {string}
 */
export function escapeICalText(str) {
  if (!str) return "";
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Format a Date object to RFC 5545 UTC timestamp (e.g. 20261021T120000Z)
 * @param {Date} date
 * @returns {string}
 */
export function formatICalDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, "0");

  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Format a date to RFC 5545 DATE-only format (e.g. 20261021)
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatICalDate(dateInput) {
  const d = parseDate(dateInput);
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  return `${year}${month}${day}`;
}

/**
 * Build a valid RFC 5545 .ics file content from an event and its milestones
 *
 * @param {Object} event
 * @param {string} event.title - Event name
 * @param {string} event.date - Main event date
 * @param {Array<Object>} [event.milestones=[]] - Milestones
 * @param {Array<Object>} [event.tasks=[]] - Linked tasks
 * @returns {string} CRLF-delimited iCalendar file text
 */
export function buildICS(event) {
  if (!event || typeof event !== "object") {
    throw new TypeError("event must be an object");
  }

  const CRLF = "\r\n";
  const nowStamp = formatICalDateTime(new Date());
  const eventTitle = event.title || "Utsav Celebration";
  const milestones = Array.isArray(event.milestones) ? event.milestones : [];
  const tasks = Array.isArray(event.tasks) ? event.tasks : [];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Utsav//AI Celebration Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICalText(eventTitle)} Timeline`
  ];

  // 1. Add Main Event Day VEVENT
  if (event.date) {
    const mainEventDate = formatICalDate(event.date);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:main_event_${Date.now()}@utsav.app`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART;VALUE=DATE:${mainEventDate}`);
    lines.push(`DTEND;VALUE=DATE:${mainEventDate}`);
    lines.push(`SUMMARY:🎉 ${escapeICalText(eventTitle)}`);
    lines.push(`DESCRIPTION:${escapeICalText(`Main celebration day for ${eventTitle}!`)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("TRANSP:OPAQUE");
    lines.push("END:VEVENT");
  }

  // 2. Add Milestone VEVENTs
  milestones.forEach((m, idx) => {
    if (!m.dueDate) return;

    const mDate = formatICalDate(m.dueDate);
    const mId = m.id || `milestone_${idx + 1}`;

    // Collect linked tasks for milestone description
    const linkedTasks = tasks.filter((t) => t.milestoneId === m.id);
    let desc = `Milestone: ${m.title}`;
    if (linkedTasks.length > 0) {
      desc += "\\nTasks:\\n" + linkedTasks.map((t) => `- [${t.done ? "X" : " "}] ${t.title}`).join("\\n");
    }

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:ms_${mId}_${mDate}@utsav.app`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART;VALUE=DATE:${mDate}`);
    lines.push(`DTEND;VALUE=DATE:${mDate}`);
    lines.push(`SUMMARY:📌 ${escapeICalText(m.title)}`);
    lines.push(`DESCRIPTION:${escapeICalText(desc)}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("TRANSP:TRANSPARENT");
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  return lines.join(CRLF) + CRLF;
}
