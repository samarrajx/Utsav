/**
 * tabs.js - Accessible ARIA Tablist component with keyboard arrow navigation
 */

import { el, icon } from "../dom.js";

export const TAB_DEFINITIONS = [
  { id: "overview", label: "Overview", iconName: "sparkles" },
  { id: "tasks", label: "Tasks", iconName: "checklist" },
  { id: "budget", label: "Budget", iconName: "wallet" },
  { id: "vendors", label: "Vendors", iconName: "building" },
  { id: "timeline", label: "Timeline", iconName: "calendar" },
  { id: "guests", label: "Guests", iconName: "users" },
  { id: "ideas", label: "Ideas", iconName: "heart" }
];

/**
 * Render the accessible tabs navigation
 *
 * @param {string} activeTab
 * @param {Function} onSelectTab
 * @returns {HTMLElement}
 */
export function renderTablist(activeTab = "overview", onSelectTab) {
  const tabButtons = [];

  const nav = el("nav", { className: "event-tabs-nav", "aria-label": "Event sections" }, [
    el(
      "div",
      {
        className: "tablist",
        role: "tablist",
        "aria-label": "Event planning tabs"
      },
      TAB_DEFINITIONS.map((tabDef, idx) => {
        const isSelected = tabDef.id === activeTab;
        const btn = el(
          "button",
          {
            type: "button",
            role: "tab",
            id: `tab-${tabDef.id}`,
            className: `tab-btn ${isSelected ? "is-active" : ""}`,
            "aria-selected": isSelected ? "true" : "false",
            "aria-controls": `tabpanel-${tabDef.id}`,
            tabindex: isSelected ? "0" : "-1",
            onClick: () => onSelectTab(tabDef.id),
            onKeydown: (e) => {
              let nextIdx = idx;
              if (e.key === "ArrowRight") {
                nextIdx = (idx + 1) % TAB_DEFINITIONS.length;
              } else if (e.key === "ArrowLeft") {
                nextIdx = (idx - 1 + TAB_DEFINITIONS.length) % TAB_DEFINITIONS.length;
              } else if (e.key === "Home") {
                nextIdx = 0;
              } else if (e.key === "End") {
                nextIdx = TAB_DEFINITIONS.length - 1;
              } else {
                return;
              }
              e.preventDefault();
              tabButtons[nextIdx]?.focus();
              onSelectTab(TAB_DEFINITIONS[nextIdx].id);
            }
          },
          [icon(tabDef.iconName, "tab-icon"), el("span", { className: "tab-label" }, tabDef.label)]
        );

        tabButtons.push(btn);
        return btn;
      })
    )
  ]);

  return nav;
}
