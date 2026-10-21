/**
 * timeline-tab.js - Back-scheduled milestone countdown & timeline view
 *
 * Visual vertical milestone sequence with countdown badges,
 * progress tracking, and milestone-linked task status.
 */

import { el, icon } from "../dom.js";
import { formatDisplayDate, daysBetween } from "../engine/dates.js";

function createTimelineHeaderCard(eventDate, daysRemaining, completed, total) {
  return el("div", { className: "card timeline-header-card" }, [
    el("div", { className: "timeline-countdown-wrap" }, [
      el("div", {}, [
        el("h2", { className: "tab-view-heading" }, "Milestone Countdown Timeline"),
        el(
          "p",
          { className: "text-muted" },
          `Back-scheduled countdown toward ${formatDisplayDate(eventDate)} (${Math.max(0, daysRemaining)} days remaining).`
        )
      ]),
      el("div", { className: "countdown-stat-box" }, [
        el("span", { className: "countdown-num" }, String(Math.max(0, daysRemaining))),
        el("span", { className: "countdown-unit" }, "DAYS TO GO")
      ])
    ]),
    el("div", { className: "timeline-progress-meta" }, [
      el("span", {}, `${completed} of ${total} milestones accomplished`)
    ])
  ]);
}

function createTimelineNodeHeader(milestone, isCompleted, isPast, context) {
  const dateLabel = milestone.dueDate ? formatDisplayDate(milestone.dueDate) : "Flexible date";
  const weeksText = milestone.weeksBefore ? ` (${milestone.weeksBefore} wks before)` : "";

  return el("div", { className: "timeline-card-header" }, [
    el("div", {}, [
      el(
        "span",
        { className: `timeline-date-chip ${isPast && !isCompleted ? "is-overdue" : ""}` },
        [icon("clock"), dateLabel, weeksText]
      ),
      el("h3", { className: "timeline-milestone-title" }, milestone.title)
    ]),
    el(
      "button",
      {
        type: "button",
        className: `btn-toggle-milestone ${isCompleted ? "is-done" : ""}`,
        onClick: () => {
          milestone.status = isCompleted ? "pending" : "completed";
          context.onUpdate(context.event);
          context.renderView();
          context.announce?.(`Milestone "${milestone.title}" marked as ${milestone.status}.`);
        }
      },
      [
        isCompleted ? icon("checkCircle") : icon("check"),
        isCompleted ? "Completed" : "Mark as Done"
      ]
    )
  ]);
}

function createTimelineTasksBox(linkedTasks, doneTasks, context) {
  if (linkedTasks.length === 0) {
    return el(
      "p",
      { className: "empty-state-text" },
      "No individual tasks tied to this milestone."
    );
  }

  return el("div", { className: "timeline-tasks-box" }, [
    el("div", { className: "timeline-tasks-summary" }, [
      el("span", { className: "font-semibold" }, "Associated Tasks:"),
      el("span", { className: "text-muted" }, ` (${doneTasks}/${linkedTasks.length} done)`)
    ]),
    el(
      "ul",
      { className: "timeline-task-items" },
      linkedTasks.map((t) =>
        el("li", { className: `timeline-task-item ${t.done ? "is-done" : ""}` }, [
          el("input", {
            type: "checkbox",
            checked: !!t.done,
            className: "task-checkbox",
            onChange: (e) => {
              t.done = e.target.checked;
              context.onUpdate(context.event);
              context.renderView();
              context.announce?.(`Task "${t.title}" updated.`);
            }
          }),
          el("span", {}, t.title)
        ])
      )
    )
  ]);
}

function createTimelineNode(milestone, idx, now, tasks, context) {
  const isPast = Boolean(milestone.dueDate && daysBetween(now, milestone.dueDate) < 0);
  const isCompleted = milestone.status === "completed";
  const linkedTasks = tasks.filter((t) => t.milestoneId === milestone.id);
  const doneTasks = linkedTasks.filter((t) => t.done).length;

  return el(
    "li",
    {
      className: `timeline-node ${isCompleted ? "is-completed" : ""} ${isPast && !isCompleted ? "is-overdue" : ""}`
    },
    [
      el("div", { className: "timeline-marker", "aria-hidden": "true" }, [
        isCompleted ? icon("check") : el("span", {}, String(idx + 1))
      ]),
      el("div", { className: "card timeline-card" }, [
        createTimelineNodeHeader(milestone, isCompleted, isPast, context),
        createTimelineTasksBox(linkedTasks, doneTasks, context)
      ])
    ]
  );
}

function createAddMilestoneForm(eventDate, onAddMilestone) {
  const form = el(
    "form",
    {
      className: "card add-milestone-card",
      onSubmit: (e) => {
        e.preventDefault();
        const titleInput = form.querySelector("#new-milestone-title");
        const dateInput = form.querySelector("#new-milestone-date");
        const title = titleInput.value.trim();
        if (!title) return;

        onAddMilestone({
          id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title,
          dueDate: dateInput.value || eventDate,
          weeksBefore: 0,
          status: "pending",
          overdue: false
        });

        titleInput.value = "";
        dateInput.value = "";
      }
    },
    [
      el("h3", { className: "card-title-sm" }, [icon("plus"), "Schedule New Milestone"]),
      el("div", { className: "form-row-grid" }, [
        el("div", { className: "form-group flex-2" }, [
          el(
            "label",
            { htmlFor: "new-milestone-title", className: "form-label" },
            "Milestone Name"
          ),
          el("input", {
            id: "new-milestone-title",
            type: "text",
            required: true,
            className: "form-input",
            placeholder: "e.g., Final Guest RSVP Cutoff & Seating Plan"
          })
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "new-milestone-date", className: "form-label" }, "Target Date"),
          el("input", {
            id: "new-milestone-date",
            type: "date",
            className: "form-input",
            required: true
          })
        ])
      ]),
      el("div", { className: "form-actions-right" }, [
        el("button", { type: "submit", className: "btn btn-primary" }, [
          icon("plus"),
          "Add Milestone"
        ])
      ])
    ]
  );
  return form;
}

/**
 * Render the Timeline Tab Panel
 *
 * @param {Object} event
 * @param {Object} options
 * @param {Function} options.onUpdate
 * @param {Function} [options.announce]
 * @returns {HTMLElement}
 */
export function renderTimelineTab(event, { onUpdate, announce }) {
  const container = el("div", { className: "tabpanel-timeline" });
  const milestones = Array.isArray(event.milestones) ? event.milestones : [];
  const tasks = Array.isArray(event.tasks) ? event.tasks : [];
  const now = new Date();

  function renderView() {
    container.replaceChildren();
    const daysRemaining = daysBetween(now, event.date);
    const completed = milestones.filter((m) => m.status === "completed").length;
    const headerCard = createTimelineHeaderCard(
      event.date,
      daysRemaining,
      completed,
      milestones.length
    );

    const context = { onUpdate, renderView, announce, event };
    const timelineList = el(
      "ol",
      {
        className: "timeline-vertical-track",
        "aria-label": "Milestone progression sequence"
      },
      milestones.map((m, idx) => createTimelineNode(m, idx, now, tasks, context))
    );

    const addMilestoneForm = createAddMilestoneForm(event.date, (newMilestone) => {
      milestones.push(newMilestone);
      onUpdate(event);
      renderView();
      announce?.(`Added milestone "${newMilestone.title}".`);
    });

    container.append(headerCard, timelineList, addMilestoneForm);
  }

  renderView();
  return container;
}
