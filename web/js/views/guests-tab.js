/**
 * guests-tab.js - Guest list manager with headcount-driven catering intelligence orchestrator
 *
 * Decomposed into:
 * - guests/catering-card.js (catering maths intel card and stacked RSVP progress bar)
 * - guests/guest-filter.js (status filter pills and directory search query)
 * - guests/guest-table.js (guest directory table, status selects, and delete actions)
 * - guests/guest-form.js (add guest / party form and validation)
 */

import { el } from "../dom.js";
import {
  calculateAttendanceFromList,
  calculateCateringEstimate,
  DEFAULT_SHOW_UP_RATE,
  DEFAULT_FOOD_BUFFER_PERCENT
} from "../engine/catering.js";
import { createCateringIntelCard } from "./guests/catering-card.js";
import { filterGuestList, createGuestFilterCard } from "./guests/guest-filter.js";
import { createGuestTableCard } from "./guests/guest-table.js";
import { createAddGuestForm } from "./guests/guest-form.js";

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
    const attendance = calculateAttendanceFromList(guestList, DEFAULT_SHOW_UP_RATE);
    const targetCapacity = event.guests.target || 100;

    const catering = calculateCateringEstimate({
      expectedAttendance: attendance.expectedAttendance,
      perPlateCost: 0,
      bufferPercent: DEFAULT_FOOD_BUFFER_PERCENT
    });

    const cateringCard = createCateringIntelCard(
      attendance,
      catering,
      targetCapacity,
      guestList.length
    );

    const filteredGuests = filterGuestList(guestList, activeFilter, searchQuery);

    const filterCard = createGuestFilterCard({
      activeFilter,
      guestList,
      attendance,
      searchQuery,
      onFilterChange: (key) => {
        activeFilter = key;
        renderView();
      },
      onSearchChange: (e) => {
        searchQuery = e.target.value;
        renderView();
      }
    });

    const context = { onUpdate, renderView, announce, event };
    const tableCard = createGuestTableCard(filteredGuests, guestList, context);
    const addGuestForm = createAddGuestForm(guestList, context);
    container.append(cateringCard, filterCard, tableCard, addGuestForm);
  }

  renderView();
  return container;
}
