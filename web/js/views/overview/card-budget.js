/**
 * card-budget.js - Overview total budget metric card
 */

import { el, icon } from "../../dom.js";
import { formatCompactCurrency } from "../../engine/money.js";

export function renderBudgetCard(event, onNavigateTab) {
  const totalBudget = Number(event.budget?.total) || 0;
  const expenses = Array.isArray(event.expenses) ? event.expenses : [];
  const totalSpent = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  const budgetSpentPercent =
    totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  return el("div", { className: "card metric-card" }, [
    el("div", { className: "metric-card-header" }, [
      icon("wallet", "metric-icon"),
      el("span", { className: "metric-label" }, "Total Budget")
    ]),
    el("div", { className: "metric-value" }, formatCompactCurrency(totalBudget, event.currency)),
    el("div", { className: "metric-subtext" }, [
      el(
        "span",
        { style: { color: totalSpent > totalBudget ? "#C93B2B" : "#2E6B4E", fontWeight: "600" } },
        formatCompactCurrency(totalSpent, event.currency)
      ),
      ` spent (${budgetSpentPercent}%) • `,
      el(
        "span",
        { style: { color: "#665057" } },
        `${formatCompactCurrency(remainingBudget, event.currency)} left`
      )
    ]),
    el(
      "div",
      {
        className: "progress-bar-track",
        role: "progressbar",
        "aria-valuenow": budgetSpentPercent,
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-label": "Budget spent percentage"
      },
      [
        el("div", {
          className: `progress-bar-fill ${totalSpent > totalBudget ? "is-overspent" : ""}`,
          style: { width: `${budgetSpentPercent}%` }
        })
      ]
    ),
    el("div", { className: "card-action-link" }, [
      el(
        "button",
        {
          type: "button",
          className: "btn-text-link",
          onClick: () => onNavigateTab("budget")
        },
        "View Budget Breakdown →"
      )
    ])
  ]);
}
