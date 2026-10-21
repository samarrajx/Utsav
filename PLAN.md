# PLAN.md — Utsav: AI Celebration & Event Planner

Working name: **Utsav** (rename freely; it appears in one config constant).
Challenge: **[Challenge 5] Celebration & Event Planner** — GenAI assistant for weddings, birthdays and community events with budgets, timelines, vendor checklists and personalised ideas.

This file is the single source of truth for the build. Antigravity: follow it phase by phase. Do not add features that are not listed here.

---

## 0. Hard rules (a violation can void the submission)

- Public GitHub repo, **one branch only** (`main`), repo size **< 10 MB**.
- Deployment is **Vercel only**, auto-deployed from `main` (no `gh-pages` branch, no Pages workflow). The GitHub repo is still public and holds the code for submission.
- No secrets in the repo, ever. `.env*` is git-ignored. `.env.example` has placeholder names only.
- Commit and push after every phase, with clear messages.
- README is required (outline in section 12).
- Max 3 submission attempts, so nothing ships until section 13 is fully green.

## 1. What we are building (and how it differs from a plain "prompt → plan" app)

Gemini is not called once to dump a plan. It acts as a **planning agent that calls deterministic tools**, so numbers and dates are always correct and the reasoning is inspectable.

**Principle: the model does judgment and language; code does arithmetic, dates and rules.**

GenAI features (all required):

1. **Smart intake**: the AI asks follow-up questions only for missing context (venue type, city, guest mix, must-haves, constraints).
2. **Feasibility verdict**: engine computes whether the budget fits the guests, city and season; AI explains it and proposes trade-offs.
3. **Plan generation**: budget, timeline, vendor checklist, ideas, each tied to the user's context. Three parallel calls, each shown as it arrives.
4. **Critic pass**: a second model call audits the finished plan for risks and gaps.
5. **Assistant chat with patches**: the user asks in plain words ("make it cheaper", "add a mehendi function"); the AI answers and, when a change is needed, returns a **validated patch** that the user previews as a diff and accepts or rejects.
6. **Vendor message drafter**: one click drafts a WhatsApp or email message to a vendor with the right questions and dates.
7. **Languages**: English, Hindi, Hinglish.

Non-AI features that make it a real tool: guest list with headcount-driven catering maths, expense tracking against the planned budget, calendar export (`.ics`), print/PDF, JSON backup/import, multiple saved events, offline-safe baseline plan.

**Explicitly out of scope:** photo upload, user accounts, a database, payments, real vendor marketplace, live currency rates, share-by-link.

## 2. Architecture

```
Vercel (one project, one origin, deployed from main)                  Gemini
  web/  static frontend  ──fetch('/api/...')──▶  api/*.js  ──@google/genai SDK──▶ structured JSON
  vanilla JS ES modules                          key lives ONLY here (env var)     + function calling
  no framework, no build step                    zod validation, rate limit, tool loop
```

- Frontend: `web/`, plain HTML/CSS/ES modules, hash routing (`#/`, `#/new`, `#/event/:id/:tab`). Vercel serves it as static files (`vercel.json` sets `outputDirectory: "web"` and no build command).
- API: `api/*.js` Vercel functions (Node, ES modules) at the repo root. Set `maxDuration` per function in `vercel.json` to cover model latency. `vercel.json` also sets security headers.
- Frontend and API share one origin, so the browser calls relative paths (`/api/plan`). **No CORS setup and no API base URL config.**
- The pure engine lives in `web/js/engine/` (no DOM, no network) and is imported by **both** the browser and the API, so there is one implementation of budget/date/feasibility logic. Confirm Vercel bundles those imports into the functions (it traces them); add an `includeFiles` entry if it does not.
- Gemini model comes from env `GEMINI_MODEL`. Default to a fast Flash-Lite-class model. **Verify the exact current model name against Google's docs at build time; do not guess.** Larger models were slow enough to time out in similar projects.
- Use the official `@google/genai` SDK.

## 3. Engine (pure functions, fully tested) — `web/js/engine/`

