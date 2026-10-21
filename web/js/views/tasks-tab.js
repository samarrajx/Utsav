/**
 * tasks-tab.js - Interactive milestone-grouped celebration checklist
 *
 * Supports task completion toggles, overdue indicators, filtering,
 * and inline task creation.
 */

import { el, icon } from "../dom.js";
import { formatDisplayDate, daysBetween } from "../engine/dates.js";

function createTaskProgressBar(completed, total) {
  const percentDone = total > 0 ? Math.round((completed / total) * 100) : 0;
  const counterText = el(
    "span",
    { className: "tasks-progress-text" },
    `${completed} of ${total} tasks completed (${percentDone}%)`
  );
  const progressFill = el("div", {
    className: "progress-bar-fill",
    style: { width: `${percentDone}%` }
  });
  const progressBar = el(
    "div",
    {
      className: "progress-bar-track",
      role: "progressbar",
      "aria-valuenow": String(percentDone),
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-label": "Task completion progress"
    },
    [progressFill]
  );

  return { counterText, progressFill, progressBar };
}

function createFilterControls(onFilterChange) {
  return el(
    "div",
    { className: "tasks-filter-group", role: "group", "aria-label": "Filter tasks" },
    [
      el(
        "button",
        {
          type: "button",
          className: "filter-btn is-active",
          onClick: (e) => {
            e.currentTarget.parentElement
              .querySelectorAll(".filter-btn")
              .forEach((b) => b.classList.remove("is-active"));
            e.currentTarget.classList.add("is-active");
            onFilterChange("all");
          }
        },
        "All Tasks"
      ),
      el(
        "button",
        {
          type: "button",
          className: "filter-btn",
          onClick: (e) => {
            e.currentTarget.parentElement
              .querySelectorAll(".filter-btn")
              .forEach((b) => b.classList.remove("is-active"));
            e.currentTarget.classList.add("is-active");
            onFilterChange("incomplete");
          }
        },
        "Pending"
      ),
      el(
        "button",
        {
          type: "button",
          className: "filter-btn",
          onClick: (e) => {
            e.currentTarget.parentElement
              .querySelectorAll(".filter-btn")
              .forEach((b) => b.classList.remove("is-active"));
            e.currentTarget.classList.add("is-active");
            onFilterChange("completed");
          }
        },
        "Completed"
      )
    ]
  );
}

function createTaskItemNode(task, now, { onToggle, onDelete }) {
  const isOverdue = !task.done && task.due && daysBetween(now, task.due) < 0;

  return el("li", { className: `task-row ${task.done ? "is-done" : ""}` }, [
    el("label", { className: "task-label-wrap" }, [
      el("input", {
        type: "checkbox",
        checked: !!task.done,
        className: "task-checkbox-input",
        onChange: (e) => onToggle(task, e.target.checked)
      }),
      el("span", { className: "task-text" }, task.title)
    ]),
    el("div", { className: "task-meta-actions" }, [
      task.due
        ? el("span", { className: `task-due-chip ${isOverdue ? "is-overdue" : ""}` }, [
            isOverdue ? icon("alertTriangle") : icon("calendar"),
            formatDisplayDate(task.due)
          ])
        : null,
      el(
        "button",
        {
          type: "button",
          className: "btn-icon-subtle btn-delete-task",
          "aria-label": `Delete task "${task.title}"`,
          onClick: () => onDelete(task)
        },
        [icon("trash")]
      )
    ])
  ]);
}

function createMilestoneGroupSection(
  id,
  title,
  dueDate,
  isOverdue,
  doneCount,
  totalCount,
  taskNodes
) {
  return el(
    "section",
    {
      className: "milestone-task-group card",
      "aria-labelledby": `milestone-heading-${id}`
    },
    [
      el("header", { className: "milestone-group-header" }, [
        el("div", { className: "milestone-header-info" }, [
          el("h3", { id: `milestone-heading-${id}`, className: "milestone-group-title" }, title),
          dueDate !== null
            ? el("span", { className: `milestone-due-tag ${isOverdue ? "is-overdue" : ""}` }, [
                icon("clock"),
                dueDate ? formatDisplayDate(dueDate) : "Flexible date"
              ])
            : null
        ]),
        el("span", { className: "milestone-count-chip" }, `${doneCount}/${totalCount} done`)
      ]),
      el("ul", { className: "tasks-checklist", "aria-label": `Tasks for ${title}` }, taskNodes)
    ]
  );
}

function createAddTaskForm(milestones, onAddTask) {
  const form = el(
    "form",
    {
      className: "card add-task-card",
      onSubmit: (e) => {
        e.preventDefault();
        const titleInput = form.querySelector("#new-task-title");
        const milestoneSelect = form.querySelector("#new-task-milestone");
        const dateInput = form.querySelector("#new-task-due");
        const title = titleInput.value.trim();
        if (!title) return;

        onAddTask({
          id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          milestoneId: milestoneSelect.value || null,
          title,
          due: dateInput.value || null,
          done: false
        });

        titleInput.value = "";
        dateInput.value = "";
      }
    },
    [
      el("h3", { className: "card-title-sm" }, [icon("plus"), "Add New Task"]),
      el("div", { className: "form-row-grid" }, [
        el("div", { className: "form-group flex-2" }, [
          el("label", { htmlFor: "new-task-title", className: "form-label" }, "Task Title"),
          el("input", {
            id: "new-task-title",
            type: "text",
            required: true,
            className: "form-input",
            placeholder: "e.g., Finalize floral centerpieces with decorator"
          })
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "new-task-milestone", className: "form-label" }, "Milestone"),
          el("select", { id: "new-task-milestone", className: "form-input" }, [
            el("option", { value: "" }, "General / No Milestone"),
            ...milestones.map((m) => el("option", { value: m.id }, m.title))
          ])
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "new-task-due", className: "form-label" }, "Due Date"),
          el("input", { id: "new-task-due", type: "date", className: "form-input" })
        ])
      ]),
      el("div", { className: "form-actions-right" }, [
        el("button", { type: "submit", className: "btn btn-primary" }, [icon("plus"), "Add Task"])
      ])
    ]
  );
  return form;
}

