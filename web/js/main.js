/**
 * main.js - Core application entrypoint and view controller for Utsav
 *
 * Coordinates:
 * - Hash router dispatching (#/, #/new, #/events, #/event/:id/:tab, #/settings)
 * - State management and local persistence
 * - Reactive application shell and active view mounting
 */

import { initRouter, navigate } from "./router.js";
import { getActiveEvent, saveEvent, setActiveEventId } from "./storage.js";
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
 * Global screen reader announcer using ARIA live regions
 * @param {string} message - Content to announce
 * @param {"polite"|"assertive"} [priority="polite"] - Live region priority
 */
export function announce(message, priority = "polite") {
  const liveRegion = document.getElementById(
    priority === "assertive" ? "aria-live-assertive" : "aria-live-polite"
  );
  if (liveRegion) {
    liveRegion.textContent = "";
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 50);
  }
}

// Keep track of active mounted route state
let currentRouteState = { path: "home" };
let currentMountedPath = null;
let currentMountedEventId = null;

/**
 * Open Settings modal via lazy dynamic import
 */
async function openSettingsModal() {
  const { renderSettingsModal } = await import("./views/settings.js");
  renderSettingsModal({
    onSave: () => {
      renderCurrentRoute();
      announce("Settings updated successfully.");
    }
  });
}

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

function updateActiveTabInPlace(existingShell, activeEvent, activeTab) {
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
      openVendorOutreachModal({ vendor, event: activeEvent, announce });
    },
    announce
  };

  const tabContentNode = getTabContentNode(activeTab, activeEvent, tabOptions);

  const tablistEl = existingShell.querySelector('[role="tablist"]');
  if (tablistEl) {
    tablistEl.querySelectorAll('[role="tab"]').forEach((btn) => {
      const isSelected = btn.id === `tab-${activeTab}`;
      btn.setAttribute("aria-selected", isSelected ? "true" : "false");
      btn.classList.toggle("is-active", isSelected);
      btn.setAttribute("tabindex", isSelected ? "0" : "-1");
    });
  }

  const sidebarLinks = existingShell.querySelectorAll(".sidebar-menu .sidebar-nav-link");
  sidebarLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    link.classList.toggle("is-active", href.endsWith(`/${activeTab}`));
  });

  const tabpanel = existingShell.querySelector(".tabpanel-content");
  if (tabpanel) {
    tabpanel.id = `tabpanel-${activeTab}`;
    tabpanel.setAttribute("aria-labelledby", `tab-${activeTab}`);
    tabpanel.replaceChildren(tabContentNode);
  }

  announce(`Loaded ${activeTab} tab for ${activeEvent.title}.`);
}

function renderEventDashboardFlow(activeEvent, activeTab) {
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

  const tabOptions = {
    onUpdate: (updatedEvent) => {
      saveEvent(updatedEvent);
    },
    onNavigateTab: (tabId) => {
      navigate(`#/event/${activeEvent.id}/${tabId}`);
    },
    onDraftMessage: async (vendor) => {
      const { openVendorOutreachModal } = await import("./views/vendor-outreach-modal.js");
      openVendorOutreachModal({ vendor, event: activeEvent, announce });
    },
    announce
  };

  const tabContentNode = getTabContentNode(activeTab, activeEvent, tabOptions);
  const tabpanel = el(
    "section",
    {
      id: `tabpanel-${activeTab}`,
      role: "tabpanel",
      "aria-labelledby": `tab-${activeTab}`,
      className: "tabpanel-content"
    },
    [tabContentNode]
  );

  announce(`Loaded ${activeTab} tab for ${activeEvent.title}.`);
  return el("div", { className: "event-dashboard-flow" }, [hero, tablist, tabpanel]);
}

function canUpdateTabInPlace(existingShell, isEventDashboardRoute, activeEvent) {
  return Boolean(
    existingShell &&
    isEventDashboardRoute &&
    activeEvent &&
    currentMountedEventId === activeEvent.id &&
    currentMountedPath === "event"
  );
}

function resolveRouteContent(route, activeEvent) {
  if (route.path === "events") {
    const content = renderEventsList({
      onSelectEvent: (id) => {
        setActiveEventId(id);
        renderCurrentRoute();
      },
      onRefresh: () => renderCurrentRoute()
    });
    announce("Navigated to My Events.");
    return content;
  }

  if (route.path === "new") {
    const content = renderNewEventFlow({
      onComplete: (newEvent) => {
        announce(`Celebration plan created for ${newEvent.title}.`);
      }
    });
    announce("Navigated to New Event creation.");
    return content;
  }

  if (!activeEvent) {
    navigate("#/events");
    return null;
  }

  const activeTab = route.tab || "overview";
  return renderEventDashboardFlow(activeEvent, activeTab);
}

function isDashboardRoute(path, activeEvent) {
  return path === "event" || (path === "home" && Boolean(activeEvent));
}

function mountNewShell(
  appRoot,
  { activeEvent, activeTab, mainViewContent, isEventDashboardRoute, path }
) {
  const shell = renderAppShell({
    activeEvent,
    activeTab,
    mainView: mainViewContent,
    onOpenSettings: openSettingsModal,
    onSwitchEvent: () => renderCurrentRoute(),
    onSelectTab: (tab) => {
      if (activeEvent) navigate(`#/event/${activeEvent.id}/${tab}`);
    },
    onUpdateEvent: () => renderCurrentRoute(),
    announce
  });

  currentMountedPath = isEventDashboardRoute ? "event" : path;
  currentMountedEventId = activeEvent ? activeEvent.id : null;
  appRoot.replaceChildren(shell);
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

  if (route.path === "settings") {
    openSettingsModal();
    navigate("#/");
    return;
  }

  const isEventDashboardRoute = isDashboardRoute(route.path, activeEvent);
  const existingShell = appRoot.querySelector(".app-layout-grid");

  if (canUpdateTabInPlace(existingShell, isEventDashboardRoute, activeEvent)) {
    updateActiveTabInPlace(existingShell, activeEvent, route.tab || "overview");
    return;
  }

  const mainViewContent = resolveRouteContent(route, activeEvent);
  if (!mainViewContent) return;

  mountNewShell(appRoot, {
    activeEvent,
    activeTab: route.tab || "overview",
    mainViewContent,
    isEventDashboardRoute,
    path: route.path
  });
}

// Initialise application
document.addEventListener("DOMContentLoaded", () => {
  initRouter((route) => {
    currentRouteState = route;
    renderCurrentRoute();
  });
});
