/**
 * guest-table.js - Interactive guest directory table with RSVP status dropdown and delete actions
 */

import { el, icon } from "../../dom.js";
import { createEmptyState } from "../shared/ui-helpers.js";

function createGuestTableRow(guest, guestList, { onUpdate, renderView, announce, event }) {
  return el("tr", {}, [
    el("td", { className: "font-semibold" }, guest.name),
    el("td", { className: "text-muted" }, guest.contact || "—"),
    el("td", {}, guest.diet ? el("span", { className: "diet-chip" }, guest.diet) : "Standard"),
    el("td", {}, [
      el(
        "select",
        {
          className: `guest-status-select status-${guest.status || "pending"}`,
          "aria-label": `RSVP status for ${guest.name}`,
          onChange: (e) => {
            guest.status = e.target.value;
            onUpdate(event);
            renderView();
            announce?.(`Updated ${guest.name} RSVP to ${guest.status}.`);
          }
        },
        [
          el("option", { value: "pending", selected: guest.status === "pending" }, "Pending"),
          el("option", { value: "confirmed", selected: guest.status === "confirmed" }, "Confirmed"),
          el("option", { value: "declined", selected: guest.status === "declined" }, "Declined")
        ]
      )
    ]),
    el("td", { className: "text-right" }, [
      el(
        "button",
        {
          type: "button",
          className: "btn-icon-subtle btn-delete-guest",
          "aria-label": `Remove guest ${guest.name}`,
          onClick: () => {
            const idx = guestList.indexOf(guest);
            if (idx >= 0) {
              guestList.splice(idx, 1);
              onUpdate(event);
              renderView();
              announce?.(`Guest "${guest.name}" removed.`);
            }
          }
        },
        [icon("trash")]
      )
    ])
  ]);
}

/**
 * Render the guest directory table or empty state
 * @param {Array<Object>} filteredGuests
 * @param {Array<Object>} guestList
 * @param {Object} context
 * @returns {HTMLElement}
 */
export function createGuestTableCard(filteredGuests, guestList, context) {
  const tableContainer = el("div", { className: "card guest-list-card" });
  if (filteredGuests.length === 0) {
    const emptyMsg =
      guestList.length === 0
        ? "No guests added yet. Use the form below to begin tracking your attendee RSVPs."
        : "No guests found matching your filter or search query.";
    tableContainer.appendChild(createEmptyState(emptyMsg));
    return tableContainer;
  }

  const rows = filteredGuests.map((g) => createGuestTableRow(g, guestList, context));
  tableContainer.appendChild(
    el("div", { className: "table-responsive-wrapper" }, [
      el(
        "table",
        { className: "data-table guest-table", "aria-label": "Celebration attendee directory" },
        [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { scope: "col" }, "Guest / Party Name"),
              el("th", { scope: "col" }, "Contact Info"),
              el("th", { scope: "col" }, "Dietary / Notes"),
              el("th", { scope: "col" }, "RSVP Status"),
              el("th", { scope: "col", className: "text-right" }, "Action")
            ])
          ]),
          el("tbody", {}, rows)
        ]
      )
    ])
  );
  return tableContainer;
}
