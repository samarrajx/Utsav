/**
 * guests-tab.js - Guest list manager with headcount-driven catering intelligence
 *
 * Implements documented attendance formula:
 * Expected Attendance = Confirmed + (Pending * 0.75) + 5% safety buffer plates.
 */

import { el, icon } from "../dom.js";
import { calculateAttendanceFromList, calculateCateringEstimate } from "../engine/catering.js";

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

function createCateringIntelCard(attendance, catering, targetCapacity, guestCount) {
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

function createFilterPills(activeFilter, guestList, attendance, onSelect) {
  const items = [
    { key: "all", label: "All Guests", count: guestList.length },
    { key: "confirmed", label: "Confirmed", count: attendance.confirmed },
    { key: "pending", label: "Pending", count: attendance.pending },
    { key: "declined", label: "Declined", count: attendance.declined }
  ];
  return el(
    "div",
    { className: "filter-pills-group", role: "group", "aria-label": "Filter guest directory" },
    items.map(({ key, label, count }) =>
      el(
        "button",
        {
          type: "button",
          className: `filter-btn ${activeFilter === key ? "is-active" : ""}`,
          onClick: () => onSelect(key)
        },
        `${label} (${count})`
      )
    )
  );
}

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

function createAddGuestForm(guestList, { onUpdate, renderView, announce, event }) {
  const form = el(
    "form",
    {
      className: "card add-guest-card",
      onSubmit: (e) => {
        e.preventDefault();
        const nameInput = form.querySelector("#guest-name");
        const contactInput = form.querySelector("#guest-contact");
        const statusSelect = form.querySelector("#guest-status");
        const dietInput = form.querySelector("#guest-diet");
        const name = nameInput.value.trim();
        if (!name) return;

        const newGuest = {
          id: `g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name,
          contact: contactInput.value.trim() || "",
          status: statusSelect.value || "pending",
          diet: dietInput.value.trim() || ""
        };

        guestList.push(newGuest);
        nameInput.value = "";
        contactInput.value = "";
        dietInput.value = "";

        onUpdate(event);
        renderView();
        announce?.(`Added guest "${newGuest.name}" to directory.`);
      }
    },
    [
      el("h3", { className: "card-title-sm" }, [icon("plus"), "Add Guest / Party to List"]),
      el("div", { className: "form-row-grid" }, [
        el("div", { className: "form-group flex-2" }, [
          el("label", { htmlFor: "guest-name", className: "form-label" }, "Guest / Family Name"),
          el("input", {
            id: "guest-name",
            type: "text",
            required: true,
            className: "form-input",
            placeholder: "e.g., Sharma Family (4 members)"
          })
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "guest-contact", className: "form-label" }, "Phone or Email"),
          el("input", {
            id: "guest-contact",
            type: "text",
            className: "form-input",
            placeholder: "+91 98765 43210"
          })
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "guest-status", className: "form-label" }, "RSVP Status"),
          el("select", { id: "guest-status", className: "form-input" }, [
            el("option", { value: "pending" }, "Pending"),
            el("option", { value: "confirmed" }, "Confirmed"),
            el("option", { value: "declined" }, "Declined")
          ])
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "guest-diet", className: "form-label" }, "Dietary Preferences"),
          el("input", {
            id: "guest-diet",
            type: "text",
            className: "form-input",
            placeholder: "e.g., Pure Jain / Vegetarian"
          })
        ])
      ]),
      el("div", { className: "form-actions-right" }, [
        el("button", { type: "submit", className: "btn btn-primary" }, [icon("plus"), "Add Guest"])
      ])
    ]
  );
  return form;
}

function createGuestTableCard(filteredGuests, guestList, context) {
  const tableContainer = el("div", { className: "card guest-list-card" });
  if (filteredGuests.length === 0) {
    tableContainer.appendChild(
      el(
        "p",
        { className: "empty-state-text" },
        guestList.length === 0
          ? "No guests added yet. Use the form below to begin tracking your attendee RSVPs."
          : "No guests found matching your filter or search query."
      )
    );
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

/**
 * Render the Guests Tab Panel
 *
 * @param {Object} event
 * @param {Object} options
 * @param {Function} options.onUpdate
 * @param {Function} [options.announce]
 * @returns {HTMLElement}
 */
export function renderGuestsTab(event, { onUpdate, announce }) {
  const container = el("div", { className: "tabpanel-guests" });
  if (!event.guests) event.guests = { target: 100, list: [] };
  if (!Array.isArray(event.guests.list)) event.guests.list = [];

  let activeFilter = "all";
  let searchQuery = "";

  function renderView() {
    container.replaceChildren();
    const guestList = event.guests.list;
    const attendance = calculateAttendanceFromList(guestList, 0.75);
    const targetCapacity = event.guests.target || 100;

    const catering = calculateCateringEstimate({
      expectedAttendance: attendance.expectedAttendance,
      perPlateCost: 0,
      bufferPercent: 5
    });

    const cateringCard = createCateringIntelCard(
      attendance,
      catering,
      targetCapacity,
      guestList.length
    );

    const filteredGuests = guestList.filter((g) => {
      if (activeFilter !== "all" && g.status !== activeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (g.name || "").toLowerCase().includes(query) ||
          (g.contact || "").toLowerCase().includes(query) ||
          (g.diet || "").toLowerCase().includes(query)
        );
      }
      return true;
    });

    const filterCard = el("div", { className: "card guest-filter-card" }, [
      el("div", { className: "guest-filter-row" }, [
        createFilterPills(activeFilter, guestList, attendance, (key) => {
          activeFilter = key;
          renderView();
        }),
        el("div", { className: "guest-search-wrap" }, [
          el("input", {
            type: "search",
            className: "form-input guest-search-input",
            placeholder: "Search name, contact, dietary...",
            value: searchQuery,
            onInput: (e) => {
              searchQuery = e.target.value;
              renderView();
            }
          })
        ])
      ])
    ]);

    const context = { onUpdate, renderView, announce, event };
    const tableCard = createGuestTableCard(filteredGuests, guestList, context);
    const addGuestForm = createAddGuestForm(guestList, context);
    container.append(cateringCard, filterCard, tableCard, addGuestForm);
  }

  renderView();
  return container;
}
