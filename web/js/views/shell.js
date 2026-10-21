/**
 * shell.js - Master layout shell for Utsav (Gatherly-inspired)
 *
 * Provides:
 * - Desktop sidebar + mobile hamburger menu
 * - Top bar with event switcher and settings trigger
 * - Main content area with hero banner and tablist
 * - Right rail with Quick Actions and AI Assistant chat teaser
 */

import { el, icon } from "../dom.js";
import { getEvents, getActiveEvent, setActiveEventId } from "../storage.js";
import { navigate } from "../router.js";
import { renderAssistantWidget } from "./assistant.js";

const SIDEBAR_NAV_ITEMS = [
  { id: "overview", label: "Overview", iconName: "sparkles", tab: "overview" },
  { id: "tasks", label: "Tasks", iconName: "checklist", tab: "tasks" },
  { id: "budget", label: "Budget", iconName: "wallet", tab: "budget" },
  { id: "vendors", label: "Vendors", iconName: "building", tab: "vendors" },
  { id: "timeline", label: "Timeline", iconName: "calendar", tab: "timeline" },
  { id: "guests", label: "Guest List", iconName: "users", tab: "guests" },
  { id: "ideas", label: "Ideas", iconName: "heart", tab: "ideas" }
];

function createAppSidebar(
  currentEvent,
  activeTab,
  onSelectTab,
  onOpenSettings,
  toggleMobileSidebar
) {
  return el(
    "aside",
    { className: "app-sidebar", role: "navigation", "aria-label": "Main Sidebar" },
    [
      el("div", { className: "sidebar-brand" }, [
        el("span", { className: "brand-sparkle", "aria-hidden": "true" }, "✦"),
        el("span", { className: "brand-name" }, "Utsav"),
        el("span", { className: "brand-badge" }, "Planner")
      ]),
      el("nav", { className: "sidebar-menu" }, [
        el("div", { className: "sidebar-section-title" }, "EVENT PLANNING"),
        ...SIDEBAR_NAV_ITEMS.map((item) => {
          const isActive = currentEvent && activeTab === item.tab;
          return el(
            "a",
            {
              href: currentEvent ? `#/event/${currentEvent.id}/${item.tab}` : "#/events",
              className: `sidebar-nav-link ${isActive ? "is-active" : ""}`,
              onClick: (e) => {
                toggleMobileSidebar(false);
                if (currentEvent && onSelectTab) {
                  e.preventDefault();
                  navigate(`#/event/${currentEvent.id}/${item.tab}`);
                  onSelectTab(item.tab);
                }
              }
            },
            [icon(item.iconName, "nav-icon"), el("span", {}, item.label)]
          );
        }),
        el("div", { className: "sidebar-section-title" }, "MANAGEMENT"),
        el(
          "a",
          {
            href: "#/events",
            className: "sidebar-nav-link",
            onClick: () => toggleMobileSidebar(false)
          },
          [icon("calendar", "nav-icon"), el("span", {}, "My Events")]
        ),
        el(
          "a",
          {
            href: "#/new",
            className: "sidebar-nav-link sidebar-btn-new",
            onClick: () => toggleMobileSidebar(false)
          },
          [icon("plus", "nav-icon"), el("span", {}, "New Celebration")]
        ),
        el(
          "button",
          {
            type: "button",
            className: "sidebar-nav-link sidebar-btn-settings",
            onClick: () => {
              toggleMobileSidebar(false);
              if (onOpenSettings) onOpenSettings();
            }
          },
          [icon("settings", "nav-icon"), el("span", {}, "Preferences")]
        )
      ])
    ]
  );
}

function createAppTopbar(events, currentEvent, onSwitchEvent, onOpenSettings, toggleMobileSidebar) {
  const eventSelect = el(
    "select",
    {
      className: "topbar-event-select",
      "aria-label": "Select active celebration",
      onChange: (e) => {
        const selectedId = e.target.value;
        if (selectedId === "new") {
          navigate("#/new");
        } else if (selectedId) {
          setActiveEventId(selectedId);
          if (onSwitchEvent) onSwitchEvent(selectedId);
          navigate(`#/event/${selectedId}/overview`);
        }
      }
    },
    [
      ...events.map((evt) =>
        el(
          "option",
          {
            value: evt.id,
            selected: currentEvent && evt.id === currentEvent.id
          },
          evt.title
        )
      ),
      el("option", { value: "new" }, "+ Plan New Event...")
    ]
  );

  return el("header", { className: "app-topbar", role: "banner" }, [
    el("div", { className: "topbar-left" }, [
      el(
        "button",
        {
          type: "button",
          className: "mobile-menu-btn",
          "aria-label": "Toggle navigation menu",
          onClick: () => toggleMobileSidebar()
        },
        [icon("menu")]
      ),
      el("div", { className: "topbar-switcher-wrapper" }, [
        icon("sparkles", "switcher-icon"),
        events.length > 0
          ? eventSelect
          : el("span", { className: "topbar-no-events" }, "No events yet")
      ])
    ]),
    el("div", { className: "topbar-right" }, [
      el(
        "button",
        {
          type: "button",
          className: "btn btn-subtle btn-sm",
          title: "Settings & Preferences",
          onClick: onOpenSettings
        },
        [icon("settings", "btn-icon"), el("span", { className: "hide-mobile" }, "Preferences")]
      ),
      el("a", { href: "#/new", className: "btn btn-primary btn-sm" }, [
        icon("plus", "btn-icon"),
        el("span", { className: "hide-mobile" }, "New Event")
      ])
    ])
  ]);
}