| Module | Responsibility |
|---|---|
| `money.js` | Largest-remainder allocation so category amounts sum **exactly** to the budget; `Intl.NumberFormat` formatting (INR uses lakh/crore grouping) |
| `dates.js` | Back-scheduling milestones from the event date; overdue items pulled forward and flagged "Do now"; injected clock for tests |
| `templates.js` | Per event type: default functions/sub-events, vendor categories, default budget weights, task skeletons |
| `benchmarks.js` | Approximate cost ranges (per-plate food, venue per guest, etc.), city-tier and season multipliers. Stored in INR, converted with a static documented rate table. **Mark every figure as an approximation** and list this in the README assumptions. |
| `feasibility.js` | Compares budget to the minimum realistic cost; returns band (`comfortable`, `tight`, `short`, `unrealistic`), shortfall %, and **computed** trade-offs (e.g. "reduce guests to N", "lower per-plate to X") |
| `catering.js` | Expected attendance = confirmed + pending × assumed show-up rate (default 0.75, documented); per-plate × attendance |
| `patch.js` | Applies an allowlisted patch to a plan and renormalises so budget totals stay exact; returns the new plan plus a human-readable diff |
| `ics.js` | Builds a valid `.ics` file from milestones |
| `baseline.js` | Generates a complete non-AI plan from templates and benchmarks (used when the API fails) |

Default wedding budget weights (from the design reference, adjustable by context): Venue 31, Catering 26, Decor 18, Photography 12, Attire 8, Entertainment 5. Define sensible weights for birthday and community events. Weights must sum to 100 before allocation.

Region and currency: INR default. A settings control offers **country** and **currency** (at least INR, USD, EUR, GBP, AED). Country sets the default currency, the cost multiplier and city-tier labels (India has detailed tiers; other countries use a generic multiplier). Users type budgets in their chosen currency.

## 4. Event data model (stored in `localStorage`, versioned)

```
event {
  schemaVersion, id, type: wedding|birthday|community, title, date, city, countryCode, currency,
  guests: { target, list: [{ id, name, status: confirmed|pending|declined }] },
  budget: { total, categories: [{ id, name, weight, planned, spent }] },
  expenses: [{ id, categoryId, label, amount, date }],
  milestones: [{ id, title, weeksBefore, dueDate, status, overdue }],
  tasks: [{ id, milestoneId, title, due, done }],
  vendors: [{ id, category, status: to_find|contacted|proposal|booked, quote, bookBy, lookFor[], askThem[] }],
  ideas: [{ id, section, title, whyItFits, saved }],
  feasibility, critique, language
}
```

Wrap every storage read/write in try/catch, validate on load, migrate by `schemaVersion`, and survive corrupted or full storage.

## 5. API (Vercel functions) — `api/`

