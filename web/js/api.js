/**
 * api.js - Frontend client for Utsav API with timeout and fallback detection
 *
 * All requests use relative paths (same origin) and application/json.
 * If the API is blocked, unreachable, or returns an error, callers receive
 * a structured failure object allowing instant fallback to baseline.js.
 */

export const API_TIMEOUT_MS = 25000;

let planAbortController = null;
let assistAbortController = null;

/**
 * Abort any currently in-flight plan generation request
 */
export function abortInFlightPlan() {
  if (planAbortController) {
    planAbortController.abort();
    planAbortController = null;
  }
}

/**
 * Get a fresh AbortSignal for plan generation, aborting any previous one
 * @returns {AbortSignal}
 */
export function getPlanAbortSignal() {
  abortInFlightPlan();
  planAbortController = new AbortController();
  return planAbortController.signal;
}

/**
 * Abort any currently in-flight assistant request
 */
export function abortInFlightAssist() {
  if (assistAbortController) {
    assistAbortController.abort();
    assistAbortController = null;
  }
}

/**
 * Get a fresh AbortSignal for assistant chat, aborting any previous one
 * @returns {AbortSignal}
 */
export function getAssistAbortSignal() {
  abortInFlightAssist();
  assistAbortController = new AbortController();
  return assistAbortController.signal;
}

function linkAbortSignal(controller, signal) {
  if (!signal) return;
  if (signal.aborted) {
    controller.abort();
  } else {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
}

async function parseResponseJson(res) {
  try {
    return await res.json();
  } catch {
    return { error: `HTTP ${res.status} response was not valid JSON` };
  }
}

/**
 * Universal safe POST request wrapper
 * @param {string} endpoint - Relative path (e.g. '/api/plan')
 * @param {Object} payload - JSON request payload
 * @param {number} [timeoutMs=25000]
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ ok: boolean, data?: any, status?: number, error?: string }>}
 */
export async function postApi(endpoint, payload, timeoutMs = API_TIMEOUT_MS, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  linkAbortSignal(controller, options.signal);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timer);
    const json = await parseResponseJson(res);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json.error || `Server returned HTTP ${res.status}`
      };
    }

    return {
      ok: true,
      status: res.status,
      data: json
    };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === "AbortError";
    return {
      ok: false,
      status: isTimeout ? 504 : 0,
      error: isTimeout ? "Request timed out" : err.message || "Network error"
    };
  }
}

/**
 * Call /api/intake
 * @param {Object} params
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
export async function fetchIntake(params, options = {}) {
  return postApi("/api/intake", params, API_TIMEOUT_MS, options);
}

/**
 * Call /api/plan for a specific section (core | vendors | ideas)
 * @param {string} section
 * @param {Object} planParams
 * @param {Object} [options]
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
export async function fetchPlanSection(section, planParams, options = {}) {
  return postApi(
    `/api/plan?section=${encodeURIComponent(section)}`,
    {
      ...planParams,
      section
    },
    API_TIMEOUT_MS,
    options
  );
}

/**
 * Call /api/critique to audit a finished plan
 * @param {Object} plan
 * @param {string} [language='en']
 * @param {Object} [options]
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
export async function fetchCritique(plan, language = "en", options = {}) {
  return postApi("/api/critique", { plan, language }, API_TIMEOUT_MS, options);
}

/**
 * Call /api/assist for chat and patches
 * @param {Object} params
 * @param {Object} [options]
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
export async function fetchAssist(params, options = {}) {
  return postApi("/api/assist", params, API_TIMEOUT_MS, options);
}

/**
 * Call /api/vendor-message to draft outreach
 * @param {Object} params
 * @param {Object} [options]
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
export async function fetchVendorMessage(params, options = {}) {
  return postApi("/api/vendor-message", params, API_TIMEOUT_MS, options);
}
