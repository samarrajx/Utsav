/**
 * security.js - Common API security middleware and request handlers
 *
 * Enforces:
 * 1. POST method only (405)
 * 2. Content-Type application/json (415)
 * 3. Strict Origin check matching host or localhost (403)
 * 4. 32 KB maximum payload size (413)
 * 5. In-memory per-IP rate limiting (429)
 * 6. Zod input validation (400)
 * 7. Generic error handling (no stack traces / secrets leaked)
 */

export const MAX_BODY_BYTES = 32 * 1024; // 32 KB cap
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const DEFAULT_MAX_REQUESTS_PER_WINDOW = 30; // 30 req / min

// In-memory sliding window rate limiter
const ipRequestHistory = new Map();

/**
 * Reset rate limit cache (useful for testing)
 */
export function resetRateLimits() {
  ipRequestHistory.clear();
}

/**
 * Extract client IP address from standard headers
 * @param {Object} req
 * @returns {string}
 */
export function getClientIP(req) {
  const headers = req.headers || {};
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return headers["x-real-ip"] || req.socket?.remoteAddress || "127.0.0.1";
}

/**
 * Validate that request Origin / Referer matches the server Host or is localhost
 * @param {Object} req
 * @returns {boolean}
 */
export function isOriginAllowed(req) {
  const headers = req.headers || {};
  const origin = headers["origin"];
  const referer = headers["referer"];
  const host = headers["host"] || "localhost";

  // Check origin if present
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const originHost = originUrl.host;
      if (
        originHost === host ||
        originHost.startsWith("localhost") ||
        originHost.startsWith("127.0.0.1") ||
        originHost.endsWith(".vercel.app")
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Check referer if present and no origin
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererHost = refererUrl.host;
      if (
        refererHost === host ||
        refererHost.startsWith("localhost") ||
        refererHost.startsWith("127.0.0.1") ||
        refererHost.endsWith(".vercel.app")
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // If neither Origin nor Referer is present, allow only if host is localhost/test
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host === "test";
}

/**
 * Check if client IP has exceeded the in-memory rate limit
 * @param {string} ip
 * @param {number} [maxRequests=30]
 * @returns {boolean} True if allowed, false if rate limited
 */
export function checkRateLimit(ip, maxRequests = DEFAULT_MAX_REQUESTS_PER_WINDOW) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  let timestamps = ipRequestHistory.get(ip) || [];
  // Prune expired timestamps
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    ipRequestHistory.set(ip, timestamps);
    return false;
  }

  timestamps.push(now);
  ipRequestHistory.set(ip, timestamps);
  return true;
}

/**
 * Parse and validate JSON body with a 32 KB payload cap
 * @param {Object} req
 * @returns {Promise<Object>}
 */
export async function parseJsonBody(req) {
  // If already parsed by Vercel / middleware
  if (req.body && typeof req.body === "object") {
    const raw = JSON.stringify(req.body);
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      const err = new Error("Payload Too Large");
      err.status = 413;
      throw err;
    }
    return req.body;
  }

  // Check content-length header if available
  const contentLength = parseInt(req.headers?.["content-length"] || "0", 10);
  if (contentLength > MAX_BODY_BYTES) {
    const err = new Error("Payload Too Large");
    err.status = 413;
    throw err;
  }

  // If body is already a string
  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body, "utf8") > MAX_BODY_BYTES) {
      const err = new Error("Payload Too Large");
      err.status = 413;
      throw err;
    }
    try {
      return JSON.parse(req.body);
    } catch {
      const err = new Error("Invalid JSON");
      err.status = 400;
      throw err;
    }
  }

  // Read from stream
  return new Promise((resolve, reject) => {
    let raw = "";
    let totalBytes = 0;

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        const err = new Error("Payload Too Large");
        err.status = 413;
        req.destroy();
        reject(err);
        return;
      }
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        const err = new Error("Invalid JSON payload");
        err.status = 400;
        reject(err);
      }
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Universal response sender for both Vercel res and standard Response
 * @param {Object} res
 * @param {number} status
 * @param {Object} data
 * @param {Object} [headers={}]
 */
export function sendResponse(res, status, data, headers = {}) {
  const defaultHeaders = {
    "Content-Type": "application/json",
    ...headers
  };

  if (res && typeof res.status === "function") {
    for (const [k, v] of Object.entries(defaultHeaders)) {
      res.setHeader(k, v);
    }
    return res.status(status).json(data);
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: defaultHeaders
  });
}

/**
 * Wrapper for API handlers enforcing security checks and error handling
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} options
 * @param {import('zod').ZodSchema} [options.schema] - Input schema to validate
 * @param {Function} options.handler - Handler receiving validated data
 * @param {number} [options.rateLimitMax=30] - Max requests per minute
 */
export async function secureApiHandler(req, res, { schema, handler, rateLimitMax = DEFAULT_MAX_REQUESTS_PER_WINDOW }) {
  // 1. Method check: POST only
  if (req.method !== "POST") {
    return sendResponse(res, 405, { error: "Method Not Allowed. Only POST is supported." });
  }

  // 2. Content-Type check
  const contentType = req.headers?.["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return sendResponse(res, 415, { error: "Unsupported Media Type. Expected application/json." });
  }

  // 3. Origin check
  if (!isOriginAllowed(req)) {
    return sendResponse(res, 403, { error: "Forbidden. Untrusted request origin." });
  }

  // 4. Rate limit check
  const ip = getClientIP(req);
  if (!checkRateLimit(ip, rateLimitMax)) {
    return sendResponse(
      res,
      429,
      { error: "Too Many Requests. Rate limit exceeded. Please try again in 1 minute." },
      { "Retry-After": "60" }
    );
  }

  // 5. Parse 32 KB body & validate Zod input schema
  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch (err) {
    const status = err.status || 400;
    return sendResponse(res, status, { error: err.message || "Invalid payload" });
  }

  let validatedData = body;
  if (schema) {
    const parseResult = schema.safeParse(body);
    if (!parseResult.success) {
      return sendResponse(res, 400, {
        error: "Validation Error",
        details: parseResult.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message
        }))
      });
    }
    validatedData = parseResult.data;
  }

  // 6. Execute business handler
  try {
    const result = await handler(validatedData, { req, res });
    return sendResponse(res, 200, result);
  } catch (err) {
    const status = err.status || 500;
    // Log error code only, never user text or secrets
    console.error(`[API_ERROR] ${req.url || "handler"} code=${status} name=${err.name || "Error"}`);

    if (status === 502) {
      return sendResponse(res, 502, { error: "Upstream model returned invalid or off-schema response." });
    }
    if (status === 504) {
      return sendResponse(res, 504, { error: "Upstream request timed out." });
    }

    return sendResponse(res, status, { error: err.message || "An unexpected error occurred." });
  }
}
