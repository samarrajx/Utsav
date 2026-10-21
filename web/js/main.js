/**
 * main.js - Application entry point & route dispatcher for Utsav
 */

import { initRouter, navigate } from "./router.js";
import { getActiveEvent, getEvents, saveEvent, setActiveEventId } from "./storage.js";
import { generateBaselinePlan } from "./engine/baseline.js";
import { el } from "./dom.js";
import { renderAppShell } from "./views/shell.js";
import { renderHeroBanner } from "./views/hero.js";
import { renderTablist } from "./views/tabs.js";
import { renderSettingsModal } from "./views/settings.js";
import { renderEventsList } from "./views/events-list.js";

/**
 * Announce messages to screen readers via ARIA live region
 * @param {string} message
 */
export function announce(message) {
  const elAnnouncer = document.getElementById("live-announcer");
  if (elAnnouncer) {
    elAnnouncer.textContent = message;
  }
}

/**
 * Seed initial sample event if local storage is empty
 */
function ensureInitialEvent() {
  const events = getEvents();
  if (events.length === 0) {
    const starterEvent = generateBaselinePlan({
      type: "wedding",
      title: "Diya & Aarav Wedding Celebration",
      date: "2026-11-28",
      city: "Jaipur",
      currency: "INR",
      budget: 1500000,
      guests: 200,
      language: "en"
    });
    saveEvent(starterEvent);
    setActiveEventId(starterEvent.id);
  }
}

// Active modal container
let activeModal = null;

function openSettingsModal() {
  if (activeModal) activeModal.remove();
  activeModal = renderSettingsModal({
    onClose: () => {
      if (activeModal) {
        activeModal.remove();
        activeModal = null;
      }
    },
    onSave: () => {
      announce("Settings updated successfully.");
      renderCurrentRoute();
    }
  });
  document.body.appendChild(activeModal);
}

// Current route state
let currentRouteState = { path: "home" };

/**
 * Render view according to current hash route
 */
function renderCurrentRoute() {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;

  const activeEvent = getActiveEvent();
  const route = currentRouteState;

  let mainViewContent = null;
  let activeTab = "overview";

  if (route.path === "events") {
    mainViewContent = renderEventsList({
      onSelectEvent: (id) => {
        setActiveEventId(id);
        renderCurrentRoute();
      },
      onRefresh: () => {
        renderCurrentRoute();
      }
    });
    announce("Navigated to My Events.");
  } else if (route.path === "settings") {
    openSettingsModal();
    navigate("#/");
    return;
  } else if (route.path === "new") {
    // New Event intake placeholder shell (full AI intake built in Phase 5)
    mainViewContent = el("div", { className: "card", style: { padding: "2rem" } }, [
      el("h2", { style: { fontFamily: "Georgia, serif", color: "#6D2E46", marginBottom: "0.5rem" } }, "Plan a New Celebration"),
      el("p", { style: { color: "#665057", marginBottom: "1.5rem" } }, "Smart intake engine with deterministic budget benchmarks and AI assistance."),
      el("div", { style: { display: "flex", gap: "1rem" } }, [
        el("button", {
          className: "btn btn-primary",
          type: "button",
          onClick: () => {
            const newEvt = generateBaselinePlan({
              type: "wedding",
              title: "New Celebration Plan",
              city: "Mumbai",
              budget: 1000000,
              guests: 150
            });
            saveEvent(newEvt);
            setActiveEventId(newEvt.id);
            navigate(`#/event/${newEvt.id}/overview`);
          }
        }, "Generate Fast Baseline Plan"),
        el("button", {
          className: "btn btn-secondary",
          type: "button",
          onClick: () => navigate("#/events")
        }, "Cancel")
      ])
    ]);
    announce("Navigated to New Event creation.");
  } else {
    // Event dashboard view: overview / specific tab
    if (!activeEvent) {
      navigate("#/events");
      return;
    }

    activeTab = route.tab || "overview";

    const hero = renderHeroBanner(activeEvent, {
      onEdit: () => {
        const newTitle = prompt("Edit event title:", activeEvent.title);
        if (newTitle && newTitle.trim()) {
          activeEvent.title = newTitle.trim();
          saveEvent(activeEvent);
          renderCurrentRoute();
        }
      }
    });

    const tablist = renderTablist(activeTab, (tabId) => {
      navigate(`#/event/${activeEvent.id}/${tabId}`);
    });

    // Content container for current tab
    const tabpanel = el("section", {
      id: `tabpanel-${activeTab}`,
      role: "tabpanel",
      "aria-labelledby": `tab-${activeTab}`,
      className: "tabpanel-content"
    }, [
      el("div", { className: "card", style: { padding: "1.5rem" } }, [
        el("h2", { style: { fontFamily: "Georgia, serif", color: "#6D2E46", marginBottom: "0.5rem" } }, `${activeTab.toUpperCase()} SECTION`),
        el("p", { style: { color: "#665057" } }, `Viewing ${activeTab} for "${activeEvent.title}".`)
      ])
    ]);

    mainViewContent = el("div", { className: "event-dashboard-flow" }, [
      hero,
      tablist,
      tabpanel
    ]);

    announce(`Loaded ${activeTab} tab for ${activeEvent.title}.`);
  }

  // Render App Shell with Main View Content
  const shell = renderAppShell({
    activeEvent,
    activeTab,
    mainView: mainViewContent,
    onOpenSettings: openSettingsModal,
    onSwitchEvent: (_id) => {
      renderCurrentRoute();
    },
    onSelectTab: (tab) => {
      if (activeEvent) {
        navigate(`#/event/${activeEvent.id}/${tab}`);
      }
    }
  });

  appRoot.replaceChildren(shell);
}

// Initialise application
document.addEventListener("DOMContentLoaded", () => {
  ensureInitialEvent();

  initRouter((route) => {
    currentRouteState = route;
    renderCurrentRoute();
  });
});
