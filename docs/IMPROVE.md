# IMPROVE.md — Utsav score-improvement pass

Current evaluation: 93.99/100 (Code Quality 86, Security 98, Efficiency 80, Testing 99, Accessibility 99, Problem Alignment 100).
Goal: lift **Efficiency to 92+** and **Code Quality to 94+** without lowering anything else.
The platform keeps only the latest submission's score, so **nothing may regress**.

## Rules

- **Behaviour-preserving.** The UI, API contracts and stored-data format must not change. All existing tests stay green after every step.
- Commit and push after each phase on `main` (single branch only, no new branches).
- No new runtime dependencies. Dev dependencies only if listed here.
- If a step breaks anything and cannot be fixed quickly, revert that step and move on.
- Measure before and after. Record real numbers; never invent figures in the README.

---

## Phase A — Efficiency (low risk, mostly additive)

**A1. Cache headers (`vercel.json`).**
`/css/*` and `/js/*`: `public, max-age=3600, stale-while-revalidate=86400` (files are not content-hashed, so no `immutable`). `/api/*`: `no-store`. Also add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin`.

**A2. Gemini token discipline (`api/_lib/gemini.js` and endpoints).**
Set `maxOutputTokens` per endpoint (start values: intake 512, plan core 2048, vendors 1536, ideas 1536, critique 1024, assist 1024, vendor-message 512). Tune against real outputs so nothing is truncated. If the SDK supports it, also pass the JSON schema (generated from the Zod schemas) as the response schema to cut malformed output and retries. Keep Zod validation as the final gate.

**A3. Server response cache.**
Small in-memory LRU (max 100 entries, 10-minute TTL) for `intake` and `plan` sections, keyed by SHA-256 of normalised input + language + model. Do not cache `assist`, `critique` or `vendor-message`. Add an `X-Cache: HIT|MISS` header. Add tests for hit, miss, expiry and eviction. Document that the cache is per serverless instance.

**A4. Client request handling.**

- Cancel in-flight AI requests with `AbortController` when the user navigates away, restarts the flow or sends a new assistant message.
- Debounce `saveEvent` writes (300 ms trailing) and flush on `pagehide` and `visibilitychange` so no data is lost.

**A5. Lazy loading.**
Load rarely used modules with dynamic `import()` on first use: vendor outreach modal, `.ics` export, settings view, print view. Add `<link rel="modulepreload">` for the entry modules (`main`, `router`, `storage`, `dom`, `shell`).

**A6. CSS cleanup (`web/css/style.css`).**
Remove the duplicate `@media print` block and any unused selectors (use a script to find classes never referenced in `web/`). Keep one file and no build step. Record the file size before and after.

**A7. Render only what changed.**
`main.js` rebuilds the whole shell with `replaceChildren(shell)`. Change updates so only the active tab panel (or the affected card) re-renders. Preserve focus, scroll position and `aria-live` announcements. Add tests that focus and announcements still work.

**A8. README "Efficiency" section.**
Cover: parallel plan calls, no framework or bundle, token caps, response cache, lazy loading, debounced storage, request cancellation, cache headers. Include only measured numbers.

---

## Phase B — Code Quality (behaviour-preserving refactor)

**B0. Safety net first.**
Before refactoring, add characterisation tests: for each dashboard tab and each new-event step, assert the rendered text and key attributes; for `applyPatch`, add a golden test for **every** allowed operation. These must pass before and after.

**B1. `applyPatch` (`web/js/engine/patch.js`, 297 lines).**
Replace the long function with a `PATCH_HANDLERS` map (one small handler per operation) plus shared helpers. Keep the exported API identical. Target: no function over 60 lines.

**B2. `renderNewEventFlow` (`web/js/views/new-event.js`, 609 lines).**
Split into `web/js/views/new-event/`: `index.js`, `state.js`, `step-basics.js`, `step-details.js`, `step-intake.js`, `step-feasibility.js`, `step-generate.js`. Target: no function over 80 lines.

**B3. `renderOverviewTab` (327 lines).**
Split into `web/js/views/overview/` with one module per card: budget, tasks, milestone, guests, progress, feasibility, risks.

**B4. Other long renderers.**
Apply the same approach to tasks, guests, assistant, budget and the vendor outreach modal (each is 180 to 280 lines). Extract row/card builders into small functions.

**B5. Types.**
Add `web/js/types.js` with JSDoc typedefs for Event, Plan, Milestone, Task, Vendor, Idea, Patch and PatchOp. Reference them in the JSDoc of exported functions. Add `typescript` as a dev dependency and a CI step `tsc --noEmit --allowJs --checkJs` scoped to `web/js/engine` and `api`. Fix the errors it reports.

**B6. Tooling.**
Add Prettier (`.prettierrc`, `npm run format` and `format:check`) and run the check in CI. Add ESLint rules: `max-lines-per-function` (80), `complexity` (12), `eqeqeq`, `prefer-const`. Fix all warnings.

**B7. Constants.**
Move magic numbers (rate limit, timeouts, body size, feasibility thresholds, show-up rate) into named constants with one-line comments.

**B8. Repo hygiene.**
Move `PLAN.md` and this file to `docs/`. Add a short `docs/ARCHITECTURE.md` (modules and data flow). Remove dead code and commented-out blocks.

---

## Phase C — Verification gate (must all pass)

1. `npm run lint`, `format:check`, `tsc` step, and `npm test` pass.
2. Coverage: update `test:coverage` to `node --test --experimental-test-coverage --test-coverage-exclude="tests/**"`, set CI `node-version` to 22, and update the README badge and test table with the real numbers.
3. Every README claim matches the code (tool names, limits, rates, headers, currencies).
4. Manual run on the deployed site: new event, all 7 tabs, assistant patch (preview, apply, undo), vendor message, `.ics`/JSON/print exports, Hindi and Hinglish, and the "API blocked" baseline fallback.
5. Keyboard-only pass and a screen-reader announcement check on the tab changes from A7.
6. Repo under 10 MB, one branch, no secrets, latest commit visible on GitHub and deployed on Vercel.

Report back: a list of changes per phase, the before/after measurements, and anything skipped.
