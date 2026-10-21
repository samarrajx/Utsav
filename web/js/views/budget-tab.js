/**
 * budget-tab.js - Budget breakdown, SVG donut chart, and expense tracker
 *
 * Implements accessible data table alongside pure SVG donut chart,
 * planned vs actual category allocations, overspend detection, and expense logging.
 */

import { el, icon } from "../dom.js";
import { formatCurrency, formatCompactCurrency } from "../engine/money.js";
import { formatDisplayDate } from "../engine/dates.js";

const CATEGORY_COLORS = [
  "#6D2E46", // Primary maroon
  "#D98FA3", // Rose
  "#2E6B4E", // Emerald green
  "#D48B38", // Warm amber
  "#5C6B73", // Slate
  "#9C4F70", // Deep rose
  "#4A6B82", // Ocean
  "#8C5E58"  // Earth
];

/**
 * Render the Budget Tab Panel
 *
 * @param {Object} event
 * @param {Object} options
 * @param {Function} options.onUpdate
 * @param {Function} [options.announce]
 * @returns {HTMLElement}
 */
export function renderBudgetTab(event, { onUpdate, announce }) {
  const container = el("div", { className: "tabpanel-budget" });

  const currency = event.currency || "INR";
  const totalBudget = Number(event.budget?.total) || 0;
  const categories = Array.isArray(event.budget?.categories) ? event.budget.categories : [];
  if (!Array.isArray(event.expenses)) event.expenses = [];

  function recalculateCategorySpend() {
    const spendMap = new Map();
    event.expenses.forEach((exp) => {
      const catId = exp.categoryId || "other";
      const amt = Number(exp.amount) || 0;
      spendMap.set(catId, (spendMap.get(catId) || 0) + amt);
    });

    categories.forEach((cat) => {
      cat.spent = spendMap.get(cat.id) || 0;
    });
  }

  recalculateCategorySpend();

  function renderView() {
    container.replaceChildren();
    recalculateCategorySpend();

    const totalSpent = event.expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const remaining = totalBudget - totalSpent;
    const isOverspent = totalSpent > totalBudget;
    const spentPercent = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

    // 1. Budget Summary KPI Header
    const summaryCard = el("div", { className: "card budget-kpi-card" }, [
      el("div", { className: "kpi-metrics-row" }, [
        el("div", { className: "kpi-metric-block" }, [
          el("span", { className: "kpi-label" }, "Total Budget"),
          el("span", { className: "kpi-amount" }, formatCurrency(totalBudget, currency))
        ]),
        el("div", { className: "kpi-metric-block" }, [
          el("span", { className: "kpi-label" }, "Total Spent"),
          el("span", {
            className: `kpi-amount ${isOverspent ? "text-danger" : "text-success"}`
          }, formatCurrency(totalSpent, currency))
        ]),
        el("div", { className: "kpi-metric-block" }, [
          el("span", { className: "kpi-label" }, isOverspent ? "Over Budget By" : "Remaining Funds"),
          el("span", {
            className: `kpi-amount ${isOverspent ? "text-danger" : "text-primary"}`
          }, formatCurrency(Math.abs(remaining), currency))
        ])
      ]),
      // Overall Spend Progress
      el("div", { className: "budget-meter-wrap" }, [
        el("div", {
          className: "progress-bar-track",
          role: "progressbar",
          "aria-valuenow": spentPercent,
          "aria-valuemin": "0",
          "aria-valuemax": "100",
          "aria-label": "Total budget spend progress"
        }, [
          el("div", {
            className: `progress-bar-fill ${isOverspent ? "is-overspent" : ""}`,
            style: { width: `${spentPercent}%` }
          })
        ]),
        el("div", { className: "meter-labels" }, [
          el("span", {}, `${spentPercent}% spent`),
          isOverspent
            ? el("span", { className: "badge-danger" }, "⚠️ Budget Exceeded")
            : el("span", {}, `${formatCompactCurrency(Math.max(0, remaining), currency)} remaining`)
        ])
      ])
    ]);

    // 2. Donut Chart & Category Legend Card
    const chartCard = el("div", { className: "card budget-chart-card" }, [
      el("h3", { className: "card-title-sm" }, [icon("wallet"), "Budget Allocation by Category"]),
      el("div", { className: "donut-chart-layout" }, [
        createDonutChartSvg(categories, totalBudget, currency),
        createChartLegend(categories)
      ])
    ]);

    // 3. Accessible Category Allocation Table
    const tableCard = el("div", { className: "card category-table-card" }, [
      el("h3", { className: "card-title-sm" }, "Category Breakdown & Overspend Status"),
      el("div", { className: "table-responsive-wrapper" }, [
        el("table", { className: "data-table budget-table", "aria-label": "Category budget allocations and expenses" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { scope: "col" }, "Category"),
              el("th", { scope: "col", className: "text-right" }, "Weight"),
              el("th", { scope: "col", className: "text-right" }, "Planned"),
              el("th", { scope: "col", className: "text-right" }, "Spent"),
              el("th", { scope: "col", className: "text-right" }, "Remaining"),
              el("th", { scope: "col" }, "Status")
            ])
          ]),
          el("tbody", {}, categories.map((cat, idx) => {
            const planned = Number(cat.planned) || 0;
            const spent = Number(cat.spent) || 0;
            const catRemaining = planned - spent;
            const catOverspent = spent > planned;
            const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

            return el("tr", {}, [
              el("td", { className: "cat-name-cell" }, [
                el("span", { className: "cat-color-dot", style: { backgroundColor: color } }),
                cat.name || cat.id
              ]),
              el("td", { className: "text-right font-mono" }, `${cat.weight || 0}%`),
              el("td", { className: "text-right font-mono" }, formatCurrency(planned, currency)),
              el("td", { className: "text-right font-mono" }, formatCurrency(spent, currency)),
              el("td", {
                className: `text-right font-mono ${catOverspent ? "text-danger font-bold" : ""}`
              }, formatCurrency(catRemaining, currency)),
              el("td", {}, [
                catOverspent
                  ? el("span", { className: "badge-status is-danger" }, [
                    icon("alertTriangle"),
                    ` Over by ${formatCompactCurrency(Math.abs(catRemaining), currency)}`
                  ])
                  : el("span", { className: "badge-status is-ok" }, [
                    icon("checkCircle"),
                    " On track"
                  ])
              ])
            ]);
          }))
        ])
      ])
    ]);

    // 4. Expenses Logger & Table
    const expensesCard = el("div", { className: "card expenses-logger-card" }, [
      el("div", { className: "section-header-row" }, [
        el("h3", { className: "card-title-sm" }, [icon("checklist"), "Recorded Expenses"]),
        el("span", { className: "counter-chip" }, `${event.expenses.length} logged`)
      ]),
      event.expenses.length > 0 ? el("div", { className: "table-responsive-wrapper" }, [
        el("table", { className: "data-table expenses-table", "aria-label": "Itemized recorded expenses" }, [
          el("thead", {}, [
            el("tr", {}, [
              el("th", { scope: "col" }, "Date"),
              el("th", { scope: "col" }, "Description"),
              el("th", { scope: "col" }, "Category"),
              el("th", { scope: "col", className: "text-right" }, "Amount"),
              el("th", { scope: "col", className: "text-right" }, "Action")
            ])
          ]),
          el("tbody", {}, event.expenses.map((exp) => {
            const cat = categories.find((c) => c.id === exp.categoryId);
            return el("tr", {}, [
              el("td", { className: "text-muted" }, exp.date ? formatDisplayDate(exp.date) : "—"),
              el("td", { className: "font-semibold" }, exp.label),
              el("td", {}, cat ? cat.name : (exp.categoryId || "General")),
              el("td", { className: "text-right font-mono font-bold" }, formatCurrency(exp.amount, currency)),
              el("td", { className: "text-right" }, [
                el("button", {
                  type: "button",
                  className: "btn-icon-subtle btn-delete-expense",
                  "aria-label": `Delete expense "${exp.label}"`,
                  onClick: () => {
                    const idx = event.expenses.indexOf(exp);
                    if (idx >= 0) {
                      event.expenses.splice(idx, 1);
                      onUpdate(event);
                      renderView();
                      announce?.(`Expense "${exp.label}" deleted.`);
                    }
                  }
                }, [icon("trash")])
              ])
            ]);
          }))
        ])
      ]) : el("p", { className: "empty-state-text" }, "No individual expenses recorded yet. Use the form below to track payments.")
    ]);

    // 5. Add Expense Form
    const addExpenseForm = el("form", {
      className: "card add-expense-form",
      onSubmit: (e) => {
        e.preventDefault();
        const descInput = addExpenseForm.querySelector("#exp-desc");
        const catSelect = addExpenseForm.querySelector("#exp-category");
        const amtInput = addExpenseForm.querySelector("#exp-amount");
        const dateInput = addExpenseForm.querySelector("#exp-date");

        const label = descInput.value.trim();
        const amount = Number(amtInput.value);
        if (!label || isNaN(amount) || amount <= 0) return;

        const newExpense = {
          id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          categoryId: catSelect.value,
          label,
          amount,
          date: dateInput.value || new Date().toISOString().split("T")[0]
        };

        event.expenses.push(newExpense);
        descInput.value = "";
        amtInput.value = "";

        onUpdate(event);
        renderView();
        announce?.(`Recorded expense: ${formatCurrency(amount, currency)} for ${label}.`);
      }
    }, [
      el("h3", { className: "card-title-sm" }, [icon("plus"), "Log New Expense"]),
      el("div", { className: "form-row-grid" }, [
        el("div", { className: "form-group flex-2" }, [
          el("label", { htmlFor: "exp-desc", className: "form-label" }, "Expense Description"),
          el("input", {
            id: "exp-desc",
            type: "text",
            required: true,
            className: "form-input",
            placeholder: "e.g., Venue booking advance payment"
          })
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "exp-category", className: "form-label" }, "Category"),
          el("select", { id: "exp-category", className: "form-input" },
            categories.map((c) => el("option", { value: c.id }, c.name))
          )
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "exp-amount", className: "form-label" }, `Amount (${currency})`),
          el("input", {
            id: "exp-amount",
            type: "number",
            min: "1",
            step: "any",
            required: true,
            className: "form-input",
            placeholder: "50000"
          })
        ]),
        el("div", { className: "form-group flex-1" }, [
          el("label", { htmlFor: "exp-date", className: "form-label" }, "Payment Date"),
          el("input", {
            id: "exp-date",
            type: "date",
            className: "form-input",
            value: new Date().toISOString().split("T")[0]
          })
        ])
      ]),
      el("div", { className: "form-actions-right" }, [
        el("button", { type: "submit", className: "btn btn-primary" }, [icon("plus"), "Record Expense"])
      ])
    ]);

    container.append(summaryCard, chartCard, tableCard, expensesCard, addExpenseForm);
  }

  renderView();
  return container;
}

