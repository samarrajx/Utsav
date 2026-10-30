/**
 * ui-helpers.js - Shared UI utilities and component builders for dashboard views
 */

import { el, icon } from "../../dom.js";

const DEFAULT_FEEDBACK_DURATION_MS = 2000;

/**
 * Copy text to clipboard with accessible visual and screen-reader feedback
 *
 * @param {HTMLElement} buttonEl
 * @param {string} textToCopy
 * @param {Object} [options]
 * @param {string} [options.successLabel='✓ Copied!']
 * @param {number} [options.durationMs=2000]
 * @param {Function} [options.announce]
 */
export function copyTextWithFeedback(
  buttonEl,
  textToCopy,
  { successLabel = "✓ Copied!", durationMs = DEFAULT_FEEDBACK_DURATION_MS, announce } = {}
) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(textToCopy);
  }
  const originalText = buttonEl.textContent;
  buttonEl.textContent = successLabel;
  if (announce) {
    announce("Copied to clipboard.");
  }
  setTimeout(() => {
    if (buttonEl) buttonEl.textContent = originalText;
  }, durationMs);
}

/**
 * Create an accessible filter pill group with single-selection behavior
 *
 * @param {Object} params
 * @param {Array<{ key: string, label: string, count?: number }>} params.items
 * @param {string} params.activeKey
 * @param {string} params.ariaLabel
 * @param {string} [params.className='filter-pills-group']
 * @param {Function} params.onSelect
 * @returns {HTMLElement}
 */
export function createFilterPillGroup({
  items,
  activeKey,
  ariaLabel,
  className = "filter-pills-group",
  onSelect
}) {
  return el(
    "div",
    { className, role: "group", "aria-label": ariaLabel },
    items.map(({ key, label, count }) => {
      const displayLabel = count !== undefined ? `${label} (${count})` : label;
      return el(
        "button",
        {
          type: "button",
          className: `filter-btn ${activeKey === key ? "is-active" : ""}`,
          onClick: (e) => {
            const group = e.currentTarget.parentElement;
            if (group) {
              group.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("is-active"));
            }
            e.currentTarget.classList.add("is-active");
            onSelect(key);
          }
        },
        displayLabel
      );
    })
  );
}

/**
 * Create a standard empty state message element
 *
 * @param {string} message
 * @param {string} [className='empty-state-text']
 * @returns {HTMLElement}
 */
export function createEmptyState(message, className = "empty-state-text") {
  return el("p", { className }, message);
}

/**
 * Create a section header with icon and optional counter badge
 *
 * @param {string} title
 * @param {string} [iconName]
 * @param {string|number} [counterBadge]
 * @returns {HTMLElement}
 */
export function createSectionHeader(title, iconName, counterBadge) {
  const titleChildren = [];
  if (iconName) {
    titleChildren.push(icon(iconName));
    titleChildren.push(" ");
  }
  titleChildren.push(title);

  const headerChildren = [el("h3", { className: "card-title-sm" }, titleChildren)];
  if (counterBadge !== undefined && counterBadge !== null) {
    headerChildren.push(el("span", { className: "counter-chip" }, String(counterBadge)));
  }

  return el("div", { className: "section-header-row" }, headerChildren);
}
