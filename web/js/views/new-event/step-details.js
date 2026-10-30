/**
 * step-details.js - Form inputs and field groups for event details
 */

import { el } from "../../dom.js";

function createCurrencySelect(currency) {
  const currencies = [
    { code: "INR", label: "₹ INR" },
    { code: "USD", label: "$ USD" },
    { code: "EUR", label: "€ EUR" },
    { code: "GBP", label: "£ GBP" },
    { code: "AED", label: "AED" }
  ];
  return el(
    "select",
    {
      id: "event-currency",
      className: "form-input form-select",
      style: { width: "90px" }
    },
    currencies.map((c) =>
      el("option", { value: c.code, selected: currency === c.code ? "selected" : null }, c.label)
    )
  );
}

/**
 * Creates form input controls for event details
 * @param {Object} state
 * @returns {Object} map of input elements
 */
export function createDetailInputs(state) {
  const titleInput = el("input", {
    type: "text",
    id: "event-title",
    className: "form-input",
    placeholder: "e.g., Aarav & Diya Wedding",
    value: state.title
  });

  const dateInput = el("input", {
    type: "date",
    id: "event-date",
    className: "form-input",
    required: "required",
    value: state.date
  });

  const cityInput = el("input", {
    type: "text",
    id: "event-city",
    className: "form-input",
    placeholder: "e.g., Jaipur, Mumbai, Delhi",
    required: "required",
    value: state.city
  });

  const guestsInput = el("input", {
    type: "number",
    id: "event-guests",
    className: "form-input",
    min: "5",
    max: "10000",
    required: "required",
    value: String(state.guests)
  });

  const budgetInput = el("input", {
    type: "number",
    id: "event-budget",
    className: "form-input",
    min: "1000",
    step: "10000",
    required: "required",
    value: String(state.budget)
  });

  const currencySelect = createCurrencySelect(state.currency);

  const mustHavesText = el("textarea", {
    id: "event-must-haves",
    className: "form-input form-textarea",
    rows: "3",
    placeholder:
      "e.g. Royal Rajasthani theme, pure vegetarian catering, separate cocktail evening...",
    value: state.mustHaves
  });

  return {
    titleInput,
    dateInput,
    cityInput,
    guestsInput,
    budgetInput,
    currencySelect,
    mustHavesText
  };
}

/**
 * Builds the form layout container using the input controls
 * @param {HTMLElement} typePicker
 * @param {Object} inputs
 * @param {HTMLElement} submitBtn
 * @param {Function} onSubmit
 * @param {Function} onCancel
 * @returns {HTMLFormElement}
 */
function buildTitleAndDateGrid(inputs) {
  return el("div", { className: "form-grid-2" }, [
    el("div", { className: "form-group" }, [
      el("label", { htmlFor: "event-title", className: "form-label" }, "Event Title (Optional)"),
      inputs.titleInput
    ]),
    el("div", { className: "form-group" }, [
      el("label", { htmlFor: "event-date", className: "form-label" }, "Event Date *"),
      inputs.dateInput
    ])
  ]);
}

function buildLocationAndBudgetGrid(inputs) {
  return el("div", { className: "form-grid-3" }, [
    el("div", { className: "form-group" }, [
      el("label", { htmlFor: "event-city", className: "form-label" }, "Destination / City *"),
      inputs.cityInput
    ]),
    el("div", { className: "form-group" }, [
      el("label", { htmlFor: "event-guests", className: "form-label" }, "Target Guests *"),
      inputs.guestsInput
    ]),
    el("div", { className: "form-group" }, [
      el(
        "label",
        { htmlFor: "event-budget", className: "form-label" },
        "Target Budget & Currency *"
      ),
      el("div", { style: { display: "flex", gap: "0.5rem" } }, [
        inputs.budgetInput,
        inputs.currencySelect
      ])
    ])
  ]);
}

export function buildIntakeForm(typePicker, inputs, submitBtn, onSubmit, onCancel) {
  return el(
    "form",
    {
      className: "wizard-form card",
      onSubmit
    },
    [
      el("div", { className: "form-section" }, [
        el("label", { className: "form-label" }, "1. Celebration Type"),
        typePicker
      ]),
      buildTitleAndDateGrid(inputs),
      buildLocationAndBudgetGrid(inputs),
      el("div", { className: "form-group" }, [
        el(
          "label",
          { htmlFor: "event-must-haves", className: "form-label" },
          "Priorities, Vibes & Must-Haves (Optional)"
        ),
        inputs.mustHavesText,
        el(
          "p",
          { className: "form-hint" },
          "Mention any specific requirements, decor themes, food restrictions, or rituals."
        )
      ]),
      el("div", { className: "wizard-form-actions" }, [
        el(
          "button",
          {
            type: "button",
            className: "btn btn-secondary",
            onClick: onCancel
          },
          "Cancel"
        ),
        submitBtn
      ])
    ]
  );
}
