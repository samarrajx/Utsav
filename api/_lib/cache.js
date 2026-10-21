/**
 * cache.js - In-memory LRU response cache for deterministic & repeated AI requests
 *
 * Implements:
 * - Fixed capacity (default 100 entries)
 * - 10-minute TTL (Time To Live)
 * - SHA-256 digest keys over normalized payloads
 * - LRU eviction when capacity is reached
 * - X-Cache: HIT | MISS header support
 *
 * Note: As standard for serverless functions, this cache is per-instance.
 */

import crypto from "node:crypto";

export const DEFAULT_MAX_CACHE_ENTRIES = 100;
export const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Normalise any JS object recursively to guarantee stable JSON representation
 * @param {any} obj
 * @returns {any}
 */
export function normalizeValue(obj) {
  if (obj === null || typeof obj !== "object") {
    if (typeof obj === "string") return obj.trim();
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizeValue);
  }
  const sortedKeys = Object.keys(obj).sort();
  const normalized = {};
  for (const k of sortedKeys) {
    if (obj[k] !== undefined) {
      normalized[k] = normalizeValue(obj[k]);
    }
  }
  return normalized;
}

/**
 * Generate a deterministic SHA-256 cache key
 * @param {string} endpoint
 * @param {any} payload
 * @param {string} [model=""]
 * @returns {string}
 */
export function generateCacheKey(endpoint, payload, model = "") {
  const norm = normalizeValue(payload);
  const raw = `${endpoint}:${model}:${JSON.stringify(norm)}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export class ResponseCache {
  constructor({ maxEntries = DEFAULT_MAX_CACHE_ENTRIES, ttlMs = DEFAULT_CACHE_TTL_MS } = {}) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.map = new Map(); // Maintains insertion order for LRU
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }

    // Refresh LRU position (delete & re-set to end)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key, value, customTtlMs) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxEntries) {
      // Evict oldest (first item in Map)
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }

    const ttl = typeof customTtlMs === "number" ? customTtlMs : this.ttlMs;
    this.map.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.map.clear();
  }

  size() {
    return this.map.size;
  }
}

// Global shared instances per serverless runtime
export const apiResponseCache = new ResponseCache();
