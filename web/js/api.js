/**
 * api.js - Frontend client for Utsav API with timeout and fallback detection
 *
 * All requests use relative paths (same origin) and application/json.
 * If the API is blocked, unreachable, or returns an error, callers receive
 * a structured failure object allowing instant fallback to baseline.js.
 */

export const API_TIMEOUT_MS = 25000;

/**
 * Universal safe POST request wrapper
 * @param {string} endpoint - Relative path (e.g. '/api/plan')
 * @param {Object} payload - JSON request payload
 * @param {number} [timeoutMs=25000]
 * @returns {Promise<{ ok: boolean, data?: any, status?: number, error?: string }>}
 */
export async function postApi(endpoint, payload, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timer);

    let json = {};
    try {
      json = await res.json();
    } catch {
      json = { error: `HTTP ${res.status} response was not valid JSON` };
    }

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
      error: isTimeout ? "Request timed out" : (err.message || "Network error")
    };
  }
}

/**
 * Call /api/intake
 * @param {Object} params
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
export async function fetchIntake(params) {
  return postApi("/api/intake", params);
}

/**
 * Call /api/plan for a specific section (core | vendors | ideas)
 * @param {string} section
 * @param {Object} planParams
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
export async function fetchPlanSection(section, planParams) {
  return postApi(`/api/plan?section=${encodeURIComponent(section)}`, {
    ...planParams,
    section
  });
}

/**
 * Call /api/critique to audit a finished plan
 * @param {Object} plan
 * @param {string} [language='en']
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
export async function fetchCritique(plan, language = "en") {
  return postApi("/api/critique", { plan, language });
}

/**
 * Call /api/assist for chat and patches
 * @param {Object} params
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
export async function fetchAssist(params) {
  return postApi("/api/assist", params);
}

/**
 * Call /api/vendor-message to draft outreach
 * @param {Object} params
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
export async function fetchVendorMessage(params) {
  return postApi("/api/vendor-message", params);
}
