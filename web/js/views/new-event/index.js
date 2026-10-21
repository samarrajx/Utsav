/**
 * index.js - Orchestration entrypoint for the new event wizard
 */

import { el, clearElement } from "../../dom.js";
import { getSettings } from "../../storage.js";
import { createWizardState } from "./state.js";
import { renderIntakeStep } from "./step-intake.js";
import { renderQuestionsStep } from "./step-questions.js";
import { renderFeasibilityStep } from "./step-feasibility.js";
import { renderGeneratingStep } from "./step-generate.js";

/**
 * Render the complete New Event flow container
 * @param {Object} [options]
 * @param {Function} [options.onComplete]
 * @returns {HTMLElement}
 */
export function renderNewEventFlow({ onComplete } = {}) {
  const settings = getSettings();
  const root = el("div", { className: "new-event-wizard" });
  const state = createWizardState(settings);

  function updateView() {
    clearElement(root);

    if (state.step === "intake") {
      root.appendChild(renderIntakeStep(state, updateView));
    } else if (state.step === "questions") {
      root.appendChild(renderQuestionsStep(state, updateView));
    } else if (state.step === "feasibility") {
      root.appendChild(renderFeasibilityStep(state, updateView));
    } else if (state.step === "generating") {
      root.appendChild(renderGeneratingStep(state, onComplete));
    }
  }

  updateView();
  return root;
}
