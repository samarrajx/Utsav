/**
 * guest-filter.js - Filter pill selector and search bar for celebration guest directory
 */

import { el } from "../../dom.js";
import { createFilterPillGroup } from "../shared/ui-helpers.js";

function createFilterPills(activeFilter, guestList, attendance, onSelect) {
  const items = [
    { key: "all", label: "All Guests", count: guestList.length },
    { key: "confirmed", label: "Confirmed", count: attendance.confirmed },
    { key: "pending", label: "Pending", count: attendance.pending },
    { key: "declined", label: "Declined", count: attendance.declined }
  ];
  return createFilterPillGroup({
    items,
    activeKey: activeFilter,
    ariaLabel: "Filter guest directory",
    onSelect
  });
}

/**
 * Filter the guest list by active status and search query
 * @param {Array<Object>} guestList
 * @param {string} activeFilter
 * @param {string} searchQuery
 * @returns {Array<Object>}
 */
export function filterGuestList(guestList, activeFilter, searchQuery) {
  return guestList.filter((g) => {
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
}

/**
 * Render filter pills and search bar card
 * @param {Object} options
 * @param {string} options.activeFilter
 * @param {Array<Object>} options.guestList
 * @param {Object} options.attendance
 * @param {string} options.searchQuery
 * @param {Function} options.onFilterChange
 * @param {Function} options.onSearchChange
 * @returns {HTMLElement}
 */
export function createGuestFilterCard({
  activeFilter,
  guestList,
  attendance,
  searchQuery,
  onFilterChange,
  onSearchChange
}) {
  return el("div", { className: "card guest-filter-card" }, [
    el("div", { className: "guest-filter-row" }, [
      createFilterPills(activeFilter, guestList, attendance, onFilterChange),
      el("div", { className: "guest-search-wrap" }, [
        el("input", {
          type: "search",
          className: "form-input guest-search-input",
          placeholder: "Search name, contact, dietary...",
          value: searchQuery,
          onInput: onSearchChange
        })
      ])
    ])
  ]);
}
