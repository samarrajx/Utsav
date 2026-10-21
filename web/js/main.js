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
import { renderNewEventFlow } from "./views/new-event.js";
import { renderOverviewTab } from "./views/overview-tab.js";
import { renderTasksTab } from "./views/tasks-tab.js";
import { renderBudgetTab } from "./views/budget-tab.js";
import { renderVendorsTab } from "./views/vendors-tab.js";
import { renderTimelineTab } from "./views/timeline-tab.js";
import { renderGuestsTab } from "./views/guests-tab.js";
import { renderIdeasTab } from "./views/ideas-tab.js";

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
    mainViewContent = renderNewEventFlow({
      onComplete: (newEvent) => {
        announce(`Celebration plan created for ${newEvent.title}.`);
      }
    });
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

    // Content container for current tab with real interactive views
    let tabContentNode;
    const tabOptions = {
      onUpdate: (updatedEvent) => {
        saveEvent(updatedEvent);
      },
      onNavigateTab: (tabId) => {
        navigate(`#/event/${activeEvent.id}/${tabId}`);
      },
      onDraftMessage: (_vendor) => {
        const text = `Hi, I am planning a celebration (${activeEvent.title}) on ${activeEvent.date} in ${activeEvent.city} for ~${activeEvent.guests?.target || 100} guests. Are you available on this date, and could you share your package pricing?`;
        navigator.clipboard?.writeText(text);
        alert(`Vendor outreach message copied to clipboard!\n\n"${text}"`);
      },
      announce
    };

    switch (activeTab) {
      case "tasks":
        tabContentNode = renderTasksTab(activeEvent, tabOptions);
        break;
      case "budget":
        tabContentNode = renderBudgetTab(activeEvent, tabOptions);
        break;
      case "vendors":
        tabContentNode = renderVendorsTab(activeEvent, tabOptions);
        break;
      case "timeline":
        tabContentNode = renderTimelineTab(activeEvent, tabOptions);
        break;
      case "guests":
        tabContentNode = renderGuestsTab(activeEvent, tabOptions);
        break;
      case "ideas":
        tabContentNode = renderIdeasTab(activeEvent, tabOptions);
        break;
      case "overview":
      default:
        tabContentNode = renderOverviewTab(activeEvent, tabOptions);
        break;
    }

    const tabpanel = el("section", {
      id: `tabpanel-${activeTab}`,
      role: "tabpanel",
      "aria-labelledby": `tab-${activeTab}`,
      className: "tabpanel-content"
    }, [tabContentNode]);

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
