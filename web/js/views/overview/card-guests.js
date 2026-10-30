/**
 * card-guests.js - Overview guest RSVP metric card
 */

import { el, icon } from "../../dom.js";
import { calculateAttendanceFromList } from "../../engine/catering.js";

function createRsvpProgressBar(attendance, total) {
  const safeTotal = Math.max(1, total);
  const confPct = Math.round((attendance.confirmed / safeTotal) * 100);
  const pendPct = Math.round((attendance.pending / safeTotal) * 100);
  const declPct = Math.round((attendance.declined / safeTotal) * 100);

  return el(
    "div",
    {
      className: "stacked-rsvp-bar",
      role: "progressbar",
      "aria-label": `RSVP breakdown: ${attendance.confirmed} confirmed, ${attendance.pending} pending, ${attendance.declined} declined`,
      "aria-valuenow": confPct,
      "aria-valuemin": "0",
      "aria-valuemax": "100"
    },
    [
      confPct > 0
        ? el("div", {
            className: "rsvp-bar-segment is-confirmed",
            style: { width: `${confPct}%` },
            title: `Confirmed: ${attendance.confirmed}`
          })
        : null,
      pendPct > 0
        ? el("div", {
            className: "rsvp-bar-segment is-pending",
            style: { width: `${pendPct}%` },
            title: `Pending: ${attendance.pending}`
          })
        : null,
      declPct > 0
        ? el("div", {
            className: "rsvp-bar-segment is-declined",
            style: { width: `${declPct}%` },
            title: `Declined: ${attendance.declined}`
          })
        : null
    ]
  );
}

/**
 * Render the overview guest list metric card
 * @param {Object} event
 * @param {Function} [onNavigateTab]
 * @returns {HTMLElement}
 */
export function renderGuestsCard(event, onNavigateTab) {
  const guestList = Array.isArray(event.guests?.list) ? event.guests.list : [];
  const attendance = calculateAttendanceFromList(guestList);
  const totalInvited = attendance.totalInvited || event.guests?.target || 0;

  return el("div", { className: "card metric-card" }, [
    el("div", { className: "metric-card-header" }, [
      icon("users", "metric-icon"),
      el("span", { className: "metric-label" }, "Guest List Status")
    ]),
    el("div", { className: "metric-value" }, `${attendance.confirmed} / ${totalInvited}`),
    el(
      "div",
      { className: "metric-subtext" },
      `${attendance.pending} pending, ${attendance.declined} declined`
    ),
    createRsvpProgressBar(attendance, totalInvited),
    el("div", { className: "card-action-link" }, [
      el(
        "button",
        {
          type: "button",
          className: "btn-text-link",
          onClick: () => onNavigateTab("guests")
        },
        "Manage Guest List & Catering →"
      )
    ])
  ]);
}
