import { ENGINE_VERSION } from "./engine/index.js";

/**
 * Announce a message to assistive technology via ARIA live region.
 * @param {string} message
 */
export function announce(message) {
  const el = document.getElementById("live-announcer");
  if (el) {
    el.textContent = message;
  }
}

/**
 * Verify API connectivity
 */
async function checkApiHealth() {
  const statusBadge = document.getElementById("api-status-badge");
  const pingResult = document.getElementById("ping-result");

  try {
    const res = await fetch("/api/ping", {
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (statusBadge) {
      statusBadge.className = "badge badge-success";
      statusBadge.textContent = "Service Online";
    }
    if (pingResult) {
      pingResult.textContent = `Connected to ${data.service} (API: OK, Engine v${ENGINE_VERSION})`;
    }
    announce("Connected to Utsav service successfully.");
  } catch {
    if (statusBadge) {
      statusBadge.className = "badge badge-danger";
      statusBadge.textContent = "Service Offline";
    }
    if (pingResult) {
      pingResult.textContent = "Could not reach the Utsav API. Running in local/offline mode.";
    }
    announce("Could not connect to service. Local mode active.");
  }
}

// Initialise application on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  checkApiHealth();
});
