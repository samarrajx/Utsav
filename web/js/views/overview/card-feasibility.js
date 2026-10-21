/**
 * card-feasibility.js - Overview feasibility status and trade-offs card
 */

import { el, icon } from "../../dom.js";

function createFeasibilityBandBadge(band) {
  const bandLabels = {
    comfortable: "Comfortable Budget",
    tight: "Tight Budget",
    short: "Budget Shortfall",
    unrealistic: "Severe Shortfall"
  };
  return el("span", { className: `band-chip band-${band}` }, bandLabels[band] || band);
}

export function renderFeasibilityCard(event) {
  return el("div", { className: "card feasibility-card" }, [
    el("div", { className: "section-header-row" }, [
      el("h3", { className: "overview-section-title" }, [
        icon("sparkles"),
        "Budget & Headcount Feasibility"
      ]),
      createFeasibilityBandBadge(event.feasibility?.band || "comfortable")
    ]),
    el(
      "p",
      { className: "feasibility-summary-text" },
      event.feasibility?.summary || "Feasibility assessment is currently healthy."
    ),
    event.feasibility?.tradeOffs?.length > 0
      ? el("div", { className: "feasibility-tradeoffs-list" }, [
          el("h5", { className: "tradeoffs-header" }, "Recommended Trade-offs:"),
          el(
            "ul",
            {},
            event.feasibility.tradeOffs.map((to) =>
              el("li", {}, [el("strong", {}, `${to.category}: `), to.detail])
            )
          )
        ])
      : null
  ]);
}
