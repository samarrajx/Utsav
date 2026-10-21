import { describe, it } from "node:test";
import assert from "node:assert/strict";
import handler from "../api/ping.js";

describe("API: /api/ping", () => {
  it("should respond with ok: true and timestamp using res mock", async () => {
    let statusCode = null;
    const headers = {};
    let responseData = null;

    const req = { method: "GET" };
    const res = {
      setHeader(key, value) {
        headers[key] = value;
      },
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await handler(req, res);

    assert.equal(statusCode, 200);
    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(responseData.ok, true);
    assert.equal(responseData.message, "pong");
    assert.equal(responseData.service, "Utsav AI Planner");
    assert.ok(typeof responseData.timestamp === "string");
  });

  it("should respond with Web Response object if res is not provided", async () => {
    const req = { method: "GET" };
    const response = await handler(req);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "application/json");

    const data = await response.json();
    assert.equal(data.ok, true);
    assert.equal(data.message, "pong");
    assert.ok(typeof data.timestamp === "string");
  });
});
