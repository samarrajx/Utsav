/**
 * step-intake.js - Step 1 Intake view orchestrator
 */

import { el, icon } from "../../dom.js";
import { fetchIntake } from "../../api.js";
import { navigate } from "../../router.js";
import { renderTypePicker } from "./step-basics.js";
import { createDetailInputs, buildIntakeForm } from "./step-details.js";

/**
 * Render the full intake step view
 * @param {Object} state
 * @param {Function} updateView
 * @returns {HTMLElement}
 */
export function renderIntakeStep(state, updateView) {
  const container = el("div", { className: "wizard-step-container" }, [
    el("div", { className: "wizard-header" }, [
      el("span", { className: "wizard-step-badge" }, "Step 1 of 3"),
      el("h2", { className: "wizard-title" }, "Plan a New Celebration"),
      el(
        "p",
        { className: "wizard-subtitle" },
        "Tell us about your event. We will analyze feasibility and build a deterministic roadmap."
      )
    ])
  ]);

  const inputs = createDetailInputs(state);

  const submitBtn = el(
    "button",
    {
      type: "submit",
      className: "btn btn-primary"
    },
    ["Check Feasibility & Continue", icon("arrowRight", "btn-icon")]
  );

  const typePicker = renderTypePicker(state, () => {
    inputs.dateInput.value = state.date;
    inputs.guestsInput.value = String(state.guests);
    inputs.budgetInput.value = String(state.budget);
    updateView();
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    state.title =
      inputs.titleInput.value.trim() ||
      `${state.type.charAt(0).toUpperCase() + state.type.slice(1)} in ${inputs.cityInput.value.trim() || "India"}`;
    state.date = inputs.dateInput.value;
    state.city = inputs.cityInput.value.trim() || "Mumbai";
    state.guests = Math.max(1, parseInt(inputs.guestsInput.value, 10) || 100);
    state.budget = Math.max(100, parseInt(inputs.budgetInput.value, 10) || 500000);
    state.currency = inputs.currencySelect.value;
    state.mustHaves = inputs.mustHavesText.value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = "Analyzing Details...";

    const intakeResult = await fetchIntake({
      type: state.type,
      title: state.title,
      date: state.date,
      city: state.city,
      countryCode: state.countryCode,
      currency: state.currency,
      budget: state.budget,
      guests: state.guests,
      mustHaves: state.mustHaves,
      language: state.language
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Check Feasibility & Continue →";

    if (
      intakeResult.ok &&
      intakeResult.data?.ready === false &&
      intakeResult.data.questions?.length > 0
    ) {
      state.questions = intakeResult.data.questions;
      state.step = "questions";
    } else {
      state.step = "feasibility";
    }
    updateView();
  };

  const form = buildIntakeForm(typePicker, inputs, submitBtn, handleSubmit, () =>
    navigate("#/events")
  );

  container.appendChild(form);
  return container;
}
