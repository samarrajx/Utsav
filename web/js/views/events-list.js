/**
 * events-list.js - My Events view and switcher
 */

import { el, icon } from "../dom.js";
import { getEvents, deleteEvent, setActiveEventId } from "../storage.js";
import { formatDisplayDate } from "../engine/dates.js";
import { formatCurrency } from "../engine/money.js";
import { navigate } from "../router.js";

/**
 * Render the My Events view
 * @param {Object} options
 * @param {Function} options.onSelectEvent
 * @param {Function} options.onRefresh
 * @returns {HTMLElement}
 */
export function renderEventsList({ onSelectEvent, onRefresh }) {
  const events = getEvents();

  const container = el("div", { className: "events-view" }, [
    el("div", { className: "view-header" }, [
      el("div", {}, [
        el("h2", { className: "view-title" }, "My Celebrations"),
        el("p", { className: "view-subtitle" }, "Manage and switch between your saved event plans.")
      ]),
      el("button", {
        type: "button",
        className: "btn btn-primary",
        onClick: () => navigate("#/new")
      }, [
        icon("plus", "btn-icon"),
        "Plan New Event"
      ])
    ])
  ]);

  if (events.length === 0) {
    container.appendChild(
      el("div", { className: "empty-state-card" }, [
        icon("sparkles", "empty-state-icon"),
        el("h3", { className: "empty-state-title" }, "No events planned yet"),
        el("p", { className: "empty-state-text" }, "Start planning your wedding, milestone birthday, or community festival with deterministic budgets and AI insights."),
        el("button", {
          type: "button",
          className: "btn btn-primary",
          onClick: () => navigate("#/new")
        }, "Start Planning Now")
      ])
    );
    return container;
  }

  const grid = el("div", { className: "events-grid" });
  events.forEach((evt) => {
    const card = el("div", { className: "event-card card" }, [
      el("div", { className: "event-card-header" }, [
        el("span", { className: "badge badge-neutral" }, (evt.type || "Event").toUpperCase()),
        el("button", {
          type: "button",
          className: "btn-icon-subtle",
          title: "Delete event",
          "aria-label": `Delete ${evt.title}`,
          onClick: (e) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete "${evt.title}"?`)) {
              deleteEvent(evt.id);
              if (onRefresh) onRefresh();
            }
          }
        }, [icon("close")])
      ]),

      el("h3", { className: "event-card-title" }, evt.title),

      el("div", { className: "event-card-details" }, [
        el("div", { className: "card-detail-item" }, [
          icon("calendar", "detail-icon"),
          el("span", {}, formatDisplayDate(evt.date))
        ]),
        el("div", { className: "card-detail-item" }, [
          icon("mapPin", "detail-icon"),
          el("span", {}, evt.city || "Venue TBD")
        ]),
        el("div", { className: "card-detail-item" }, [
          icon("wallet", "detail-icon"),
          el("span", {}, formatCurrency(evt.budget?.total || 0, evt.currency || "INR"))
        ])
      ]),

      el("div", { className: "event-card-footer" }, [
        el("button", {
          type: "button",
          className: "btn btn-secondary btn-full",
          onClick: () => {
            setActiveEventId(evt.id);
            if (onSelectEvent) onSelectEvent(evt.id);
            navigate(`#/event/${evt.id}/overview`);
          }
        }, [
          "Open Dashboard",
          icon("arrowRight", "btn-icon")
        ])
      ])
    ]);

    grid.appendChild(card);
  });

  container.appendChild(grid);
  return container;
}
