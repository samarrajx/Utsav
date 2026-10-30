/**
 * budget-tab.js - Budget breakdown, SVG donut chart, and expense tracker orchestrator
 *
 * Decomposed into:
 * - budget/donut-chart.js (pure SVG donut chart and legend)
 * - budget/category-table.js (category allocation table and overspend badges)
 * - budget/expense-logger.js (itemized expense logger card and add form)
 */

import { el, icon } from "../dom.js";
import { formatCurrency, formatCompactCurrency } from "../engine/money.js";
import { createDonutChartSvg, createChartLegend } from "./budget/donut-chart.js";
import { createCategoryTableCard } from "./budget/category-table.js";
import { createExpensesCard, createAddExpenseForm } from "./budget/expense-logger.js";

function createBudgetKpiCard(totalBudget, totalSpent, currency) {
  const remaining = totalBudget - totalSpent;
  const isOverspent = totalSpent > totalBudget;
  const spentPercent =
    totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  return el("div", { className: "card budget-kpi-card" }, [
    el("div", { className: "kpi-metrics-row" }, [
      el("div", { className: "kpi-metric-block" }, [
        el("span", { className: "kpi-label" }, "Total Budget"),
        el("span", { className: "kpi-amount" }, formatCurrency(totalBudget, currency))
      ]),
      el("div", { className: "kpi-metric-block" }, [
        el("span", { className: "kpi-label" }, "Total Spent"),
        el(
          "span",
          {
            className: `kpi-amount ${isOverspent ? "text-danger" : "text-success"}`
          },
          formatCurrency(totalSpent, currency)
        )
      ]),
      el("div", { className: "kpi-metric-block" }, [
        el("span", { className: "kpi-label" }, isOverspent ? "Over Budget By" : "Remaining Funds"),
        el(
          "span",
          {
            className: `kpi-amount ${isOverspent ? "text-danger" : "text-primary"}`
          },
          formatCurrency(Math.abs(remaining), currency)
        )
      ])
    ]),
    el("div", { className: "budget-meter-wrap" }, [
      el(
        "div",
        {
          className: "progress-bar-track",
          role: "progressbar",
          "aria-valuenow": spentPercent,
          "aria-valuemin": "0",
          "aria-valuemax": "100",
          "aria-label": "Total budget spend progress"
        },
        [
          el("div", {
            className: `progress-bar-fill ${isOverspent ? "is-overspent" : ""}`,
            style: { width: `${spentPercent}%` }
          })
        ]
      ),
      el("div", { className: "meter-labels" }, [
        el("span", {}, `${spentPercent}% spent`),
        isOverspent
          ? el("span", { className: "badge-danger" }, "⚠️ Budget Exceeded")
          : el("span", {}, `${formatCompactCurrency(Math.max(0, remaining), currency)} remaining`)
      ])
    ])
  ]);
}

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

  function renderView() {
    container.replaceChildren();
    recalculateCategorySpend();

    const totalSpent = event.expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const summaryCard = createBudgetKpiCard(totalBudget, totalSpent, currency);

    const chartCard = el("div", { className: "card budget-chart-card" }, [
      el("h3", { className: "card-title-sm" }, [icon("wallet"), "Budget Allocation by Category"]),
      el("div", { className: "donut-chart-layout" }, [
        createDonutChartSvg(categories, totalBudget, currency),
        createChartLegend(categories)
      ])
    ]);

    const tableCard = createCategoryTableCard(categories, currency);
    const context = { onUpdate, renderView, announce, event };
    const expensesCard = createExpensesCard(event.expenses, categories, currency, context);
    const addExpenseForm = createAddExpenseForm(categories, currency, context);

    container.append(summaryCard, chartCard, tableCard, expensesCard, addExpenseForm);
  }

  renderView();
  return container;
}
