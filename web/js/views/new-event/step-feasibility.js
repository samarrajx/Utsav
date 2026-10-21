/**
 * step-feasibility.js - Step 3 Feasibility verdict and trade-offs
 */

import { el, icon } from "../../dom.js";
import { checkFeasibility } from "../../engine/feasibility.js";
import { formatCurrency } from "../../engine/money.js";

const BAND_CLASSES = {
  comfortable: "badge-success",
  tight: "badge-warning",
  short: "badge-danger",
  unrealistic: "badge-danger"
};

function createVerdictCard(state, feasibility) {
  const badgeClass = BAND_CLASSES[feasibility.band] || "badge-neutral";
  const iconName = feasibility.band === "comfortable" ? "check" : "sparkles";

  const verdictCard = el("div", { className: "feasibility-card card" }, [
    el("div", { className: "verdict-badge-row" }, [
      el("span", { className: `badge ${badgeClass}` }, [
        icon(iconName, "badge-icon"),
        feasibility.band.toUpperCase()
      ]),
      el(
        "span",
        { className: "verdict-ratio-text" },
        `Budget / Minimum Cost Ratio: ${feasibility.ratio}x`
      )
    ]),
    el("h3", { className: "verdict-title" }, feasibility.summary),
    el("div", { className: "verdict-metrics-grid" }, [
      el("div", { className: "metric-box" }, [
        el("span", { className: "metric-label" }, "Your Budget"),
        el("span", { className: "metric-val" }, formatCurrency(state.budget, state.currency))
      ]),
      el("div", { className: "metric-box" }, [
        el("span", { className: "metric-label" }, "Estimated Minimum Cost"),
        el(
          "span",
          { className: "metric-val" },
          formatCurrency(feasibility.minimumCost, state.currency)
        )
      ]),
      el("div", { className: "metric-box" }, [
        el("span", { className: "metric-label" }, "Comfortable Target"),
        el(
          "span",
          { className: "metric-val" },
          formatCurrency(feasibility.comfortableCost, state.currency)
        )
      ])
    ])
  ]);

  if (feasibility.tradeOffs && feasibility.tradeOffs.length > 0) {
    const tradeOffsCard = el(
      "div",
      { className: "tradeoffs-card card", style: { marginTop: "1rem" } },
      [
        el("h4", { className: "tradeoffs-title" }, "Calculated Trade-Off Suggestions:"),
        el(
          "ul",
          { className: "tradeoffs-list" },
          feasibility.tradeOffs.map((t) =>
            el("li", { className: "tradeoff-item" }, [
              icon("sparkles", "tradeoff-icon"),
              el("span", {}, t.detail)
            ])
          )
        )
      ]
    );
    verdictCard.appendChild(tradeOffsCard);
  }

  return verdictCard;
}

function createFeasibilityActions(state, updateView) {
  return el("div", { className: "wizard-form-actions", style: { marginTop: "1.5rem" } }, [
    el(
      "button",
      {
        type: "button",
        className: "btn btn-secondary",
        onClick: () => {
          state.step = "intake";
          updateView();
        }
      },
      "← Adjust Inputs"
    ),
    el(
      "button",
      {
        type: "button",
        className: "btn btn-primary",
        onClick: () => {
          state.step = "generating";
          updateView();
        }
      },
      [icon("sparkles", "btn-icon"), "Generate Celebration Plan ✦"]
    )
  ]);
}

/**
 * Render the feasibility step view
 * @param {Object} state
 * @param {Function} updateView
 * @returns {HTMLElement}
 */
export function renderFeasibilityStep(state, updateView) {
  const feasibility = checkFeasibility({
    type: state.type,
    budget: state.budget,
    currency: state.currency,
    guests: state.guests,
    city: state.city,
    date: state.date,
    countryCode: state.countryCode
  });
  state.feasibility = feasibility;

  const header = el("div", { className: "wizard-header" }, [
    el("span", { className: "wizard-step-badge" }, "Step 2 of 3"),
    el("h2", { className: "wizard-title" }, "Feasibility Assessment"),
    el(
      "p",
      { className: "wizard-subtitle" },
      "Grounded in market benchmarks for catering, venue, and fixed supplier costs."
    )
  ]);

  return el("div", { className: "wizard-step-container" }, [
    header,
    createVerdictCard(state, feasibility),
    createFeasibilityActions(state, updateView)
  ]);
}