function renderTaskListContent(
  taskListContainer,
  filteredTasks,
  milestones,
  activeFilter,
  actions
) {
  taskListContainer.replaceChildren();

  if (filteredTasks.length === 0) {
    taskListContainer.appendChild(
      el("div", { className: "card empty-state-card" }, [
        el(
          "p",
          { className: "empty-state-text" },
          activeFilter === "completed"
            ? "No completed tasks yet. Check off items as you make progress!"
            : "No tasks found matching your filter."
        )
      ])
    );
    return;
  }

  const milestoneMap = new Map();
  milestones.forEach((m) => milestoneMap.set(m.id, { milestone: m, tasks: [] }));
  const unassignedTasks = [];

  filteredTasks.forEach((t) => {
    if (t.milestoneId && milestoneMap.has(t.milestoneId)) {
      milestoneMap.get(t.milestoneId).tasks.push(t);
    } else {
      unassignedTasks.push(t);
    }
  });

  const now = new Date();
  milestoneMap.forEach(({ milestone, tasks: mTasks }) => {
    if (mTasks.length === 0) return;
    const isOverdue = milestone.dueDate && daysBetween(now, milestone.dueDate) < 0;
    const nodes = mTasks.map((t) => createTaskItemNode(t, now, actions));
    taskListContainer.appendChild(
      createMilestoneGroupSection(
        milestone.id,
        milestone.title,
        milestone.dueDate,
        isOverdue,
        mTasks.filter((t) => t.done).length,
        mTasks.length,
        nodes
      )
    );
  });

  if (unassignedTasks.length > 0) {
    const nodes = unassignedTasks.map((t) => createTaskItemNode(t, now, actions));
    taskListContainer.appendChild(
      createMilestoneGroupSection(
        "general",
        "General Checklist",
        null,
        false,
        unassignedTasks.filter((t) => t.done).length,
        unassignedTasks.length,
        nodes
      )
    );
  }
}

/**
 * Render the Tasks tab panel
 *
 * @param {Object} event
 * @param {Object} options
 * @param {Function} options.onUpdate
 * @param {Function} [options.announce]
 * @returns {HTMLElement}
 */
export function renderTasksTab(event, { onUpdate, announce }) {
  const container = el("div", { className: "tabpanel-tasks" });
  let activeFilter = "all";

  const milestones = Array.isArray(event.milestones) ? event.milestones : [];
  const tasks = Array.isArray(event.tasks) ? event.tasks : [];

  const { counterText, progressFill, progressBar } = createTaskProgressBar(
    tasks.filter((t) => t.done).length,
    tasks.length
  );

  const filterControls = createFilterControls((filter) => {
    activeFilter = filter;
    renderTaskList();
  });

  const topBar = el("div", { className: "card tasks-header-card" }, [
    el("div", { className: "tasks-headline-row" }, [
      el("h2", { className: "tab-view-heading" }, "Celebration Checklist"),
      filterControls
    ]),
    counterText,
    progressBar
  ]);

  const taskListContainer = el("div", { className: "tasks-list-container" });

  function renderTaskList() {
    const filteredTasks = tasks.filter((t) => {
      if (activeFilter === "incomplete") return !t.done;
      if (activeFilter === "completed") return t.done;
      return true;
    });

    const completed = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    const percentDone = total > 0 ? Math.round((completed / total) * 100) : 0;

    counterText.textContent = `${completed} of ${total} tasks completed (${percentDone}%)`;
    progressFill.style.width = `${percentDone}%`;
    progressBar.setAttribute("aria-valuenow", String(percentDone));

    const actions = {
      onToggle: (task, done) => {
        task.done = done;
        onUpdate(event);
        renderTaskList();
        announce?.(`Task "${task.title}" marked as ${task.done ? "completed" : "incomplete"}.`);
      },
      onDelete: (task) => {
        const idx = event.tasks.indexOf(task);
        if (idx >= 0) {
          event.tasks.splice(idx, 1);
          onUpdate(event);
          renderTaskList();
          announce?.(`Task "${task.title}" deleted.`);
        }
      }
    };

    renderTaskListContent(taskListContainer, filteredTasks, milestones, activeFilter, actions);
  }

  const addTaskForm = createAddTaskForm(milestones, (newTask) => {
    if (!Array.isArray(event.tasks)) event.tasks = [];
    event.tasks.push(newTask);
    onUpdate(event);
    renderTaskList();
    announce?.(`Added new task: "${newTask.title}".`);
  });

  container.append(topBar, taskListContainer, addTaskForm);
  renderTaskList();
  return container;
}
