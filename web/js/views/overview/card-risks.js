/**
 * card-risks.js - Overview AI critic audit and risks card
 */

import { el, icon } from "../../dom.js";
import { fetchCritique } from "../../api.js";

/**
 * Render the overview risk audit card
 * @param {Object} event
 * @param {Object} options
 * @param {Function} options.onUpdate
 * @param {Function} [options.announce]
 * @returns {HTMLElement}
 */
export function renderRisksCard(event, { onUpdate, announce }) {
  const handleReaudit = async (e) => {
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
  };

  return el("div", { className: "card critic-card" }, [
    el("div", { className: "section-header-row" }, [
      el("h3", { className: "overview-section-title" }, [
        icon("alertTriangle"),
        "Event Readiness & Risks"
      ]),
      el("div", { style: { display: "flex", alignItems: "center", gap: "0.75rem" } }, [
        el(
          "span",
          { className: "risk-count-badge" },
          `${event.critique?.risks?.length || 0} risks identified`
        ),
        el(
          "button",
          {
            type: "button",
            className: "btn-text-link btn-reaudit-critic",
            onClick: handleReaudit
          },
          "Re-Audit Plan →"
        )
      ])
    ]),
    event.critique?.risks?.length > 0
      ? el(
          "div",
          { className: "critic-risks-list" },
          event.critique.risks.map((risk) =>
            el("div", { className: `critic-risk-item severity-${risk.severity || "medium"}` }, [
              el("div", { className: "risk-item-header" }, [
                el(
                  "span",
                  { className: `badge-severity badge-${risk.severity || "medium"}` },
                  (risk.severity || "medium").toUpperCase()
                ),
                el("strong", { className: "risk-title" }, risk.title)
              ]),
              el("p", { className: "risk-detail" }, risk.detail),
              risk.suggestedFix
                ? el("p", { className: "risk-fix" }, [
                    el("span", { className: "fix-label" }, "Suggested Fix: "),
                    risk.suggestedFix
                  ])
                : null
            ])
          )
        )
      : el(
          "p",
          { className: "empty-state-text" },
          "No critical planning risks detected. Everything is progressing smoothly!"
        )
  ]);
}
