/**
 * step-generate.js - Parallel generation with skeleton loaders and baseline fallback
 */

import { el } from "../../dom.js";
import { saveEvent, setActiveEventId } from "../../storage.js";
import { generateBaselinePlan } from "../../engine/baseline.js";
import { fetchPlanSection, fetchCritique, getPlanAbortSignal } from "../../api.js";
import { navigate } from "../../router.js";

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

function buildFinalEvent(state, coreResult, vendorsResult, ideasResult, baseline, fallbackUsed) {
  const allTasks = [];
  (coreResult.milestones || []).forEach((m) => {
    (m.tasks || []).forEach((t) => allTasks.push(t));
  });

  return {
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
}

async function executeParallelGeneration(state, progressCards, onComplete) {
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

  const baseline = generateBaselinePlan(planParams);
  const planSignal = getPlanAbortSignal();

  let coreResult = null;
  let vendorsResult = null;
  let ideasResult = null;
  let fallbackUsed = false;

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

  const vendorsPromise = fetchPlanSection("vendors", planParams, { signal: planSignal }).then(
    (res) => {
      if (res.ok && res.data?.vendors) {
        vendorsResult = res.data.vendors;
        markCardSuccess(progressCards.vendors, "✓ Vendor checklist ready");
      } else {
        fallbackUsed = true;
        vendorsResult = baseline.vendors;
        markCardFallback(progressCards.vendors, "Basic checklist (AI unavailable)");
      }
    }
  );

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

  await Promise.all([corePromise, vendorsPromise, ideasPromise]);

  const finalEvent = buildFinalEvent(
    state,
    coreResult,
    vendorsResult,
    ideasResult,
    baseline,
    fallbackUsed
  );

  fetchCritique(finalEvent, state.language).then((critiqueRes) => {
    if (critiqueRes.ok && critiqueRes.data?.risks) {
      finalEvent.critique = critiqueRes.data;
      saveEvent(finalEvent);
    }
  });

  saveEvent(finalEvent);
  setActiveEventId(finalEvent.id);

  setTimeout(() => {
    if (onComplete) onComplete(finalEvent);
    navigate(`#/event/${finalEvent.id}/overview`);
  }, 600);
}

/**
 * Render parallel generation progress view
 * @param {Object} state
 * @param {Function} onComplete
 * @returns {HTMLElement}
 */
export function renderGeneratingStep(state, onComplete) {
  const container = el("div", { className: "wizard-step-container" }, [
    el("div", { className: "wizard-header" }, [
      el("span", { className: "wizard-step-badge" }, "Step 3 of 3"),
      el("h2", { className: "wizard-title" }, "Creating Your Personal Celebration Roadmap"),
      el(
        "p",
        { className: "wizard-subtitle" },
        "Generating core budget, milestones, vendor checklists, and custom ideas in parallel."
      )
    ])
  ]);

  const progressCards = {
    core: { title: "1. Core Budget Allocation & Timeline", statusEl: null, box: null },
    vendors: { title: "2. Vendor Checklist & Vetting Guide", statusEl: null, box: null },
    ideas: { title: "3. Bespoke Celebration Ideas & Keepsakes", statusEl: null, box: null }
  };

  const progressGrid = el(
    "div",
    { className: "generating-progress-grid" },
    Object.entries(progressCards).map(([k, card]) => {
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
    })
  );

  container.appendChild(progressGrid);
  executeParallelGeneration(state, progressCards, onComplete);

  return container;
}
