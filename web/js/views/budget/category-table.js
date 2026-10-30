/**
 * category-table.js - Category budget breakdown table with overspend indicators
 */

import { el, icon } from "../../dom.js";
import { formatCurrency, formatCompactCurrency } from "../../engine/money.js";
import { CATEGORY_COLORS } from "./constants.js";

function createCategoryTableRow(cat, idx, currency) {
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
    el(
      "td",
      { className: `text-right font-mono ${catOverspent ? "text-danger font-bold" : ""}` },
      formatCurrency(catRemaining, currency)
    ),
    el("td", {}, [
      catOverspent
        ? el("span", { className: "badge-status is-danger" }, [
            icon("alertTriangle"),
            ` Over by ${formatCompactCurrency(Math.abs(catRemaining), currency)}`
          ])
        : el("span", { className: "badge-status is-ok" }, [icon("checkCircle"), " On track"])
    ])
  ]);
}

/**
 * Render category breakdown table card
 * @param {Array<Object>} categories
 * @param {string} currency
 * @returns {HTMLElement}
 */
export function createCategoryTableCard(categories, currency) {
  return el("div", { className: "card category-table-card" }, [
    el("h3", { className: "card-title-sm" }, "Category Breakdown & Overspend Status"),
    el("div", { className: "table-responsive-wrapper" }, [
      el(
        "table",
        {
          className: "data-table budget-table",
          "aria-label": "Category budget allocations and expenses"
        },
        [
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
          el(
            "tbody",
            {},
            categories.map((cat, idx) => createCategoryTableRow(cat, idx, currency))
          )
        ]
      )
    ])
  ]);
}
