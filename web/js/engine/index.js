/**
 * index.js - Central barrel export for Utsav Planning Engine
 *
 * Pure ES module (No DOM, No Network dependencies).
 * Imported by both frontend (web/js/...) and backend (api/...).
 */

export const ENGINE_VERSION = "1.0.0";

export * from "./money.js";
export * from "./dates.js";
export * from "./templates.js";
export * from "./benchmarks.js";
export * from "./feasibility.js";
export * from "./catering.js";
export * from "./patch.js";
export * from "./ics.js";
export * from "./baseline.js";
