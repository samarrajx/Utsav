/**
 * step-basics.js - Event type selection cards for intake wizard
 */

import { el, icon } from "../../dom.js";
import { addWeeks, toISODateString } from "../../engine/dates.js";

export const CELEBRATION_TYPES = [
  {
    id: "wedding",
    label: "Wedding Celebration",
    iconName: "sparkles",
    desc: "Multi-day ceremonies, venue, catering & decor"
  },
  {
    id: "birthday",
    label: "Milestone Birthday",
    iconName: "heart",
    desc: "Fun themes, custom cake, party DJ & games"
  },
  {
    id: "community",
    label: "Community & Festival",
    iconName: "users",
    desc: "Cultural stages, food stalls, permits & logistics"
  }
];

/**
 * Render celebration type picker
 * @param {Object} state
 * @param {Function} onSelect
 * @returns {HTMLElement}
 */
export function renderTypePicker(state, onSelect) {
  return el(
    "div",
    { className: "event-type-cards" },
    CELEBRATION_TYPES.map((tc) => {
      const isSelected = state.type === tc.id;
      return el(
        "button",
        {
          type: "button",
          className: `type-card ${isSelected ? "is-selected" : ""}`,
          onClick: () => {
            state.type = tc.id;
            if (tc.id === "wedding") {
              state.budget = 1200000;
              state.guests = 150;
              state.date = addWeeks(toISODateString(new Date()), 24);
            } else if (tc.id === "birthday") {
              state.budget = 75000;
              state.guests = 40;
              state.date = addWeeks(toISODateString(new Date()), 6);
            } else {
              state.budget = 300000;
              state.guests = 400;
              state.date = addWeeks(toISODateString(new Date()), 10);
            }
            if (onSelect) onSelect();
          }
        },
        [
          el("div", { className: "type-card-header" }, [
            icon(tc.iconName, "type-card-icon"),
            el("strong", {}, tc.label)
          ]),
          el("p", { className: "type-card-desc" }, tc.desc)
        ]
      );
    })
  );
}
