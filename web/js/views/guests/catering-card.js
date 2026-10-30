/**
 * catering-card.js - Catering maths intelligence card and stacked RSVP progress bar
 */

import { el, icon } from "../../dom.js";

function createRsvpStackedBar(attendance, total) {
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
 * Render catering intelligence card with attendance projection formulas
 * @param {Object} attendance
 * @param {Object} catering
 * @param {number} targetCapacity
 * @param {number} guestCount
 * @returns {HTMLElement}
 */
export function createCateringIntelCard(attendance, catering, targetCapacity, guestCount) {
  return el("div", { className: "card catering-intel-card" }, [
    el("div", { className: "catering-header-row" }, [
      el("div", {}, [
        el("h2", { className: "tab-view-heading" }, [
          icon("utensils"),
          "Catering Maths & Attendance Projection"
        ]),
        el(
          "p",
          { className: "text-muted" },
          "Deterministic headcount calculations preventing over-ordering or food shortages."
        )
      ]),
      el("div", { className: "catering-highlight-box" }, [
        el("span", { className: "catering-plates-num" }, String(catering.platesToOrder)),
        el("span", { className: "catering-plates-label" }, "RECOMMENDED PLATES")
      ])
    ]),
    el("div", { className: "formula-breakdown-grid" }, [
      el("div", { className: "formula-col" }, [
        el("span", { className: "formula-title" }, "Confirmed RSVPs"),
        el("span", { className: "formula-val text-success" }, String(attendance.confirmed))
      ]),
      el("div", { className: "formula-operator" }, "+"),
      el("div", { className: "formula-col" }, [
        el("span", { className: "formula-title" }, "Pending Projected (75%)"),
        el(
          "span",
          { className: "formula-val text-warning" },
          String(Math.round(attendance.pending * 0.75))
        )
      ]),
      el("div", { className: "formula-operator" }, "="),
      el("div", { className: "formula-col" }, [
        el("span", { className: "formula-title" }, "Expected Attendance"),
        el("span", { className: "formula-val" }, String(attendance.expectedAttendance))
      ]),
      el("div", { className: "formula-operator" }, "+"),
      el("div", { className: "formula-col" }, [
        el("span", { className: "formula-title" }, "5% Safety Buffer"),
        el("span", { className: "formula-val text-muted" }, `${catering.bufferPlates} plates`)
      ])
    ]),
    el("div", { className: "rsvp-progress-wrapper" }, [
      createRsvpStackedBar(attendance, guestCount || targetCapacity),
      el("div", { className: "rsvp-stats-legend" }, [
        el("span", { className: "legend-tag is-confirmed" }, `Confirmed: ${attendance.confirmed}`),
        el("span", { className: "legend-tag is-pending" }, `Pending: ${attendance.pending}`),
        el("span", { className: "legend-tag is-declined" }, `Declined: ${attendance.declined}`),
        el("span", { className: "legend-tag is-target" }, `Target Capacity: ${targetCapacity}`)
      ])
    ])
  ]);
}
