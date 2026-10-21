/**
 * overview-tab.js - Central celebration command center view
 *
 * Displays high-level status: Total budget bar, planning progress ring,
 * upcoming tasks, next milestone, guest RSVP summary, feasibility card, and critic audit.
 */

import { el, icon } from "../dom.js";
import { formatCompactCurrency } from "../engine/money.js";
import { formatDisplayDate, daysBetween } from "../engine/dates.js";
import { calculateAttendanceFromList } from "../engine/catering.js";
import { fetchCritique } from "../api.js";
import { exportEventJSON, downloadTextFile } from "../storage.js";
import { buildICS } from "../engine/ics.js";

/**
 * Render the Overview Tab Panel
 *
 * @param {Object} event - Current event object
 * @param {Object} options
 * @param {Function} options.onUpdate - Callback when an item is modified
 * @param {Function} options.onNavigateTab - Callback to switch to another tab
 * @param {Function} [options.announce] - Accessible live announcement
 * @returns {HTMLElement}
 */
export function renderOverviewTab(event, { onUpdate, onNavigateTab, announce }) {
  const container = el("div", { className: "tabpanel-overview" });

  // 1. Calculations & Metrics
  const totalBudget = Number(event.budget?.total) || 0;
  const expenses = Array.isArray(event.expenses) ? event.expenses : [];
  const totalSpent = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  const budgetSpentPercent = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  const tasks = Array.isArray(event.tasks) ? event.tasks : [];
  const completedTasks = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const vendors = Array.isArray(event.vendors) ? event.vendors : [];
  const bookedVendors = vendors.filter((v) => v.status === "booked").length;
  const totalVendors = vendors.length;
  const vendorProgressPercent = totalVendors > 0 ? Math.round((bookedVendors / totalVendors) * 100) : 0;

  const guestList = Array.isArray(event.guests?.list) ? event.guests.list : [];
  const attendance = calculateAttendanceFromList(guestList);
  const totalInvited = attendance.totalInvited || event.guests?.target || 0;
  const guestsResponded = attendance.confirmed + attendance.declined;
  const guestResponsePercent = totalInvited > 0 ? Math.round((guestsResponded / totalInvited) * 100) : 0;

  // Composite planning progress
  const compositeScore = Math.round((taskProgressPercent * 0.35) + (vendorProgressPercent * 0.35) + (guestResponsePercent * 0.30));

  // Next Milestone
  const milestones = Array.isArray(event.milestones) ? event.milestones : [];
  const now = new Date();
  const nextMilestone = milestones.find((m) => {
    if (m.status === "completed") return false;
    return true;
  }) || milestones[0];

  // Upcoming incomplete tasks (sorted by due date)
  const upcomingTasks = tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.due || "").localeCompare(b.due || ""))
    .slice(0, 4);

  // 2. Metrics Grid (Top Row)
  const metricsGrid = el("div", { className: "overview-metrics-grid" }, [
    // Card 1: Total Budget
    el("div", { className: "card metric-card" }, [
      el("div", { className: "metric-card-header" }, [
        icon("wallet", "metric-icon"),
        el("span", { className: "metric-label" }, "Total Budget")
      ]),
      el("div", { className: "metric-value" }, formatCompactCurrency(totalBudget, event.currency)),
      el("div", { className: "metric-subtext" }, [
        el("span", { style: { color: totalSpent > totalBudget ? "#C93B2B" : "#2E6B4E", fontWeight: "600" } },
          formatCompactCurrency(totalSpent, event.currency)
        ),
        ` spent (${budgetSpentPercent}%) • `,
        el("span", { style: { color: "#665057" } }, `${formatCompactCurrency(remainingBudget, event.currency)} left`)
      ]),
      // Budget progress bar
      el("div", {
        className: "progress-bar-track",
        role: "progressbar",
        "aria-valuenow": budgetSpentPercent,
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-label": "Budget spent percentage"
      }, [
        el("div", {
          className: `progress-bar-fill ${totalSpent > totalBudget ? "is-overspent" : ""}`,
          style: { width: `${budgetSpentPercent}%` }
        })
      ]),
      el("div", { className: "card-action-link" }, [
        el("button", {
          type: "button",
          className: "btn-text-link",
          onClick: () => onNavigateTab("budget")
        }, "View Budget Breakdown →")
      ])
    ]),

    // Card 2: Planning Progress Ring
    el("div", { className: "card metric-card progress-ring-card" }, [
      el("div", { className: "metric-card-header" }, [
        icon("sparkles", "metric-icon"),
        el("span", { className: "metric-label" }, "Planning Progress")
      ]),
      el("div", { className: "progress-ring-container" }, [
        // Accessible pure SVG circular progress meter
        createProgressRingSvg(compositeScore),
        el("div", { className: "progress-ring-stats" }, [
          el("div", { className: "stat-line" }, [
            el("span", { className: "stat-name" }, "Tasks Done:"),
            el("span", { className: "stat-val" }, `${completedTasks}/${totalTasks}`)
          ]),
          el("div", { className: "stat-line" }, [
            el("span", { className: "stat-name" }, "Vendors Booked:"),
            el("span", { className: "stat-val" }, `${bookedVendors}/${totalVendors}`)
          ]),
          el("div", { className: "stat-line" }, [
            el("span", { className: "stat-name" }, "RSVP Count:"),
            el("span", { className: "stat-val" }, `${attendance.confirmed} confirmed`)
          ])
        ])
      ])
    ]),

    // Card 3: Guest List & RSVPs
    el("div", { className: "card metric-card" }, [
      el("div", { className: "metric-card-header" }, [
        icon("users", "metric-icon"),
        el("span", { className: "metric-label" }, "Guest List Status")
      ]),
      el("div", { className: "metric-value" }, `${attendance.confirmed} / ${totalInvited}`),
      el("div", { className: "metric-subtext" }, `${attendance.pending} pending, ${attendance.declined} declined`),
      // Stacked RSVP bar
      createRsvpProgressBar(attendance, totalInvited),
      el("div", { className: "card-action-link" }, [
        el("button", {
          type: "button",
          className: "btn-text-link",
          onClick: () => onNavigateTab("guests")
        }, "Manage Guest List & Catering →")
      ])
    ])
  ]);

  // 3. Middle Section: Next Milestone & Upcoming Tasks (2 columns)
  const middleRow = el("div", { className: "overview-two-col-grid" }, [
    // Next Milestone Card
    el("div", { className: "card milestone-highlight-card" }, [
      el("div", { className: "section-header-row" }, [
        el("h3", { className: "overview-section-title" }, [
          icon("calendar"),
          "Next Major Milestone"
        ]),
        el("button", {
          type: "button",
          className: "btn-text-link",
          onClick: () => onNavigateTab("timeline")
        }, "Full Timeline →")
      ]),
      nextMilestone ? el("div", { className: "milestone-box" }, [
        el("div", { className: "milestone-date-badge" }, [
          icon("clock"),
          formatDisplayDate(nextMilestone.dueDate || event.date)
        ]),
        el("h4", { className: "milestone-box-title" }, nextMilestone.title),
        el("p", { className: "milestone-box-status" },
          nextMilestone.overdue ? "⚠️ Overdue - take action now" : "Upcoming milestone on schedule"
        )
      ]) : el("p", { className: "empty-state-text" }, "No milestones scheduled.")
    ]),

    // Upcoming Tasks Card
    el("div", { className: "card upcoming-tasks-card" }, [
      el("div", { className: "section-header-row" }, [
        el("h3", { className: "overview-section-title" }, [
          icon("checklist"),
          "Upcoming Tasks"
        ]),
        el("button", {
          type: "button",
          className: "btn-text-link",
          onClick: () => onNavigateTab("tasks")
        }, "All Tasks →")
      ]),
      upcomingTasks.length > 0 ? el("ul", { className: "quick-tasks-list", "aria-label": "Upcoming incomplete tasks" },
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
            el("span", { className: `task-due-chip ${isOverdue ? "is-overdue" : ""}` },
              t.due ? formatDisplayDate(t.due) : "No date"
            )
          ]);
        })
      ) : el("p", { className: "empty-state-text" }, "🎉 All upcoming tasks are complete!")
    ])
  ]);

  // 4. Bottom Row: Feasibility Verdict & Critic Audit
  const bottomRow = el("div", { className: "overview-two-col-grid" }, [
    // Feasibility Card
    el("div", { className: "card feasibility-card" }, [
      el("div", { className: "section-header-row" }, [
        el("h3", { className: "overview-section-title" }, [
          icon("sparkles"),
          "Budget & Headcount Feasibility"
        ]),
        createFeasibilityBandBadge(event.feasibility?.band || "comfortable")
      ]),
      el("p", { className: "feasibility-summary-text" },
        event.feasibility?.summary || "Feasibility assessment is currently healthy."
      ),
      event.feasibility?.tradeOffs?.length > 0 ? el("div", { className: "feasibility-tradeoffs-list" }, [
        el("h5", { className: "tradeoffs-header" }, "Recommended Trade-offs:"),
        el("ul", {}, event.feasibility.tradeOffs.map((to) =>
          el("li", {}, [
            el("strong", {}, `${to.category}: `),
            to.detail
          ])
        ))
      ]) : null
    ]),

    // AI Critic Audit
    el("div", { className: "card critic-card" }, [
      el("div", { className: "section-header-row" }, [
        el("h3", { className: "overview-section-title" }, [
          icon("alertTriangle"),
          "Event Readiness & Risks"
        ]),
        el("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" } }, [
          el("span", { className: "risk-count-badge" },
            `${event.critique?.risks?.length || 0} risks identified`
          ),
          el("button", {
            type: "button",
            className: "btn-text-link btn-reaudit-critic",
            onClick: async (e) => {
              const btn = e.currentTarget;
              btn.textContent = "Auditing...";
              try {
                const res = await fetchCritique(event, event.language || "en");
                if (res.ok && res.data && Array.isArray(res.data.risks)) {
                  if (!event.critique) event.critique = {};
                  event.critique.risks = res.data.risks;
                  onUpdate(event);
                  announce?.(`AI Critic audit complete: ${res.data.risks.length} risks identified.`);
                }
              } catch (err) {
                console.warn("[Critic Warning]", err);
              } finally {
                btn.textContent = "Re-Audit Plan →";
              }
            }
          }, "Re-Audit Plan →")
        ])
      ]),
      event.critique?.risks?.length > 0 ? el("div", { className: "critic-risks-list" },
        event.critique.risks.map((risk) =>
          el("div", { className: `critic-risk-item severity-${risk.severity || "medium"}` }, [
            el("div", { className: "risk-item-header" }, [
              el("span", { className: `badge-severity badge-${risk.severity || "medium"}` },
                (risk.severity || "medium").toUpperCase()
              ),
              el("strong", { className: "risk-title" }, risk.title)
            ]),
            el("p", { className: "risk-detail" }, risk.detail),
            risk.suggestedFix ? el("p", { className: "risk-fix" }, [
              el("span", { className: "fix-label" }, "Suggested Fix: "),
              risk.suggestedFix
            ]) : null
          ])
        )
      ) : el("p", { className: "empty-state-text" }, "No critical planning risks detected. Everything is progressing smoothly!")
    ])
  ]);

  container.append(metricsGrid, middleRow, bottomRow);

  // Export Actions Bar
  const exportBar = el("div", { className: "export-actions-bar" }, [
    el("p", { className: "export-bar-label" }, "Export this plan:"),
    el("div", { className: "export-btn-group" }, [
      el("button", {
        type: "button",
        className: "btn btn-secondary btn-sm",
        title: "Download calendar file to add milestones to Google/Apple Calendar",
        onClick: () => {
          try {
            const icsContent = buildICS(event);
            const safeName = (event.title || "utsav").toLowerCase().replace(/[^a-z0-9]+/g, "-");
            downloadTextFile(icsContent, `${safeName}-timeline.ics`, "text/calendar");
            if (announce) announce("Calendar file downloaded.");
          } catch (err) {
            alert("Could not generate calendar file: " + err.message);
          }
        }
      }, [
        icon("calendar", "btn-icon"),
        "Download .ics"
      ]),
      el("button", {
        type: "button",
        className: "btn btn-secondary btn-sm",
        title: "Download a JSON backup of your full plan",
        onClick: () => {
          try {
            exportEventJSON(event);
            if (announce) announce("JSON backup downloaded.");
          } catch (err) {
            alert("Could not export backup: " + err.message);
          }
        }
      }, [
        icon("download", "btn-icon"),
        "Backup JSON"
      ]),
      el("button", {
        type: "button",
        className: "btn btn-secondary btn-sm",
        title: "Print or save as PDF",
        onClick: () => window.print()
      }, [
        icon("print", "btn-icon"),
        "Print / PDF"
      ])
    ])
  ]);
  container.appendChild(exportBar);

  return container;
}

