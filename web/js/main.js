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
import { renderEventsList } from "./views/events-list.js";
import { renderNewEventFlow } from "./views/new-event.js";
import { renderOverviewTab } from "./views/overview-tab.js";
import { renderTasksTab } from "./views/tasks-tab.js";
import { renderBudgetTab } from "./views/budget-tab.js";
import { renderVendorsTab } from "./views/vendors-tab.js";
import { renderTimelineTab } from "./views/timeline-tab.js";
import { renderGuestsTab } from "./views/guests-tab.js";
import { renderIdeasTab } from "./views/ideas-tab.js";
import { abortInFlightPlan } from "./api.js";

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

async function openSettingsModal() {
  if (activeModal) activeModal.remove();
  const { renderSettingsModal } = await import("./views/settings.js");
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

// Current route state and mount tracking
let currentRouteState = { path: "home" };
let currentMountedPath = null;
let currentMountedEventId = null;

/**
 * Render tab content node based on active tab ID
 * @param {string} activeTab
 * @param {Object} activeEvent
 * @param {Object} tabOptions
 * @returns {HTMLElement}
 */
function getTabContentNode(activeTab, activeEvent, tabOptions) {
  switch (activeTab) {
    case "tasks":
      return renderTasksTab(activeEvent, tabOptions);
    case "budget":
      return renderBudgetTab(activeEvent, tabOptions);
    case "vendors":
      return renderVendorsTab(activeEvent, tabOptions);
    case "timeline":
      return renderTimelineTab(activeEvent, tabOptions);
    case "guests":
      return renderGuestsTab(activeEvent, tabOptions);
    case "ideas":
      return renderIdeasTab(activeEvent, tabOptions);
    case "overview":
    default:
      return renderOverviewTab(activeEvent, tabOptions);
  }
}

/**
 * Render view according to current hash route
 */
function renderCurrentRoute() {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;

  const activeEvent = getActiveEvent();
  const route = currentRouteState;

  if (route.path !== "new") {
    abortInFlightPlan();
  }

  const isEventDashboardRoute = (route.path === "event" || (route.path === "home" && activeEvent));
  const existingShell = appRoot.querySelector(".app-layout-grid");

  // In-place update: only re-render the tabpanel if staying on the same event
  if (existingShell && isEventDashboardRoute && activeEvent && currentMountedEventId === activeEvent.id && currentMountedPath === "event") {
    const activeTab = route.tab || "overview";
    const tabOptions = {
      onUpdate: (updatedEvent) => {
        saveEvent(updatedEvent);
        renderCurrentRoute();
      },
      onNavigateTab: (tabId) => {
        navigate(`#/event/${activeEvent.id}/${tabId}`);
      },
      onDraftMessage: async (vendor) => {
        const { openVendorOutreachModal } = await import("./views/vendor-outreach-modal.js");
        openVendorOutreachModal({
          vendor,
          event: activeEvent,
          announce
        });
      },
      announce
    };

    const tabContentNode = getTabContentNode(activeTab, activeEvent, tabOptions);

    // 1. Update tablist state
    const tablistEl = existingShell.querySelector('[role="tablist"]');
    if (tablistEl) {
      const tabButtons = tablistEl.querySelectorAll('[role="tab"]');
      tabButtons.forEach((btn) => {
        const isSelected = btn.id === `tab-${activeTab}`;
        btn.setAttribute("aria-selected", isSelected ? "true" : "false");
        btn.classList.toggle("is-active", isSelected);
        btn.setAttribute("tabindex", isSelected ? "0" : "-1");
      });
    }

    // 2. Update sidebar navigation
    const sidebarLinks = existingShell.querySelectorAll(".sidebar-menu .sidebar-nav-link");
    sidebarLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      link.classList.toggle("is-active", href.endsWith(`/${activeTab}`));
    });

    // 3. Update tabpanel content
    const tabpanel = existingShell.querySelector(".tabpanel-content");
    if (tabpanel) {
      tabpanel.id = `tabpanel-${activeTab}`;
      tabpanel.setAttribute("aria-labelledby", `tab-${activeTab}`);
      tabpanel.replaceChildren(tabContentNode);
    }

    announce(`Loaded ${activeTab} tab for ${activeEvent.title}.`);
    return;
  }

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
      onDraftMessage: async (vendor) => {
        const { openVendorOutreachModal } = await import("./views/vendor-outreach-modal.js");
        openVendorOutreachModal({
          vendor,
          event: activeEvent,
          announce
        });
      },
      announce
    };

    tabContentNode = getTabContentNode(activeTab, activeEvent, tabOptions);

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
    },
    onUpdateEvent: (_updated) => {
      renderCurrentRoute();
    },
    announce
  });

  currentMountedPath = isEventDashboardRoute ? "event" : route.path;
  currentMountedEventId = activeEvent?.id || null;
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
