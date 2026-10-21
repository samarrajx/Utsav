/**
 * hero.js - Event Hero Banner component
 *
 * Displays event title, date, guest count, city, "N days to go" badge,
 * and vector floral motif without any stock photos or external assets.
 */

import { el, icon, renderFloralMotif } from "../dom.js";
import { formatDisplayDate, daysBetween } from "../engine/dates.js";

/**
 * Render the celebratory event hero banner
 *
 * @param {Object} event
 * @param {Object} options
 * @param {Function} [options.onEdit] - Edit callback
 * @returns {HTMLElement}
 */
export function renderHeroBanner(event, { onEdit } = {}) {
  const daysRemaining = daysBetween(new Date(), event.date || new Date());
  const daysText = daysRemaining > 0
    ? `${daysRemaining} days to go`
    : daysRemaining === 0
      ? "Today is the celebration!"
      : `${Math.abs(daysRemaining)} days ago`;

  const daysBadgeClass = daysRemaining >= 0 ? "hero-badge badge-days-upcoming" : "hero-badge badge-days-past";

  const heroContainer = el("section", { className: "event-hero", "aria-labelledby": "hero-event-title" }, [
    renderFloralMotif(),
    el("div", { className: "hero-content-wrapper" }, [
      el("div", { className: "hero-meta-row" }, [
        el("span", { className: daysBadgeClass }, [
          icon("clock", "badge-icon"),
          daysText
        ]),
        el("span", { className: "hero-type-pill" }, [
          icon("sparkles", "badge-icon"),
          (event.type || "celebration").toUpperCase()
        ])
      ]),

      el("h1", { id: "hero-event-title", className: "hero-event-title" }, event.title || "Celebration Plan"),

      el("div", { className: "hero-details-row" }, [
        el("div", { className: "hero-detail-item" }, [
          icon("calendar", "detail-icon"),
          el("span", {}, formatDisplayDate(event.date || new Date()))
        ]),
        el("div", { className: "hero-detail-item" }, [
          icon("mapPin", "detail-icon"),
          el("span", {}, event.city || "Venue TBD")
        ]),
        el("div", { className: "hero-detail-item" }, [
          icon("users", "detail-icon"),
          el("span", {}, `~${event.guests?.target || 100} Guests`)
        ])
      ]),

      el("div", { className: "hero-actions-row" }, [
        el("button", {
          className: "btn btn-secondary btn-sm hero-edit-btn",
          type: "button",
          "aria-label": "Edit event title and date",
          onClick: onEdit
        }, [
          icon("settings", "btn-icon"),
          "Edit details"
        ])
      ])
    ])
  ]);

  return heroContainer;
}