/**
 * Helper to render an accessible SVG progress ring
 * @param {number} percent
 * @returns {SVGElement}
 */
function createProgressRingSvg(percent) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const wrapper = el("div", {
    className: "radial-ring-wrapper",
    role: "img",
    "aria-label": `Overall planning progress: ${percent} percent completed`
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("width", "90");
  svg.setAttribute("height", "90");
  svg.setAttribute("class", "progress-svg-circle");

  const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bgCircle.setAttribute("cx", "50");
  bgCircle.setAttribute("cy", "50");
  bgCircle.setAttribute("r", String(radius));
  bgCircle.setAttribute("fill", "transparent");
  bgCircle.setAttribute("stroke", "#EAD8D4");
  bgCircle.setAttribute("stroke-width", "8");

  const fgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  fgCircle.setAttribute("cx", "50");
  fgCircle.setAttribute("cy", "50");
  fgCircle.setAttribute("r", String(radius));
  fgCircle.setAttribute("fill", "transparent");
  fgCircle.setAttribute("stroke", "#6D2E46");
  fgCircle.setAttribute("stroke-width", "8");
  fgCircle.setAttribute("stroke-linecap", "round");
  fgCircle.setAttribute("stroke-dasharray", String(circumference));
  fgCircle.setAttribute("stroke-dashoffset", String(strokeDashoffset));
  fgCircle.setAttribute("transform", "rotate(-90 50 50)");

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", "50");
  text.setAttribute("y", "56");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "18");
  text.setAttribute("font-weight", "bold");
  text.setAttribute("fill", "#6D2E46");
  text.textContent = `${percent}%`;

  svg.append(bgCircle, fgCircle, text);
  wrapper.appendChild(svg);
  return wrapper;
}

