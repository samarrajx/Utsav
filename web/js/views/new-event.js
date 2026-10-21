/**
 * new-event.js - Multi-step New Event intake, feasibility check, and parallel generation
 *
 * Implements:
 * 1. Smart intake wizard (type, date, city, guests, budget, must-haves)
 * 2. Follow-up clarification questions if context is incomplete
 * 3. Real-time deterministic feasibility verdict screen with trade-offs
 * 4. Parallel plan generation (core, vendors, ideas) with skeleton loaders
 * 5. Instant fallback to baseline.js if the API is unreachable or times out
 */

import { el, icon, clearElement } from "../dom.js";
import { getSettings, saveEvent, setActiveEventId } from "../storage.js";
import { checkFeasibility } from "../engine/feasibility.js";
import { generateBaselinePlan } from "../engine/baseline.js";
import { formatCurrency } from "../engine/money.js";
import { addWeeks, toISODateString } from "../engine/dates.js";
import { fetchIntake, fetchPlanSection, fetchCritique, getPlanAbortSignal } from "../api.js";
import { navigate } from "../router.js";

/**
 * Render the complete New Event flow container
 * @param {Object} options
 * @param {Function} [options.onComplete]
 * @returns {HTMLElement}
 */
export function renderNewEventFlow({ onComplete } = {}) {
  const settings = getSettings();
  const root = el("div", { className: "new-event-wizard" });

  // Wizard state
  const state = {
    step: "intake", // 'intake' | 'questions' | 'feasibility' | 'generating'
    type: "wedding",
    title: "",
    date: addWeeks(toISODateString(new Date()), 24),
    city: "Jaipur",
    countryCode: settings.countryCode || "IN",
    currency: settings.currency || "INR",
    budget: 1200000,
    guests: 150,
    mustHaves: "",
    language: settings.language || "en",
    questions: [],
    questionAnswers: {},
    feasibility: null
  };

  function updateView() {
    clearElement(root);

    if (state.step === "intake") {
      root.appendChild(renderIntakeStep());
    } else if (state.step === "questions") {
      root.appendChild(renderQuestionsStep());
    } else if (state.step === "feasibility") {
      root.appendChild(renderFeasibilityStep());
    } else if (state.step === "generating") {
      root.appendChild(renderGeneratingStep());
    }
  }

  // ==========================================================================
  // Step 1: Intake Form
  // ==========================================================================
  function renderIntakeStep() {
    const container = el("div", { className: "wizard-step-container" }, [
      el("div", { className: "wizard-header" }, [
        el("span", { className: "wizard-step-badge" }, "Step 1 of 3"),
        el("h2", { className: "wizard-title" }, "Plan a New Celebration"),
        el("p", { className: "wizard-subtitle" }, "Tell us about your event. We will analyze feasibility and build a deterministic roadmap.")
      ])
    ]);

    // Event Type Cards
    const typeCards = [
      { id: "wedding", label: "Wedding Celebration", iconName: "sparkles", desc: "Multi-day ceremonies, venue, catering & decor" },
      { id: "birthday", label: "Milestone Birthday", iconName: "heart", desc: "Fun themes, custom cake, party DJ & games" },
      { id: "community", label: "Community & Festival", iconName: "users", desc: "Cultural stages, food stalls, permits & logistics" }
    ];

    const typePicker = el("div", { className: "event-type-cards" }, typeCards.map((tc) => {
      const isSelected = state.type === tc.id;
      return el("button", {
        type: "button",
        className: `type-card ${isSelected ? "is-selected" : ""}`,
        onClick: () => {
          state.type = tc.id;
          if (tc.id === "wedding") {
            state.budget = 1200000;
            state.guests = 150;
            state.date = addWeeks(toISODateString(new Date()), 24);
          } else if (tc.id === "birthday") {
            state.budget = 75000;
            state.guests = 40;
            state.date = addWeeks(toISODateString(new Date()), 6);
          } else {
            state.budget = 300000;
            state.guests = 400;
            state.date = addWeeks(toISODateString(new Date()), 10);
          }
          updateView();
        }
      }, [
        icon(tc.iconName, "type-card-icon"),
        el("h3", { className: "type-card-title" }, tc.label),
        el("p", { className: "type-card-desc" }, tc.desc)
      ]);
    }));

    // Form Fields
    const titleInput = el("input", {
      type: "text",
      className: "form-input",
      id: "event-title",
      value: state.title,
      placeholder: `e.g. ${state.type === "wedding" ? "Aarav & Diya Wedding" : state.type === "birthday" ? "Rohan's 30th Birthday Bash" : "Diwali Community Festival"}`
    });

    const dateInput = el("input", {
      type: "date",
      className: "form-input",
      id: "event-date",
      value: state.date,
      required: true
    });

    const cityInput = el("input", {
      type: "text",
      className: "form-input",
      id: "event-city",
      value: state.city,
      placeholder: "e.g. Jaipur, Mumbai, Delhi, Bengaluru"
    });

    const guestsInput = el("input", {
      type: "number",
      className: "form-input",
      id: "event-guests",
      value: state.guests,
      min: "1",
      max: "50000"
    });

    const budgetInput = el("input", {
      type: "number",
      className: "form-input",
      id: "event-budget",
      value: state.budget,
      min: "100",
      step: "1000"
    });

    const currencySelect = el("select", { className: "form-select", id: "event-currency" }, [
      el("option", { value: "INR", selected: state.currency === "INR" }, "INR (₹)"),
      el("option", { value: "USD", selected: state.currency === "USD" }, "USD ($)"),
      el("option", { value: "EUR", selected: state.currency === "EUR" }, "EUR (€)"),
      el("option", { value: "GBP", selected: state.currency === "GBP" }, "GBP (£)"),
      el("option", { value: "AED", selected: state.currency === "AED" }, "AED (د.إ)")
    ]);

    const mustHavesText = el("textarea", {
      className: "form-input",
      id: "event-must-haves",
      rows: "3",
      placeholder: "e.g. Open-air sunset lawn, traditional Rajasthani food, candid cinematic photography, live acoustic music"
    }, state.mustHaves);

    const submitBtn = el("button", {
      type: "submit",
      className: "btn btn-primary"
    }, [
      "Check Feasibility & Continue",
      icon("arrowRight", "btn-icon")
    ]);

    const form = el("form", {
      className: "wizard-form card",
      onSubmit: async (e) => {
        e.preventDefault();
        state.title = titleInput.value.trim() || `${state.type.charAt(0).toUpperCase() + state.type.slice(1)} in ${cityInput.value.trim() || "India"}`;
        state.date = dateInput.value;
        state.city = cityInput.value.trim() || "Mumbai";
        state.guests = Math.max(1, parseInt(guestsInput.value, 10) || 100);
        state.budget = Math.max(100, parseInt(budgetInput.value, 10) || 500000);
        state.currency = currencySelect.value;
        state.mustHaves = mustHavesText.value.trim();

        // Check intake with API
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

        if (intakeResult.ok && intakeResult.data?.ready === false && intakeResult.data.questions?.length > 0) {
          state.questions = intakeResult.data.questions;
          state.step = "questions";
        } else {
          // Ready directly
          state.step = "feasibility";
        }
        updateView();
      }
    }, [
      el("div", { className: "form-section" }, [
        el("label", { className: "form-label" }, "1. Celebration Type"),
        typePicker
      ]),

      el("div", { className: "form-grid-2" }, [
        el("div", { className: "form-group" }, [
          el("label", { htmlFor: "event-title", className: "form-label" }, "Event Title (Optional)"),
          titleInput
        ]),
        el("div", { className: "form-group" }, [
          el("label", { htmlFor: "event-date", className: "form-label" }, "Event Date *"),
          dateInput
        ])
      ]),

      el("div", { className: "form-grid-3" }, [
        el("div", { className: "form-group" }, [
          el("label", { htmlFor: "event-city", className: "form-label" }, "Destination / City *"),
          cityInput
        ]),
        el("div", { className: "form-group" }, [
          el("label", { htmlFor: "event-guests", className: "form-label" }, "Target Guests *"),
          guestsInput
        ]),
        el("div", { className: "form-group" }, [
          el("label", { htmlFor: "event-budget", className: "form-label" }, "Target Budget & Currency *"),
          el("div", { style: { display: "flex", gap: "0.5rem" } }, [
            budgetInput,
            currencySelect
          ])
        ])
      ]),

      el("div", { className: "form-group" }, [
        el("label", { htmlFor: "event-must-haves", className: "form-label" }, "Priorities, Vibes & Must-Haves (Optional)"),
        mustHavesText,
        el("p", { className: "form-hint" }, "Mention any specific requirements, decor themes, food restrictions, or rituals.")
      ]),

      el("div", { className: "wizard-form-actions" }, [
        el("button", {
          type: "button",
          className: "btn btn-secondary",
          onClick: () => navigate("#/events")
        }, "Cancel"),
        submitBtn
      ])
    ]);

    container.appendChild(form);
    return container;
  }

  // ==========================================================================
  // Step 2: Smart Clarification Questions (Conditional)
  // ==========================================================================
  function renderQuestionsStep() {
    const container = el("div", { className: "wizard-step-container" }, [
      el("div", { className: "wizard-header" }, [
        el("span", { className: "wizard-step-badge" }, "Clarification"),
        el("h2", { className: "wizard-title" }, "A few quick questions to sharpen your plan"),
        el("p", { className: "wizard-subtitle" }, "The AI noticed missing details that will refine your vendor budget and timeline.")
      ])
    ]);

    const questionsList = el("div", { className: "questions-card card" });

    state.questions.forEach((q) => {
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
        const optionChips = el("div", { className: "question-chips" }, q.options.map((opt) => {
          return el("button", {
            type: "button",
            className: "chip-option-btn",
            onClick: () => {
              input.value = opt;
              state.questionAnswers[q.id] = opt;
            }
          }, opt);
        }));
        qGroup.appendChild(optionChips);
      }

      qGroup.appendChild(input);
      questionsList.appendChild(qGroup);
    });

    const actions = el("div", { className: "wizard-form-actions", style: { marginTop: "1.5rem" } }, [
      el("button", {
        type: "button",
        className: "btn btn-secondary",
        onClick: () => {
          state.step = "feasibility";
          updateView();
        }
      }, "Skip to Feasibility"),
      el("button", {
        type: "button",
        className: "btn btn-primary",
        onClick: () => {
          // Append answers to mustHaves
          const extraAnswers = Object.entries(state.questionAnswers)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; ");
          if (extraAnswers) {
            state.mustHaves = `${state.mustHaves}; ${extraAnswers}`.trim();
          }
          state.step = "feasibility";
          updateView();
        }
      }, [
        "Continue to Feasibility",
        icon("arrowRight", "btn-icon")
      ])
    ]);

    container.appendChild(questionsList);
    container.appendChild(actions);
    return container;
  }

  // ==========================================================================
  // Step 3: Feasibility Verdict Screen
  // ==========================================================================
  function renderFeasibilityStep() {
    // Run deterministic feasibility check
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

    const bandClasses = {
      comfortable: "badge-success",
      tight: "badge-warning",
      short: "badge-danger",
      unrealistic: "badge-danger"
    };

    const container = el("div", { className: "wizard-step-container" }, [
      el("div", { className: "wizard-header" }, [
        el("span", { className: "wizard-step-badge" }, "Step 2 of 3"),
        el("h2", { className: "wizard-title" }, "Feasibility Assessment"),
        el("p", { className: "wizard-subtitle" }, "Grounded in market benchmarks for catering, venue, and fixed supplier costs.")
      ])
    ]);

    const verdictCard = el("div", { className: "feasibility-card card" }, [
      el("div", { className: "verdict-badge-row" }, [
        el("span", { className: `badge ${bandClasses[feasibility.band] || "badge-neutral"}` }, [
          icon(feasibility.band === "comfortable" ? "check" : "sparkles", "badge-icon"),
          feasibility.band.toUpperCase()
        ]),
        el("span", { className: "verdict-ratio-text" }, `Budget / Minimum Cost Ratio: ${feasibility.ratio}x`)
      ]),

      el("h3", { className: "verdict-title" }, feasibility.summary),

      el("div", { className: "verdict-metrics-grid" }, [
        el("div", { className: "metric-box" }, [
          el("span", { className: "metric-label" }, "Your Budget"),
          el("span", { className: "metric-val" }, formatCurrency(state.budget, state.currency))
        ]),
        el("div", { className: "metric-box" }, [
          el("span", { className: "metric-label" }, "Estimated Minimum Cost"),
          el("span", { className: "metric-val" }, formatCurrency(feasibility.minimumCost, state.currency))
        ]),
        el("div", { className: "metric-box" }, [
          el("span", { className: "metric-label" }, "Comfortable Target"),
          el("span", { className: "metric-val" }, formatCurrency(feasibility.comfortableCost, state.currency))
        ])
      ])
    ]);

    // Trade-offs list
    if (feasibility.tradeOffs && feasibility.tradeOffs.length > 0) {
      const tradeOffsCard = el("div", { className: "tradeoffs-card card", style: { marginTop: "1rem" } }, [
        el("h4", { className: "tradeoffs-title" }, "Calculated Trade-Off Suggestions:"),
        el("ul", { className: "tradeoffs-list" }, feasibility.tradeOffs.map((t) => {
          return el("li", { className: "tradeoff-item" }, [
            icon("sparkles", "tradeoff-icon"),
            el("span", {}, t.detail)
          ]);
        }))
      ]);
      verdictCard.appendChild(tradeOffsCard);
    }

    const actions = el("div", { className: "wizard-form-actions", style: { marginTop: "1.5rem" } }, [
      el("button", {
        type: "button",
        className: "btn btn-secondary",
        onClick: () => {
          state.step = "intake";
          updateView();
        }
      }, "← Adjust Inputs"),
      el("button", {
        type: "button",
        className: "btn btn-primary",
        onClick: () => {
          state.step = "generating";
          updateView();
        }
      }, [
        icon("sparkles", "btn-icon"),
        "Generate Celebration Plan ✦"
      ])
    ]);

    container.appendChild(verdictCard);
    container.appendChild(actions);
    return container;
  }

  // ==========================================================================
  // Step 4: Parallel Plan Generation & Skeleton Loaders
  // ==========================================================================
  function renderGeneratingStep() {
    const container = el("div", { className: "wizard-step-container" }, [
      el("div", { className: "wizard-header" }, [
        el("span", { className: "wizard-step-badge" }, "Step 3 of 3"),
        el("h2", { className: "wizard-title" }, "Creating Your Personal Celebration Roadmap"),
        el("p", { className: "wizard-subtitle" }, "Generating core budget, milestones, vendor checklists, and custom ideas in parallel.")
      ])
    ]);

    const progressCards = {
      core: { title: "1. Core Budget Allocation & Timeline", statusEl: null, box: null },
      vendors: { title: "2. Vendor Checklist & Vetting Guide", statusEl: null, box: null },
      ideas: { title: "3. Bespoke Celebration Ideas & Keepsakes", statusEl: null, box: null }
    };

    const progressGrid = el("div", { className: "generating-progress-grid" }, Object.entries(progressCards).map(([k, card]) => {
      card.statusEl = el("span", { className: "gen-status-text" }, "Generating with AI...");
      card.box = el("div", { className: "gen-card card is-loading", id: `gen-card-${k}` }, [
        el("div", { className: "gen-card-header" }, [
          el("h3", { className: "gen-card-title" }, card.title),
          card.statusEl
        ]),
        el("div", { className: "skeleton-bar" }),
        el("div", { className: "skeleton-bar skeleton-short" })
      ]);
      return card.box;
    }));

    container.appendChild(progressGrid);

    // Kick off parallel execution
    executeParallelGeneration(progressCards);

    return container;
  }

  async function executeParallelGeneration(progressCards) {
    const planParams = {
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
    };

    // Pre-create baseline plan as a fallback reservoir
    const baseline = generateBaselinePlan(planParams);
    const planSignal = getPlanAbortSignal();

    let coreResult = null;
    let vendorsResult = null;
    let ideasResult = null;
    let fallbackUsed = false;

    // 1. Core Section
    const corePromise = fetchPlanSection("core", planParams, { signal: planSignal }).then((res) => {
      if (res.ok && res.data) {
        coreResult = res.data;
        markCardSuccess(progressCards.core, "✓ Core roadmap generated");
      } else {
        fallbackUsed = true;
        coreResult = {
          section: "core",
          categories: baseline.budget.categories,
          milestones: baseline.milestones
        };
        markCardFallback(progressCards.core, "Basic roadmap (AI unavailable)");
      }
    });

    // 2. Vendors Section
    const vendorsPromise = fetchPlanSection("vendors", planParams, { signal: planSignal }).then((res) => {
      if (res.ok && res.data?.vendors) {
        vendorsResult = res.data.vendors;
        markCardSuccess(progressCards.vendors, "✓ Vendor checklist ready");
      } else {
        fallbackUsed = true;
        vendorsResult = baseline.vendors;
        markCardFallback(progressCards.vendors, "Basic checklist (AI unavailable)");
      }
    });

    // 3. Ideas Section
    const ideasPromise = fetchPlanSection("ideas", planParams, { signal: planSignal }).then((res) => {
      if (res.ok && res.data?.ideas) {
        ideasResult = res.data.ideas;
        markCardSuccess(progressCards.ideas, "✓ Custom ideas curated");
      } else {
        fallbackUsed = true;
        ideasResult = baseline.ideas;
        markCardFallback(progressCards.ideas, "Basic ideas (AI unavailable)");
      }
    });

    // Await all parallel sections
    await Promise.all([corePromise, vendorsPromise, ideasPromise]);

    // Flatten tasks from milestones
    const allTasks = [];
    (coreResult.milestones || []).forEach((m) => {
      (m.tasks || []).forEach((t) => allTasks.push(t));
    });

    // Build complete event
    const finalEvent = {
      schemaVersion: 1,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      isBaselineFallback: fallbackUsed,
      type: state.type,
      title: state.title,
      date: state.date,
      city: state.city,
      countryCode: state.countryCode,
      currency: state.currency,
      guests: {
        target: state.guests,
        list: []
      },
      budget: {
        total: state.budget,
        categories: coreResult.categories || baseline.budget.categories
      },
      expenses: [],
      milestones: coreResult.milestones || baseline.milestones,
      tasks: allTasks.length > 0 ? allTasks : baseline.tasks,
      vendors: vendorsResult || baseline.vendors,
      ideas: ideasResult || baseline.ideas,
      feasibility: state.feasibility || baseline.feasibility,
      critique: baseline.critique,
      language: state.language
    };

    // Run critique in background
    fetchCritique(finalEvent, state.language).then((critiqueRes) => {
      if (critiqueRes.ok && critiqueRes.data?.risks) {
        finalEvent.critique = critiqueRes.data;
        saveEvent(finalEvent);
      }
    });

    // Save final event and navigate to overview
    saveEvent(finalEvent);
    setActiveEventId(finalEvent.id);

    setTimeout(() => {
      if (onComplete) onComplete(finalEvent);
      navigate(`#/event/${finalEvent.id}/overview`);
    }, 600);
  }

  function markCardSuccess(card, text) {
    if (card.box) {
      card.box.classList.remove("is-loading");
      card.box.classList.add("is-success");
    }
    if (card.statusEl) {
      card.statusEl.textContent = text;
      card.statusEl.className = "gen-status-text text-success";
    }
  }

  function markCardFallback(card, text) {
    if (card.box) {
      card.box.classList.remove("is-loading");
      card.box.classList.add("is-fallback");
    }
    if (card.statusEl) {
      card.statusEl.textContent = text;
      card.statusEl.className = "gen-status-text text-fallback";
    }
  }

  // Initial render
  updateView();
  return root;
}
