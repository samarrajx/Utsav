/**
 * card-milestone.js - Overview next major milestone card
 */

import { el, icon } from "../../dom.js";
import { formatDisplayDate } from "../../engine/dates.js";

/**
 * Render the overview next milestone highlight card
 * @param {Object} event
 * @param {Function} [onNavigateTab]
 * @returns {HTMLElement}
 */
export function renderMilestoneCard(event, onNavigateTab) {
  const milestones = Array.isArray(event.milestones) ? event.milestones : [];
  const nextMilestone = milestones.find((m) => m.status !== "completed") || milestones[0];

  return el("div", { className: "card milestone-highlight-card" }, [
    el("div", { className: "section-header-row" }, [
      el("h3", { className: "overview-section-title" }, [icon("calendar"), "Next Major Milestone"]),
      el(
        "button",
        {
          type: "button",
          className: "btn-text-link",
          onClick: () => onNavigateTab("timeline")
        },
        "Full Timeline →"
      )
    ]),
    nextMilestone
      ? el("div", { className: "milestone-box" }, [
          el("div", { className: "milestone-date-badge" }, [
            icon("clock"),
            formatDisplayDate(nextMilestone.dueDate || event.date)
          ]),
          el("h4", { className: "milestone-box-title" }, nextMilestone.title),
          el(
            "p",
            { className: "milestone-box-status" },
            nextMilestone.overdue
              ? "⚠️ Overdue - take action now"
              : "Upcoming milestone on schedule"
          )
        ])
      : el("p", { className: "empty-state-text" }, "No milestones scheduled.")
  ]);
}