All endpoints: `POST` JSON only, 32 KB body cap, zod-validated input, zod-validated model output, generic error messages, per-IP in-memory rate limit, and an `Origin` check (reject requests whose origin is not the deployment's own host or localhost for dev).

| Endpoint | Purpose | Returns |
|---|---|---|
| `/api/intake` | Given partial context, decide if enough is known | `{ ready: true }` or `{ ready: false, questions: [...] }` (max 4 questions) |
| `/api/plan?section=core\|vendors\|ideas` | Generate one plan section | Core = budget weights + milestones; vendors = checklist; ideas = themed ideas with `whyItFits` |
| `/api/critique` | Audit a finished plan | `{ risks: [{ severity, title, detail, suggestedFix }] }` |
| `/api/assist` | Chat reply plus optional patch | `{ reply, patch? }` |
| `/api/vendor-message` | Draft outreach | `{ channel, subject?, body }` |

**Tool loop** (server side, max 4 iterations, hard timeout): Gemini may call `get_event_template`, `check_feasibility`, `allocate_budget`, `schedule_milestones`. Each tool is a thin wrapper over the engine. If the SDK cannot combine function calling with a response schema, do the tool phase first, then a final structured-output call. If tool calling fails entirely, fall back to "engine computes first, model receives the results as grounded facts".

**Patch allowlist** (anything else is rejected): `set_category_weight`, `set_category_planned`, `add_task`, `remove_task`, `move_milestone`, `add_milestone`, `add_idea`, `remove_idea`, `add_vendor_category`. A patch can never change the budget total unless the user explicitly asked for that, and the engine renormalises so sums stay exact.

**Model call rules**
- Timeout per call, one retry on transient errors only, no retry on 4xx.
- User text reaches the model only as JSON inside clearly tagged data blocks. The system instruction says to treat it as data, never as instructions.
- Output language follows `language` (en/hi/hinglish) but JSON keys and enum values stay in English.
- Logs record error codes only, never user text.

## 6. UI spec (from the attached "Gatherly" dashboard reference)

**Mood:** warm, elegant, celebratory. Blush background, deep maroon primary, rose accents, serif display headings, soft rounded cards with light shadows. Polished but **uncluttered**.

**Starting tokens** (sample from the reference image, then adjust so every pair passes WCAG AA, 4.5:1 for text, 3:1 for borders and focus rings):
- Background `#FCF6F3`, sidebar `#F9EEEA`, surface `#FFFFFF`
- Primary maroon about `#6D2E46`, rose accent about `#D98FA3`, success green, warning amber, error red (each with a text-safe shade)
- Headings: a serif (self-host one subsetted `woff2` under 80 KB, or fall back to `Georgia, serif`); body: system UI stack. **No third-party font or image requests** (CSP).

**Layout (desktop):** left sidebar, top bar, event hero banner, tab bar, card grid, right rail.
- **Sidebar:** Dashboard, My Events, Budget, Timeline, Vendors, Ideas, Guest List, Settings.
- **Top bar:** event switcher and a Settings entry (language, country, currency). No fake notification bell, avatar or upgrade card.
- **Hero banner:** event title, date, guest count, city, "N days to go" (days only, no ticking seconds), "Edit event details". Use a CSS gradient and an inline-SVG floral motif; **no stock photos**.
- **Tabs:** Overview, Tasks, Budget, Vendors, Timeline, Guests, Ideas.
- **Overview cards:** Total Budget (spent/remaining bar), Upcoming Tasks (this month), Next Milestone, Guest List (confirmed/pending/declined bar), Planning Progress ring (tasks, vendors, budget allocated, guests), Feasibility verdict, Critic risks.
- **Right rail:** AI Event Assistant (chat box plus 3 suggested prompts) and Quick Actions (Add Task, Add Expense, Find Vendors, Add Guest, Generate Ideas, Export).
- **Vendors:** cards with category icon (inline SVG), status chip, quote, book-by date, "Draft message".
- **Ideas:** cards with gradient and icon, title, "why it fits you", save (heart) toggle.
- **Budget:** donut chart **plus** an accessible data table with the same values; planned vs spent per category; overspend warnings.

**Mobile (320 px and up):** sidebar becomes a bottom or hamburger nav, cards stack, tabs scroll horizontally.

**Accessibility requirements**
- Semantic landmarks, skip link, every control labelled, visible focus rings.
- Tabs follow the ARIA tablist pattern with arrow-key support.
- Errors linked via `aria-describedby`; focus moves to the first invalid field.
- `aria-live` region announces plan-section progress and patch results.
- Charts and progress rings have text equivalents; colour is never the only signal (status chips carry text).
- `prefers-reduced-motion` respected; print stylesheet produces a clean plan printout.
- Dark mode: nice-to-have, only after everything else passes.

## 7. Key user flows

1. **New event:** pick type → enter date, city, guests, budget, currency, language, must-haves → `/api/intake` may ask up to 4 follow-ups → engine feasibility check shown immediately → user confirms → three plan calls run in parallel with skeleton loaders → critic runs after → dashboard.
2. **Refine:** user types in the assistant → reply plus optional patch → diff preview → Accept applies via `patch.js` (with Undo) or Reject discards.
3. **Track:** tick tasks, log expenses, update guest statuses, set vendor status and quote. Overview, budget alerts and catering maths update instantly with no AI call.
4. **Vendor outreach:** "Draft message" → copyable WhatsApp/email text with the right questions and dates.
5. **Export:** `.ics`, print/PDF, JSON backup, JSON import (validated).
6. **AI down:** if any call fails or times out, show a plain notice, keep what already arrived, and use `baseline.js` for the missing sections, labelled "Basic plan (AI unavailable)". The app never shows a blank error.

## 8. Security checklist (high impact)

- Gemini key only as a Vercel env var; never in the repo, browser, logs or error output.
- Strict zod schemas: allowlisted enums, bounded numbers, date window, length-capped text with control characters stripped, unknown keys rejected, 32 KB body cap.
- Model output validated before it is forwarded; off-schema returns 502.
- Prompt-injection defence: data blocks, explicit instruction, and a test with a hostile input.
- Frontend renders with `textContent` / safe DOM APIs only; **never `innerHTML` with user or model text**.
- CSP via `vercel.json` headers: `default-src 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`. No inline scripts or styles.
- Also set HSTS, `nosniff`, referrer policy and permissions policy in `vercel.json`.
- Same-origin `Origin` check, per-IP rate limit, generic user-facing errors.
- `npm audit` in CI. Pin dependency versions.
- Known limit, stated honestly in the README: in-memory rate limiter is per instance; recommend a Vercel Firewall rule for heavier traffic.

## 9. Efficiency

- No framework, no build step, no runtime dependencies in the browser.
- Parallel section calls, short prompts, `maxOutputTokens` caps, response caching by request hash (in-memory) on the server.
- Engine recompute is local and instant. Lazy-load rarely used modules (ICS, print view).
- Total repo under 10 MB; images avoided; fonts subsetted.

## 10. Testing (`node --test`, no heavy framework)

- **Golden engine tests:** allocation sums exactly for many budgets and weights; date math across month and year boundaries and leap years; overdue handling; feasibility bands at the thresholds; catering maths; patch application and renormalisation; `.ics` validity; baseline plan completeness for each event type and currency.
- **Mocked Gemini tests:** success, malformed JSON, off-schema output, timeout, one retry on 503, no retry on 400, tool-call loop (including max-iteration stop), prompt-injection input treated as data.
- **API handler tests:** 400, 403 (foreign origin), 405, 413, 415, 429, 502, 504.
- **Frontend logic tests:** storage corruption recovery, import validation, formatting.
- **Page checks in CI:** links resolve, no remote resources, one `h1` per view, and an **axe-core** accessibility run (Playwright, API mocked) with zero serious or critical violations.
- Target 90%+ line coverage on `web/js/engine/` and `api/`; show a coverage summary in the README.
- CI (`.github/workflows/ci.yml`): lint, tests with coverage, `npm audit`, on every push.

## 11. Build phases (commit and push after each)

| # | Deliverable | Done when |
|---|---|---|
| 1 | Skeleton: folders, ESLint, `package.json`, CI workflow, `vercel.json`, `.env.example`, `.gitignore` | Empty page and a stub `/api/ping` both live on the Vercel URL; CI green |
| 2 | Engine modules plus golden tests | All engine tests pass |
| 3 | API: validation, Gemini client, tool loop, rate limit, origin check, all five endpoints | Handler and mocked-Gemini tests pass; one real manual call works |
| 4 | Frontend shell: tokens, layout, hash router, storage layer, settings (language/country/currency) | Layout matches the reference at desktop and 320 px |
| 5 | New-event flow: intake, feasibility screen, parallel plan generation, baseline fallback | Works end to end with the real API, and with the API blocked |
| 6 | Dashboard tabs: Overview, Tasks, Budget (donut plus table, expenses), Vendors, Timeline, Guests, Ideas | All tracking updates instantly; accessible tab pattern |
| 7 | Critic, assistant chat with patch diff/accept/undo, vendor message drafter | Each covered by tests and the live-region announcements |
| 8 | Export (`.ics`, print, JSON backup/import), polish, axe clean, README, size check | Section 13 fully green |

## 12. README outline (judges read this first)

1. Chosen vertical and persona
2. What it does (short feature list with a screenshot)
3. Approach and logic: "the model judges, code calculates", with the architecture diagram
4. How it works: request flow, tool-calling loop, patch system, fallback behaviour
5. Assumptions: benchmark figures are approximate, static currency rates, show-up rate, India-first
6. Security
7. Accessibility
8. Testing and coverage
9. Run locally (`vercel dev`), deploy to Vercel, and required env vars (`GEMINI_API_KEY`, `GEMINI_MODEL`); include the live Vercel URL at the top
10. Limitations and what I'd do next

Disclaimer line: plans are AI-generated suggestions; confirm prices and availability with vendors.

## 13. Pre-submission checklist (do not submit until all are true)

- [ ] Repo is public, has exactly one branch, and is under 10 MB
- [ ] No secrets in the repo or git history (`git log -p` search for key patterns)
- [ ] Live Vercel URL loads and a full plan generates with the real key
- [ ] Works with the API blocked (baseline plan appears, labelled)
- [ ] CI is green: lint, tests, coverage, audit, axe
- [ ] Keyboard-only walkthrough of the full flow succeeds
- [ ] Tested at 320 px, tablet and desktop
- [ ] Hindi and Hinglish output tested; INR and at least one other currency tested
- [ ] README complete, with assumptions and limitations
- [ ] Hostile-input test passes (prompt injection, oversized body, bad origin)
- [ ] Check the hackathon deadline and submission-form requirements before using an attempt

## 14. Manual setup (done by Samar, not Antigravity)

1. Create the public repo; keep the default branch as `main`.
2. Get a Gemini API key from Google AI Studio.
3. Import the repo into Vercel (Git integration, production branch `main`).
4. Add env vars `GEMINI_API_KEY` (mark sensitive) and `GEMINI_MODEL` for Production, and for Development if you use `vercel dev`.
5. Put the live Vercel URL at the top of the README.