function createAppRightRail(currentEvent, onUpdateEvent, announce) {
  return el(
    "aside",
    { className: "app-right-rail", role: "complementary", "aria-label": "Quick tools" },
    [
      el("div", { className: "right-rail-card card" }, [
        el("h3", { className: "rail-card-title" }, "Quick Actions"),
        el("div", { className: "rail-actions-list" }, [
          el(
            "button",
            {
              type: "button",
              className: "rail-action-btn",
              onClick: () => {
                if (currentEvent) navigate(`#/event/${currentEvent.id}/tasks`);
              }
            },
            [icon("checklist"), "Manage Tasks"]
          ),
          el(
            "button",
            {
              type: "button",
              className: "rail-action-btn",
              onClick: () => {
                if (currentEvent) navigate(`#/event/${currentEvent.id}/budget`);
              }
            },
            [icon("wallet"), "Track Expenses"]
          ),
          el(
            "button",
            {
              type: "button",
              className: "rail-action-btn",
              onClick: () => {
                if (currentEvent) navigate(`#/event/${currentEvent.id}/vendors`);
              }
            },
            [icon("building"), "Vendor Checklist"]
          ),
          el(
            "button",
            {
              type: "button",
              className: "rail-action-btn",
              onClick: () => {
                if (currentEvent) navigate(`#/event/${currentEvent.id}/guests`);
              }
            },
            [icon("users"), "Headcount Maths"]
          )
        ])
      ]),
      currentEvent
        ? renderAssistantWidget(currentEvent, {
            onUpdate: (updated) => {
              if (onUpdateEvent) onUpdateEvent(updated);
            },
            announce
          })
        : el("div", { className: "right-rail-card card assistant-teaser-card" }, [
            el("div", { className: "teaser-header" }, [
              icon("sparkles", "teaser-sparkle"),
              el("h3", { className: "rail-card-title" }, "AI Event Assistant")
            ]),
            el(
              "p",
              { className: "teaser-desc" },
              "Select or create an event to chat with your celebration assistant."
            )
          ])
    ]
  );
}

/**
 * Render the main application frame
 *
 * @param {Object} options
 * @param {Object|null} options.activeEvent
 * @param {string} [options.activeTab='overview']
 * @param {HTMLElement} options.mainView
 * @param {Function} options.onOpenSettings
 * @param {Function} options.onSwitchEvent
 * @param {Function} [options.onSelectTab]
 * @param {Function} [options.onUpdateEvent]
 * @param {Function} [options.announce]
 * @returns {HTMLElement}
 */
export function renderAppShell({
  activeEvent,
  activeTab = "overview",
  mainView,
  onOpenSettings,
  onSwitchEvent,
  onSelectTab,
  onUpdateEvent,
  announce
}) {
  const events = getEvents();
  const currentEvent = activeEvent || getActiveEvent();

  let isSidebarOpen = false;
  const toggleMobileSidebar = (forceState) => {
    isSidebarOpen = forceState !== undefined ? forceState : !isSidebarOpen;
    const sidebarEl = document.querySelector(".app-sidebar");
    if (sidebarEl) sidebarEl.classList.toggle("is-open", isSidebarOpen);
  };

  const sidebar = createAppSidebar(
    currentEvent,
    activeTab,
    onSelectTab,
    onOpenSettings,
    toggleMobileSidebar
  );
  const topbar = createAppTopbar(
    events,
    currentEvent,
    onSwitchEvent,
    onOpenSettings,
    toggleMobileSidebar
  );
  const rightRail = createAppRightRail(currentEvent, onUpdateEvent, announce);

  return el("div", { className: "app-layout-grid" }, [
    sidebar,
    el("div", { className: "app-content-column" }, [
      topbar,
      el("main", { id: "main-content", className: "app-main-content", tabindex: "-1" }, [
        el("div", { className: "content-and-rail-row" }, [
          el("div", { className: "primary-view-container" }, [mainView]),
          rightRail
        ])
      ]),
      el("footer", { className: "app-footer", role: "contentinfo" }, [
        el(
          "p",
          {},
          "Utsav — Plans are AI-assisted suggestions. Confirm prices and availability directly with vendors."
        )
      ])
    ])
  ]);
}
