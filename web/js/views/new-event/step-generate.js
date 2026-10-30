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

async function fetchCoreSection(planParams, planSignal, baseline, card) {
  const res = await fetchPlanSection("core", planParams, { signal: planSignal });
  if (res.ok && res.data) {
    markCardSuccess(card, "✓ Core roadmap generated");
    return { coreResult: res.data, fallbackUsed: false };
  }
  markCardFallback(card, "Basic roadmap (AI unavailable)");
  return {
    coreResult: {
      section: "core",
      categories: baseline.budget.categories,
      milestones: baseline.milestones
    },
    fallbackUsed: true
  };
}

async function fetchVendorsSection(planParams, planSignal, baseline, card) {
  const res = await fetchPlanSection("vendors", planParams, { signal: planSignal });
  if (res.ok && res.data?.vendors) {
    markCardSuccess(card, "✓ Vendor checklist ready");
    return { vendorsResult: res.data.vendors, fallbackUsed: false };
  }
  markCardFallback(card, "Basic checklist (AI unavailable)");
  return { vendorsResult: baseline.vendors, fallbackUsed: true };
}

async function fetchIdeasSection(planParams, planSignal, baseline, card) {
  const res = await fetchPlanSection("ideas", planParams, { signal: planSignal });
  if (res.ok && res.data?.ideas) {
    markCardSuccess(card, "✓ Custom ideas curated");
    return { ideasResult: res.data.ideas, fallbackUsed: false };
  }
  markCardFallback(card, "Basic ideas (AI unavailable)");
  return { ideasResult: baseline.ideas, fallbackUsed: true };
}

function runBackgroundCritique(finalEvent, language) {
  fetchCritique(finalEvent, language).then((critiqueRes) => {
    if (critiqueRes.ok && critiqueRes.data?.risks) {
      finalEvent.critique = critiqueRes.data;
      saveEvent(finalEvent);
    }
  });
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

  const [coreRes, vendorsRes, ideasRes] = await Promise.all([
    fetchCoreSection(planParams, planSignal, baseline, progressCards.core),
    fetchVendorsSection(planParams, planSignal, baseline, progressCards.vendors),
    fetchIdeasSection(planParams, planSignal, baseline, progressCards.ideas)
  ]);

  const fallbackUsed = coreRes.fallbackUsed || vendorsRes.fallbackUsed || ideasRes.fallbackUsed;
  const finalEvent = buildFinalEvent(
    state,
    coreRes.coreResult,
    vendorsRes.vendorsResult,
    ideasRes.ideasResult,
    baseline,
    fallbackUsed
  );

  runBackgroundCritique(finalEvent, state.language);
  saveEvent(finalEvent);
  setActiveEventId(finalEvent.id);

  setTimeout(() => {
    if (onComplete) onComplete(finalEvent);
    navigate(`#/event/${finalEvent.id}/overview`);
  }, 600);
}

function renderProgressGrid(progressCards) {
  return el(
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

  container.appendChild(renderProgressGrid(progressCards));
  executeParallelGeneration(state, progressCards, onComplete);

  return container;
}