/**
 * Pure SVG Donut Chart representing category allocation weights
 * @param {Array<Object>} categories
 * @param {number} totalBudget
 * @param {string} currency
 * @returns {HTMLElement}
 */
function createDonutChartSvg(categories, totalBudget, currency) {
  const size = 200;
  const strokeWidth = 28;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  const wrapper = el("div", {
    className: "donut-svg-wrapper",
    role: "img",
    "aria-label": `Donut chart showing budget allocation of ${formatCurrency(totalBudget, currency)} across ${categories.length} categories`
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("width", "180");
  svg.setAttribute("height", "180");
  svg.setAttribute("class", "donut-svg");

  let accumulatedPercent = 0;

  categories.forEach((cat, idx) => {
    const weight = Number(cat.weight) || 0;
    if (weight <= 0) return;

    const strokeDasharray = `${(weight / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "100");
    circle.setAttribute("cy", "100");
    circle.setAttribute("r", String(radius));
    circle.setAttribute("fill", "transparent");
    circle.setAttribute("stroke", color);
    circle.setAttribute("stroke-width", String(strokeWidth));
    circle.setAttribute("stroke-dasharray", strokeDasharray);
    circle.setAttribute("stroke-dashoffset", String(strokeDashoffset));
    circle.setAttribute("transform", "rotate(-90 100 100)");

    const titleNode = document.createElementNS("http://www.w3.org/2000/svg", "title");
    titleNode.textContent = `${cat.name}: ${weight}% (${formatCurrency(cat.planned, currency)})`;
    circle.appendChild(titleNode);

    svg.appendChild(circle);
    accumulatedPercent += weight;
  });

  // Inner Center text
  const textGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  textGroup.setAttribute("text-anchor", "middle");

  const centerSubtext = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerSubtext.setAttribute("x", "100");
  centerSubtext.setAttribute("y", "93");
  centerSubtext.setAttribute("font-size", "11");
  centerSubtext.setAttribute("fill", "#665057");
  centerSubtext.textContent = "TOTAL";

  const centerAmount = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerAmount.setAttribute("x", "100");
  centerAmount.setAttribute("y", "112");
  centerAmount.setAttribute("font-size", "14");
  centerAmount.setAttribute("font-weight", "bold");
  centerAmount.setAttribute("fill", "#6D2E46");
  centerAmount.textContent = formatCompactCurrency(totalBudget, currency);

  textGroup.append(centerSubtext, centerAmount);
  svg.appendChild(textGroup);

  wrapper.appendChild(svg);
  return wrapper;
}

/**
 * Legend beside donut chart
 * @param {Array<Object>} categories
 * @returns {HTMLElement}
 */
function createChartLegend(categories) {
  return el("div", { className: "donut-legend-grid", "aria-hidden": "true" },
    categories.map((cat, idx) => {
      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
      return el("div", { className: "donut-legend-item" }, [
        el("span", { className: "legend-dot", style: { backgroundColor: color } }),
        el("span", { className: "legend-name" }, cat.name),
        el("span", { className: "legend-val font-mono" }, `${cat.weight}%`)
      ]);
    })
  );
}
