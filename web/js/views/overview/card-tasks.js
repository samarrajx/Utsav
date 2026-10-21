/**
 * card-tasks.js - Overview upcoming tasks card
 */

import { el, icon } from "../../dom.js";
import { formatDisplayDate, daysBetween } from "../../engine/dates.js";

export function renderTasksCard(event, { onUpdate, onNavigateTab, announce }) {
  const tasks = Array.isArray(event.tasks) ? event.tasks : [];
  const now = new Date();
  const upcomingTasks = tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.due || "").localeCompare(b.due || ""))
    .slice(0, 4);

  return el("div", { className: "card upcoming-tasks-card" }, [
    el("div", { className: "section-header-row" }, [
      el("h3", { className: "overview-section-title" }, [icon("checklist"), "Upcoming Tasks"]),
      el(
        "button",
        {
          type: "button",
          className: "btn-text-link",
          onClick: () => onNavigateTab("tasks")
        },
        "All Tasks →"
      )
    ]),
    upcomingTasks.length > 0
      ? el(
          "ul",
          { className: "quick-tasks-list", "aria-label": "Upcoming incomplete tasks" },
          upcomingTasks.map((t) => {
            const isOverdue = t.due && daysBetween(now, t.due) < 0;
            return el("li", { className: "quick-task-item" }, [
              el("label", { className: "task-checkbox-label" }, [
                el("input", {
                  type: "checkbox",
                  checked: t.done,
                  className: "task-checkbox",
                  onChange: (e) => {
                    t.done = e.target.checked;
                    onUpdate(event);
                    announce?.(`Task "${t.title}" marked as ${t.done ? "completed" : "pending"}.`);
                  }
                }),
                el("span", { className: "quick-task-title" }, t.title)
              ]),
              el(
                "span",
                { className: `task-due-chip ${isOverdue ? "is-overdue" : ""}` },
                t.due ? formatDisplayDate(t.due) : "No date"
              )
            ]);
          })
        )
      : el("p", { className: "empty-state-text" }, "🎉 All upcoming tasks are complete!")
  ]);
}
