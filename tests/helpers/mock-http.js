/**
 * mock-http.js - Test helper for creating mock request and response objects
 */

export function createMockRequest({
  method = "POST",
  url = "/api/test",
  headers = {},
  body = {}
} = {}) {
  const defaultHeaders = {
    "content-type": "application/json",
    host: "localhost:3000",
    origin: "http://localhost:3000",
    ...headers
  };

  return {
    method,
    url,
    headers: defaultHeaders,
    body,
    socket: { remoteAddress: "127.0.0.1" }
  };
}

export function createMockResponse() {
  const res = {
    statusCode: null,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
      return this;
    },
    getHeader(key) {
      return this.headers[key.toLowerCase()] || null;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    end() {
      return this;
    }
  };
  return res;
}
