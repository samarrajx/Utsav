/**
 * router.js - Lightweight hash router for Utsav
 *
 * Routes:
 * - #/                   -> Overview of active event, or event picker
 * - #/new                -> Intake flow to create new event
 * - #/events             -> My events list & switcher
 * - #/event/:id/:tab     -> Specific event and tab
 * - #/settings           -> Preferences (language, currency, country)
 */

export const ROUTES = {
  HOME: "#/",
  NEW: "#/new",
  EVENTS: "#/events",
  SETTINGS: "#/settings"
};

export const TABS = ["overview", "tasks", "budget", "vendors", "timeline", "guests", "ideas"];

/**
 * Parse current window.location.hash into structured route params
 * @param {string} [hash]
 * @returns {{ path: string, eventId?: string, tab?: string }}
 */
export function parseHash(hash = window.location.hash) {
  const clean = (hash || "#/").replace(/^#\/?/, "");
  const parts = clean.split("/").filter(Boolean);

  if (parts.length === 0) {
    return { path: "home" };
  }

  if (parts[0] === "new") {
    return { path: "new" };
  }

  if (parts[0] === "events") {
    return { path: "events" };
  }

  if (parts[0] === "settings") {
    return { path: "settings" };
  }

  if (parts[0] === "event" && parts[1]) {
    const eventId = parts[1];
    const tab = TABS.includes(parts[2]) ? parts[2] : "overview";
    return {
      path: "event",
      eventId,
      tab
    };
  }

  return { path: "home" };
}

/**
 * Navigate to a hash route programmatically
 * @param {string} route
 */
export function navigate(route) {
  const target = route.startsWith("#") ? route : `#/${route.replace(/^\//, "")}`;
  if (window.location.hash !== target) {
    window.location.hash = target;
  }
}

/**
 * Initialize hash router and listen for route changes
 * @param {Function} onRouteChange - Callback invoked on hash change with parsed route
 * @returns {Function} Teardown function to unsubscribe listener
 */
export function initRouter(onRouteChange) {
  const handler = () => {
    const route = parseHash(window.location.hash);
    onRouteChange(route);
  };

  window.addEventListener("hashchange", handler);
  // Execute immediately on initial load
  handler();

  return () => {
    window.removeEventListener("hashchange", handler);
  };
}
