/**
 * cache.test.js - Unit tests for in-memory LRU response cache
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  ResponseCache,
  generateCacheKey
} from "../../api/_lib/cache.js";

describe("Server Response Cache (LRU + TTL)", () => {
  let cache;

  beforeEach(() => {
    cache = new ResponseCache({ maxEntries: 3, ttlMs: 100 });
  });

  it("should return null on cache MISS", () => {
    assert.equal(cache.get("nonexistent_key"), null);
    assert.equal(cache.has("nonexistent_key"), false);
  });

  it("should return cached value on cache HIT", () => {
    cache.set("key1", { plan: "wedding" });
    assert.equal(cache.has("key1"), true);
    assert.deepEqual(cache.get("key1"), { plan: "wedding" });
  });

  it("should expire items when TTL elapses", async () => {
    cache.set("short_lived", { test: 123 }, 20); // 20ms TTL
    assert.deepEqual(cache.get("short_lived"), { test: 123 });

    await new Promise((r) => setTimeout(r, 40));
    assert.equal(cache.get("short_lived"), null);
    assert.equal(cache.size(), 0);
  });

  it("should evict least-recently-used item when capacity is exceeded", () => {
    cache.set("k1", "val1");
    cache.set("k2", "val2");
    cache.set("k3", "val3");

    // Access k1 so k2 becomes the oldest/LRU
    assert.equal(cache.get("k1"), "val1");

    // Adding 4th item should evict k2 (LRU)
    cache.set("k4", "val4");

    assert.equal(cache.get("k2"), null, "k2 should have been evicted");
    assert.equal(cache.get("k1"), "val1", "k1 should remain");
    assert.equal(cache.get("k3"), "val3", "k3 should remain");
    assert.equal(cache.get("k4"), "val4", "k4 should remain");
    assert.equal(cache.size(), 3);
  });

  it("should generate identical SHA-256 keys for semantically identical objects with different key order", () => {
    const payload1 = { city: "Jaipur", budget: 100000, type: "wedding" };
    const payload2 = { type: "wedding", budget: 100000, city: "Jaipur" };

    const key1 = generateCacheKey("plan:core", payload1, "gemini-2.5-flash-lite");
    const key2 = generateCacheKey("plan:core", payload2, "gemini-2.5-flash-lite");

    assert.equal(key1, key2);
  });

  it("should normalize whitespace in string fields", () => {
    const payload1 = { city: "  Delhi  ", type: "birthday" };
    const payload2 = { city: "Delhi", type: "birthday" };

    const key1 = generateCacheKey("intake", payload1);
    const key2 = generateCacheKey("intake", payload2);

    assert.equal(key1, key2);
  });
});
