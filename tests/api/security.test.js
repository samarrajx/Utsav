import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { secureApiHandler, resetRateLimits } from "../../api/_lib/security.js";
import { createMockRequest, createMockResponse } from "../helpers/mock-http.js";
import { z } from "zod";

describe("API Security Middleware", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("should return 405 Method Not Allowed for GET or PUT requests", async () => {
    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await secureApiHandler(req, res, {
      handler: async () => ({ ok: true })
    });

    assert.equal(res.statusCode, 405);
    assert.ok(res.data.error.includes("Method Not Allowed"));
  });

  it("should return 415 Unsupported Media Type if Content-Type is not application/json", async () => {
    const req = createMockRequest({
      headers: { "content-type": "text/plain" }
    });
    const res = createMockResponse();

    await secureApiHandler(req, res, {
      handler: async () => ({ ok: true })
    });

    assert.equal(res.statusCode, 415);
    assert.ok(res.data.error.includes("Unsupported Media Type"));
  });

  it("should return 403 Forbidden for untrusted foreign Origin", async () => {
    const req = createMockRequest({
      headers: {
        host: "utsav.vercel.app",
        origin: "https://evil-attacker-site.com"
      }
    });
    const res = createMockResponse();

    await secureApiHandler(req, res, {
      handler: async () => ({ ok: true })
    });

    assert.equal(res.statusCode, 403);
    assert.ok(res.data.error.includes("Forbidden"));
  });

  it("should allow matching Origin or localhost", async () => {
    const reqLocal = createMockRequest({
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000"
      }
    });
    const resLocal = createMockResponse();

    await secureApiHandler(reqLocal, resLocal, {
      handler: async () => ({ success: true })
    });

    assert.equal(resLocal.statusCode, 200);
    assert.equal(resLocal.data.success, true);
  });

  it("should return 413 Payload Too Large if body exceeds 32 KB", async () => {
    const hugeString = "X".repeat(35 * 1024); // 35 KB
    const req = createMockRequest({
      body: { data: hugeString }
    });
    const res = createMockResponse();

    await secureApiHandler(req, res, {
      handler: async () => ({ success: true })
    });

    assert.equal(res.statusCode, 413);
    assert.ok(res.data.error.includes("Payload Too Large"));
  });

  it("should return 429 Too Many Requests when rate limit is exceeded", async () => {
    const ip = "192.168.1.100";
    const maxRequests = 3;

    for (let i = 0; i < maxRequests; i++) {
      const req = createMockRequest({
        headers: { "x-forwarded-for": ip }
      });
      const res = createMockResponse();
      await secureApiHandler(req, res, {
        rateLimitMax: maxRequests,
        handler: async () => ({ count: i })
      });
      assert.equal(res.statusCode, 200);
    }

    // 4th request must be rejected with 429
    const blockedReq = createMockRequest({
      headers: { "x-forwarded-for": ip }
    });
    const blockedRes = createMockResponse();
    await secureApiHandler(blockedReq, blockedRes, {
      rateLimitMax: maxRequests,
      handler: async () => ({ shouldNotRun: true })
    });

    assert.equal(blockedRes.statusCode, 429);
    assert.ok(blockedRes.data.error.includes("Too Many Requests"));
    assert.equal(blockedRes.headers["retry-after"], "60");
  });

  it("should return 400 Bad Request when input schema validation fails", async () => {
    const schema = z.object({
      guests: z.number().int().positive()
    });

    const req = createMockRequest({
      body: { guests: -5 } // Invalid negative number
    });
    const res = createMockResponse();

    await secureApiHandler(req, res, {
      schema,
      handler: async () => ({ success: true })
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.data.error, "Validation Error");
    assert.ok(Array.isArray(res.data.details));
  });

  it("should map 502 and 504 errors correctly", async () => {
    const req502 = createMockRequest();
    const res502 = createMockResponse();
    await secureApiHandler(req502, res502, {
      handler: async () => {
        const err = new Error("Schema mismatch");
        err.status = 502;
        throw err;
      }
    });
    assert.equal(res502.statusCode, 502);

    const req504 = createMockRequest();
    const res504 = createMockResponse();
    await secureApiHandler(req504, res504, {
      handler: async () => {
        const err = new Error("Timeout");
        err.status = 504;
        throw err;
      }
    });
    assert.equal(res504.statusCode, 504);
  });

  it("should support referer check and string body parsing", async () => {
    // Referer check with no origin header
    const reqWithReferer = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "utsav.vercel.app",
        referer: "https://utsav.vercel.app/new"
      },
      body: JSON.stringify({ test: "valid_string_json" }),
      socket: { remoteAddress: "127.0.0.1" }
    };
    const res = createMockResponse();
    await secureApiHandler(reqWithReferer, res, {
      handler: async (data) => ({ received: data.test })
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.received, "valid_string_json");

    // Invalid JSON string body
    const reqBadString = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "localhost:3000",
        origin: "http://localhost:3000"
      },
      body: "not a valid json {",
      socket: { remoteAddress: "127.0.0.1" }
    };
    const resBad = createMockResponse();
    await secureApiHandler(reqBadString, resBad, {
      handler: async () => ({})
    });
    assert.equal(resBad.statusCode, 400);

    // Foreign referer rejection
    const reqForeignReferer = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "utsav.vercel.app",
        referer: "https://malicious.com/phishing"
      },
      body: {},
      socket: { remoteAddress: "127.0.0.1" }
    };
    const resForeign = createMockResponse();
    await secureApiHandler(reqForeignReferer, resForeign, {
      handler: async () => ({})
    });
    assert.equal(resForeign.statusCode, 403);
  });

  it("should support Web standard Response when res is not Vercel res", async () => {
    const req = createMockRequest({
      body: { ok: true }
    });
    // No res object provided (returns Web standard Response)
    const response = await secureApiHandler(req, null, {
      handler: async () => ({ webStandard: true })
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.webStandard, true);
  });
});
