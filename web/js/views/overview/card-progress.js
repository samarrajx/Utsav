/**
 * card-progress.js - Overview planning progress ring card
 */

import { el, icon } from "../../dom.js";
import { calculateAttendanceFromList } from "../../engine/catering.js";

function createProgressRingSvg(percent) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const wrapper = el("div", {
    className: "radial-ring-wrapper",
    role: "img",
    "aria-label": `Overall planning progress: ${percent} percent completed`
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("width", "90");
  svg.setAttribute("height", "90");
  svg.setAttribute("class", "progress-svg-circle");

  const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bgCircle.setAttribute("cx", "50");
  bgCircle.setAttribute("cy", "50");
  bgCircle.setAttribute("r", String(radius));
  bgCircle.setAttribute("fill", "transparent");
  bgCircle.setAttribute("stroke", "#EAD8D4");
  bgCircle.setAttribute("stroke-width", "8");

  const fgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  fgCircle.setAttribute("cx", "50");
  fgCircle.setAttribute("cy", "50");
  fgCircle.setAttribute("r", String(radius));
  fgCircle.setAttribute("fill", "transparent");
  fgCircle.setAttribute("stroke", "#6D2E46");
  fgCircle.setAttribute("stroke-width", "8");
  fgCircle.setAttribute("stroke-linecap", "round");
  fgCircle.setAttribute("stroke-dasharray", String(circumference));
  fgCircle.setAttribute("stroke-dashoffset", String(strokeDashoffset));
  fgCircle.setAttribute("transform", "rotate(-90 50 50)");

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("x", "50");
  text.setAttribute("y", "56");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("font-size", "18");
  text.setAttribute("font-weight", "bold");
  text.setAttribute("fill", "#6D2E46");
  text.textContent = `${percent}%`;

  svg.append(bgCircle, fgCircle, text);
  wrapper.appendChild(svg);
  return wrapper;
}

/**
 * Render the overview progress ring card
 * @param {Object} event
 * @returns {HTMLElement}
 */
export function renderProgressRingCard(event) {
  const tasks = Array.isArray(event.tasks) ? event.tasks : [];
  const completedTasks = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const vendors = Array.isArray(event.vendors) ? event.vendors : [];
  const bookedVendors = vendors.filter((v) => v.status === "booked").length;
  const totalVendors = vendors.length;
  const vendorProgressPercent =
    totalVendors > 0 ? Math.round((bookedVendors / totalVendors) * 100) : 0;

  const guestList = Array.isArray(event.guests?.list) ? event.guests.list : [];
  const attendance = calculateAttendanceFromList(guestList);
  const totalInvited = attendance.totalInvited || event.guests?.target || 0;
  const guestsResponded = attendance.confirmed + attendance.declined;
  const guestResponsePercent =
    totalInvited > 0 ? Math.round((guestsResponded / totalInvited) * 100) : 0;

  const compositeScore = Math.round(
    taskProgressPercent * 0.35 + vendorProgressPercent * 0.35 + guestResponsePercent * 0.3
  );

  return el("div", { className: "card metric-card progress-ring-card" }, [
    el("div", { className: "metric-card-header" }, [
      icon("sparkles", "metric-icon"),
      el("span", { className: "metric-label" }, "Planning Progress")
    ]),
    el("div", { className: "progress-ring-container" }, [
      createProgressRingSvg(compositeScore),
      el("div", { className: "progress-ring-stats" }, [
        el("div", { className: "stat-line" }, [
          el("span", { className: "stat-name" }, "Tasks Done:"),
          el("span", { className: "stat-val" }, `${completedTasks}/${totalTasks}`)
        ]),
        el("div", { className: "stat-line" }, [
          el("span", { className: "stat-name" }, "Vendors Booked:"),
          el("span", { className: "stat-val" }, `${bookedVendors}/${totalVendors}`)
        ]),
        el("div", { className: "stat-line" }, [
          el("span", { className: "stat-name" }, "RSVP Count:"),
          el("span", { className: "stat-val" }, `${attendance.confirmed} confirmed`)
        ])
      ])
    ])
  ]);
}
