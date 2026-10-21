/**
 * index.js - Orchestrator for the modular Overview Tab
 */

import { el } from "../../dom.js";
import { renderBudgetCard } from "./card-budget.js";
import { renderProgressRingCard } from "./card-progress.js";
import { renderGuestsCard } from "./card-guests.js";
import { renderMilestoneCard } from "./card-milestone.js";
import { renderTasksCard } from "./card-tasks.js";
import { renderFeasibilityCard } from "./card-feasibility.js";
import { renderRisksCard } from "./card-risks.js";
import { renderExportBar } from "./export-bar.js";

/**
 * Render the Overview Tab Panel
 *
 * @param {Object} event - Current event object
 * @param {Object} options
 * @param {Function} options.onUpdate - Callback when an item is modified
 * @param {Function} options.onNavigateTab - Callback to switch to another tab
 * @param {Function} [options.announce] - Accessible live announcement
 * @returns {HTMLElement}
 */
export function renderOverviewTab(event, { onUpdate, onNavigateTab, announce }) {
  const container = el("div", { className: "tabpanel-overview" });

  const metricsGrid = el("div", { className: "overview-metrics-grid" }, [
    renderBudgetCard(event, onNavigateTab),
    renderProgressRingCard(event),
    renderGuestsCard(event, onNavigateTab)
  ]);

  const middleRow = el("div", { className: "overview-two-col-grid" }, [
    renderMilestoneCard(event, onNavigateTab),
    renderTasksCard(event, { onUpdate, onNavigateTab, announce })
  ]);

  const bottomRow = el("div", { className: "overview-two-col-grid" }, [
    renderFeasibilityCard(event),
    renderRisksCard(event, { onUpdate, announce })
  ]);

  const exportBar = renderExportBar(event, announce);

  container.append(metricsGrid, middleRow, bottomRow, exportBar);
  return container;
}
