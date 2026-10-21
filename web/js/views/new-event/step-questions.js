/**
 * step-questions.js - Step 2 Clarification questions view
 */

import { el, icon } from "../../dom.js";

function createQuestionBlock(q, state) {
  const qGroup = el("div", { className: "question-block" }, [
    el("h3", { className: "question-title" }, q.question),
    el("p", { className: "question-hint" }, q.whyNeeded)
  ]);

  const input = el("input", {
    type: "text",
    className: "form-input",
    placeholder: "Type your answer...",
    value: state.questionAnswers[q.id] || "",
    onChange: (e) => {
      state.questionAnswers[q.id] = e.target.value.trim();
    }
  });

  if (q.options && Array.isArray(q.options) && q.options.length > 0) {
    const optionChips = el(
      "div",
      { className: "question-chips" },
      q.options.map((opt) =>
        el(
          "button",
          {
            type: "button",
            className: "chip-option-btn",
            onClick: () => {
              input.value = opt;
              state.questionAnswers[q.id] = opt;
            }
          },
          opt
        )
      )
    );
    qGroup.appendChild(optionChips);
  }

  qGroup.appendChild(input);
  return qGroup;
}

function handleSaveQuestionsAndProceed(state, updateView) {
  const extraAnswers = Object.entries(state.questionAnswers)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
  if (extraAnswers) {
    state.mustHaves = `${state.mustHaves}; ${extraAnswers}`.trim();
  }
  state.step = "feasibility";
  updateView();
}

function createQuestionActions(state, updateView) {
  return el("div", { className: "wizard-form-actions", style: { marginTop: "1.5rem" } }, [
    el(
      "button",
      {
        type: "button",
        className: "btn btn-secondary",
        onClick: () => {
          state.step = "feasibility";
          updateView();
        }
      },
      "Skip to Feasibility"
    ),
    el(
      "button",
      {
        type: "button",
        className: "btn btn-primary",
        onClick: () => handleSaveQuestionsAndProceed(state, updateView)
      },
      ["Continue to Feasibility", icon("arrowRight", "btn-icon")]
    )
  ]);
}

/**
 * Render the clarification questions step
 * @param {Object} state
 * @param {Function} updateView
 * @returns {HTMLElement}
 */
export function renderQuestionsStep(state, updateView) {
  const header = el("div", { className: "wizard-header" }, [
    el("span", { className: "wizard-step-badge" }, "Clarification"),
    el("h2", { className: "wizard-title" }, "A few quick questions to sharpen your plan"),
    el(
      "p",
      { className: "wizard-subtitle" },
      "The AI noticed missing details that will refine your vendor budget and timeline."
    )
  ]);

  const questionsList = el(
    "div",
    { className: "questions-card card" },
    state.questions.map((q) => createQuestionBlock(q, state))
  );

  return el("div", { className: "wizard-step-container" }, [
    header,
    questionsList,
    createQuestionActions(state, updateView)
  ]);
}