/**
 * Helper to render stacked RSVP progress bar
 * @param {Object} attendance
 * @param {number} total
 * @returns {HTMLElement}
 */
function createRsvpProgressBar(attendance, total) {
  const safeTotal = Math.max(1, total);
  const confPct = Math.round((attendance.confirmed / safeTotal) * 100);
  const pendPct = Math.round((attendance.pending / safeTotal) * 100);
  const declPct = Math.round((attendance.declined / safeTotal) * 100);

  return el("div", {
    className: "stacked-rsvp-bar",
    role: "progressbar",
    "aria-label": `RSVP breakdown: ${attendance.confirmed} confirmed, ${attendance.pending} pending, ${attendance.declined} declined`,
    "aria-valuenow": confPct,
    "aria-valuemin": "0",
    "aria-valuemax": "100"
  }, [
    confPct > 0 ? el("div", { className: "rsvp-bar-segment is-confirmed", style: { width: `${confPct}%` }, title: `Confirmed: ${attendance.confirmed}` }) : null,
    pendPct > 0 ? el("div", { className: "rsvp-bar-segment is-pending", style: { width: `${pendPct}%` }, title: `Pending: ${attendance.pending}` }) : null,
    declPct > 0 ? el("div", { className: "rsvp-bar-segment is-declined", style: { width: `${declPct}%` }, title: `Declined: ${attendance.declined}` }) : null
  ]);
}

/**
 * Feasibility Band Badge
 * @param {string} band
 * @returns {HTMLElement}
 */
function createFeasibilityBandBadge(band) {
  const bandLabels = {
    comfortable: "Comfortable Budget",
    tight: "Tight Budget",
    short: "Budget Shortfall",
    unrealistic: "Severe Shortfall"
  };
  return el("span", { className: `band-chip band-${band}` }, bandLabels[band] || band);
}
