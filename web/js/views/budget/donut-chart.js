/**
 * donut-chart.js - Pure SVG donut chart and legend for budget breakdown
 */

import { el } from "../../dom.js";
import { formatCurrency, formatCompactCurrency } from "../../engine/money.js";
import { CATEGORY_COLORS, DONUT_SUBTEXT_COLOR, DONUT_AMOUNT_COLOR } from "./constants.js";

function createDonutSegment(cat, idx, accumulatedPercent, circumference, currency) {
  const weight = Number(cat.weight) || 0;
  if (weight <= 0) return null;

  const strokeDasharray = `${(weight / 100) * circumference} ${circumference}`;
  const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "100");
  circle.setAttribute("cy", "100");
  circle.setAttribute("r", "70");
  circle.setAttribute("fill", "transparent");
  circle.setAttribute("stroke", color);
  circle.setAttribute("stroke-width", "28");
  circle.setAttribute("stroke-dasharray", strokeDasharray);
  circle.setAttribute("stroke-dashoffset", String(strokeDashoffset));
  circle.setAttribute("transform", "rotate(-90 100 100)");

  const titleNode = document.createElementNS("http://www.w3.org/2000/svg", "title");
  titleNode.textContent = `${cat.name}: ${weight}% (${formatCurrency(cat.planned, currency)})`;
  circle.appendChild(titleNode);

  return circle;
}

function createDonutCenterText(totalBudget, currency) {
  const textGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  textGroup.setAttribute("text-anchor", "middle");

  const centerSubtext = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerSubtext.setAttribute("x", "100");
  centerSubtext.setAttribute("y", "93");
  centerSubtext.setAttribute("font-size", "11");
  centerSubtext.setAttribute("fill", DONUT_SUBTEXT_COLOR);
  centerSubtext.textContent = "TOTAL";

  const centerAmount = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerAmount.setAttribute("x", "100");
  centerAmount.setAttribute("y", "112");
  centerAmount.setAttribute("font-size", "14");
  centerAmount.setAttribute("font-weight", "bold");
  centerAmount.setAttribute("fill", DONUT_AMOUNT_COLOR);
  centerAmount.textContent = formatCompactCurrency(totalBudget, currency);

  textGroup.append(centerSubtext, centerAmount);
  return textGroup;
}

/**
 * Render the pure SVG donut chart
 * @param {Array<Object>} categories
 * @param {number} totalBudget
 * @param {string} currency
 * @returns {HTMLElement}
 */
export function createDonutChartSvg(categories, totalBudget, currency) {
  const circumference = 2 * Math.PI * 70;
  const wrapper = el("div", {
    className: "donut-svg-wrapper",
    role: "img",
    "aria-label": `Donut chart showing budget allocation of ${formatCurrency(totalBudget, currency)} across ${categories.length} categories`
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 200 200");
  svg.setAttribute("width", "180");
  svg.setAttribute("height", "180");
  svg.setAttribute("class", "donut-svg");

  let accumulatedPercent = 0;
  categories.forEach((cat, idx) => {
    const segment = createDonutSegment(cat, idx, accumulatedPercent, circumference, currency);
    if (segment) {
      svg.appendChild(segment);
      accumulatedPercent += Number(cat.weight) || 0;
    }
  });

  svg.appendChild(createDonutCenterText(totalBudget, currency));
  wrapper.appendChild(svg);
  return wrapper;
}

/**
 * Render the color-coded legend grid for donut chart categories
 * @param {Array<Object>} categories
 * @returns {HTMLElement}
 */
export function createChartLegend(categories) {
  return el(
    "div",
    { className: "donut-legend-grid", "aria-hidden": "true" },
    categories.map((cat, idx) => {
      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
      return el("div", { className: "donut-legend-item" }, [
        el("span", { className: "legend-dot", style: { backgroundColor: color } }),
        el("span", { className: "legend-name" }, cat.name),
        el("span", { className: "legend-val font-mono" }, `${cat.weight}%`)
      ]);
    })
  );
}
