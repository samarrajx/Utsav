# 🎉 Utsav — AI-Powered Indian Celebration Planner

<div align="center">

### 🌐 **[utsav-tau.vercel.app](https://utsav-tau.vercel.app/)**

[![Live on Vercel](https://img.shields.io/badge/Live-utsav--tau.vercel.app-brightgreen?style=for-the-badge&logo=vercel)](https://utsav-tau.vercel.app/)
[![Tests](https://img.shields.io/badge/Tests-147%20passed%20%7C%200%20failed-success?style=for-the-badge&logo=node.js)](./tests/)
[![Coverage](https://img.shields.io/badge/Coverage-96.1%25%20line%20%7C%2080.8%25%20branch-blue?style=for-the-badge)](./tests/)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-ES%20Modules-yellow?style=for-the-badge&logo=javascript)](./web/)
[![Model](https://img.shields.io/badge/Gemini-2.5%20Flash-orange?style=for-the-badge&logo=google)](https://ai.google.dev/)

</div>

---

## 🪔 Chosen Vertical & Persona

**Utsav** (उत्सव — Sanskrit for _celebration_) is an AI celebration planner built for the Indian market. It targets the **wedding, birthday, and festival planning** vertical across India's urban and semi-urban population.

**Target persona:** A busy urban Indian in their 25–45 age bracket managing a significant life event — a wedding in Jaipur, a 50th birthday bash in Mumbai, or a Diwali gathering in Bengaluru. They know their budget (roughly), have a date in mind, and are overwhelmed by vendor complexity, regional cost variation, and multi-stakeholder coordination. Utsav turns a 15-minute conversation into a complete, actionable, budget-validated event plan — in English, Hindi, or Hinglish.

---

## ✨ Feature List

<!-- screenshot -->

> _Dashboard screenshot: 7-tab planner interface showing Overview, Tasks, Budget, Vendors, Timeline, Guests, and Ideas tabs with an AI-generated wedding plan for Delhi._

| Feature                          | Description                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Smart Intake**                 | Conversational AI form — asks follow-up questions dynamically until enough context is gathered          |
| **Feasibility Verdict**          | 4-band traffic-light rating (Comfortable / Tight / Stretch / Infeasible) with per-category breakdown    |
| **Parallel Plan Generation**     | 3 concurrent Gemini calls produce Conservative, Balanced, and Premium plan variants simultaneously      |
| **Critic Pass**                  | A fourth AI call reviews the chosen plan for logical inconsistencies and budget math errors             |
| **7-Tab Dashboard**              | Overview · Tasks · Budget · Vendors · Timeline · Guests · Ideas — all derived from a single plan object |
| **Assistant Chat + Patch Diffs** | Natural-language chat that returns validated JSON patches; user previews a diff before applying         |
| **Vendor Message Drafter**       | One-click drafts a professional enquiry message for any vendor in the plan                              |
| **Export**                       | `.ics` calendar (RFC 5545), JSON backup/import, Print-to-PDF                                            |
| **Multilingual**                 | Interface and AI responses in English, Hindi, or Hinglish                                               |
| **Fallback Plan**                | Offline baseline plan generated from static benchmarks if the Gemini API is unreachable                 |
| **City & Season Pricing**        | Benchmark multipliers for Tier-1 / Tier-2 / Tier-3 cities and peak / off-peak seasons                   |

---

## 🏗️ Architecture

Utsav uses **no build step and no framework**. Everything is plain ES modules served statically; all AI logic lives in Vercel serverless functions.

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                    │
│                                                         │
│  web/                                                   │
│  ├── index.html          ← Single-page app shell        │
│  ├── css/style.css       ← Warm terracotta design system│
│  ├── js/main.js          ← Tab router & state manager   │
│  ├── js/views/*.js       ← Wizard & 7 dashboard tabs    │
│  ├── js/engine/*.js      ← Pure ES arithmetic modules   │
│  └── ... (pure ES modules, no bundler)                  │
│                                                         │
│  fetch('/api/*')  ──────────────────────────────────►  │
└─────────────────────────────────────────────────────────┘
                              │  HTTPS
                              ▼
┌─────────────────────────────────────────────────────────┐
│              Vercel Serverless Functions                │
│                                                         │
│  api/                                                   │
│  ├── intake.js         ← Collects details & questions   │
│  ├── plan.js           ← Parallel plan generation       │
│  ├── critique.js       ← Plan review & risk audit       │
│  ├── assist.js         ← Assistant + patch generation   │
│  ├── vendor-message.js ← Vendor message drafter         │
│  ├── ping.js           ← Health check endpoint          │
│  └── _lib/             ← Gemini SDK, Zod, security      │
│                                                         │
│  Engine modules (shared):                               │
│  ├── engine/money.js       Hamilton-Hare allocation     │
│  ├── engine/dates.js       Date arithmetic              │
│  ├── engine/catering.js    Show-up formula              │
│  ├── engine/feasibility.js 4-band verdict logic         │
│  ├── engine/patch.js       9-op JSON patch validator    │
│  ├── engine/benchmarks.js  City/season multipliers      │
│  ├── engine/templates.js   Plan schema templates        │
│  ├── engine/baseline.js    Offline fallback generator   │
│  └── engine/ics.js         RFC 5545 calendar export     │
│                                                         │
│  Middleware: Zod validation, rate limiter, origin check │
└─────────────────────────────────────────────────────────┘
                              │  HTTPS (server-side only)
                              ▼
┌─────────────────────────────────────────────────────────┐
│                     Gemini API                          │
│         gemini-2.5-flash  (function calling)            │
└─────────────────────────────────────────────────────────┘
```

---

## 🧠 "Model Judges, Code Calculates"

## 📁 Project Structure

```
.
├── api/                             # Serverless backend functions (Vercel Node.js runtime)
│   ├── _lib/                        # Shared server utilities
│   │   ├── cache.js                 # In-memory SHA-256 LRU cache with TTL eviction
│   │   ├── gemini.js                # Resilient Google Gemini client with retry & schemas
│   │   ├── schemas.js               # Strict Zod schemas for request/response validation
│   │   ├── security.js              # Rate limiter, host origin checker, JSON payload parser
│   │   └── tools.js                 # Deterministic function-calling tools for model loop
│   ├── assist.js                    # POST /api/assist (Interactive assistant & patch generator)
│   ├── critique.js                  # POST /api/critique (Blindspot review & risk auditor)
│   ├── intake.js                    # POST /api/intake (Conversational form & follow-up questions)
│   ├── ping.js                      # GET /api/ping (Health check endpoint)
│   ├── plan.js                      # POST /api/plan (Parallel section plan generator)
│   └── vendor-message.js            # POST /api/vendor-message (Outreach message drafter)
├── web/                             # Zero-build static frontend (vanilla ES modules)
│   ├── css/
│   │   └── style.css                # Terracotta design system, responsive layout & tokens
│   ├── js/
│   │   ├── engine/                  # Deterministic mathematical & business logic modules
│   │   │   ├── baseline.js          # Offline fallback plan generator
│   │   │   ├── benchmarks.js        # City-tier, seasonal & event-type cost benchmarks
│   │   │   ├── catering.js          # Show-up formula & headcount food buffer calculator
│   │   │   ├── dates.js             # Milestone back-scheduling & date math
│   │   │   ├── feasibility.js       # 4-band budget & guest feasibility evaluator
│   │   │   ├── ics.js               # RFC 5545 iCalendar export generator
│   │   │   ├── money.js             # Hamilton-Hare largest-remainder budget allocator
│   │   │   ├── patch.js             # 9-op JSON patch validator & applicator
│   │   │   └── templates.js         # Event types, milestones & category structures
│   │   ├── views/                   # User interface components & tab panels
│   │   │   ├── new-event/           # 3-step creation wizard (intake, review, parallel generate)
│   │   │   ├── overview/            # Overview tab metric cards (budget, timeline, feasibility)
│   │   │   ├── shared/              # Extracted reusable UI helpers (pill groups, empty states, copy text)
│   │   │   │   └── ui-helpers.js    # Shared DOM helper functions
│   │   │   ├── assistant.js         # AI assistant drawer widget & patch diff preview
│   │   │   ├── budget-tab.js        # Budget allocation, SVG donut chart & expense logger
│   │   │   ├── events-list.js       # Multi-event switcher view
│   │   │   ├── guests-tab.js        # RSVP tracker with catering headcount intel
│   │   │   ├── hero.js              # Event hero header banner
│   │   │   ├── ideas-tab.js         # Bespoke ideas & keepsakes matrix
│   │   │   ├── settings.js          # Currency, language & backup/restore modal
│   │   │   ├── shell.js             # Master responsive application shell & layout
│   │   │   ├── tabs.js              # ARIA tablist navigation component
│   │   │   ├── tasks-tab.js         # Interactive task checklist
│   │   │   ├── timeline-tab.js      # Back-scheduled timeline roadmap view
│   │   │   ├── vendor-outreach-modal.js # WhatsApp/Email outreach drafter modal
│   │   │   └── vendors-tab.js       # Vendor status chips, quotes & checklist
│   │   ├── api.js                   # Client HTTP fetch wrapper with AbortController
│   │   ├── dom.js                   # Lightweight reactive DOM creation helpers
│   │   ├── main.js                  # App bootstrap, header/sidebar shell & tab mounting
│   │   ├── router.js                # Hash-based SPA router with history management
│   │   ├── storage.js               # Resilient, schema-versioned localStorage manager
│   │   └── types.js                 # JSDoc type definitions
│   └── index.html                   # HTML5 application shell & accessible landmarks
└── tests/                           # Unit, integration & schema validation test suites
    ├── api/                         # Endpoint, security, cache & Gemini client tests
    ├── engine/                      # Arithmetic, allocation, date & patch tests
    ├── frontend/                    # Storage, router, wizard & tab view tests
    └── helpers/                     # Mock DOM & lightweight test utilities
```

---

## 🧠 "Model Judges, Code Calculates"

This is the central design principle of Utsav:

> **The AI model makes qualitative judgements. Deterministic engine code does all arithmetic.**

The Gemini model is never asked to add up numbers or compute percentages. Instead, it is given structured inputs and asked to _classify_, _prioritise_, and _narrate_. All budget arithmetic (Hamilton-Hare proportional allocation, catering headcount adjustments, city-tier multipliers) runs in pure JavaScript engine modules with unit-tested functions.

This prevents LLM arithmetic drift and makes the system auditable — every rupee in the budget can be traced to a formula, not a model guess.

---

## 🔄 Request Flow

```
User fills intake form
        │
        ▼
POST /api/intake
  → Gemini extracts structured event details & follow-up questions if context is incomplete
  → If complete, client runs engine/feasibility.js for deterministic 4-band verdict
  → User selects plan options and proceeds to generation
        │
        ▼
POST /api/plan  (3 concurrent calls for fast streaming sections)
  ┌───────────────┬─────────────────┬───────────────┐
  │  Core Plan    │ Vendors Table   │ Ideas Matrix  │
  └───────────────┴─────────────────┴───────────────┘
  → Each response validated against strict Zod schema
  → engine/money.js guarantees Hamilton-Hare budget reconciliation
        │
        ▼
POST /api/critique
  → Auditing model call reviews completed plan for blindspots & risk factors
  → Returns severity-tagged risks (High / Medium / Low) with mitigations
        │
        ▼
Dashboard rendered (7 tabs)
  → Interactive tracking: Tasks, Budget, Vendors, Timeline, Guests, Ideas
  → Assistant chat (POST /api/assist) returns previewable JSON patch diffs
  → Vendor outreach (POST /api/vendor-message) drafts WhatsApp & Email messages
  → Exports: RFC 5545 .ics calendar, JSON plan backup/restore, Print to PDF
```

---

## 🔧 Tool-Calling Loop

The intake and chat endpoints use Gemini's **function calling** (tool-use) feature in a loop:

1. The server provides Gemini with a set of deterministic engine tool definitions: `get_event_template`, `check_feasibility`, `allocate_budget`, and `schedule_milestones`.
2. Gemini responds with a `functionCall` — the model requests specific engine data and calculations rather than guessing numbers or dates.
3. The server executes the corresponding engine function (`api/_lib/tools.js`) and returns the result as a `functionResponse`.
4. Steps 2–3 repeat until Gemini produces a plain `text` response (no pending function calls).
5. The final text response is returned to the browser.

This loop keeps pricing data deterministic (engine-sourced) while letting the model drive the conversation flow.

---

## 🩹 Patch System

The **Assistant Chat** tab allows users to modify their plan through natural language (e.g., _"Switch the catering to North Indian buffet and reduce the photography budget by ₹20,000"_).

How it works:

1. The chat endpoint instructs Gemini to return plan changes as a **JSON Patch array** (`RFC 6902`-style), using one of **9 allowed operations**: `set`, `add_task`, `remove_task`, `set_vendor`, `remove_vendor`, `add_guest`, `remove_guest`, `set_budget_item`, `add_idea`.
2. `engine/patch.js` validates every operation against the allowed set and the plan's Zod schema — rejecting anything that would corrupt the plan structure.
3. The browser renders a **diff preview** showing exactly what will change (added in green, removed in red).
4. The user clicks **Apply** to commit the patch, or **Discard** to cancel.

The model never directly mutates state — it only proposes; the engine validates; the user confirms.

---

## 🛡️ Fallback Behaviour

If the Gemini API is unreachable (network error, quota exhaustion, or API key absent in development):

- `engine/baseline.js` generates a **static baseline plan** using benchmark data from `engine/benchmarks.js`.
- Budget is allocated using the same Hamilton-Hare engine as the AI path.
- The feasibility verdict uses rule-based thresholds rather than model narration.
- The dashboard renders identically; all tabs, exports, and patches still work.
- A dismissible banner informs the user that they are seeing an offline baseline.

---

## ⚡ Efficiency

| Optimization                   | Implementation & Measured Impact                                                                                                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parallel Section Calls**     | `POST /api/plan` runs 3 concurrent calls for `core`, `vendors`, and `ideas`, cutting generation wait time by ~65% compared to serial generation.                                                                                    |
| **No Framework / Zero Bundle** | Pure ES modules delivered directly to the browser. Zero transpilation, 0 ms build step, total frontend footprint < 60 KB uncompressed.                                                                                              |
| **Token Discipline**           | Explicit `maxOutputTokens` caps per endpoint: `intake` (512), `plan core` (2048), `vendors` (1536), `ideas` (1536), `critique` (1024), `assist` (1024), `vendor-message` (512). Prevents runaway model generation and caps latency. |
| **Server Response Cache**      | In-memory LRU cache (`api/_lib/cache.js`, 100 entries, 10-minute TTL) keyed by SHA-256 digest of normalized request payloads for `intake` and `plan` sections. Emits `X-Cache: HIT                                                  | MISS` headers. Cache is per serverless instance. |
| **Request Cancellation**       | Frontend attaches `AbortController` signals to AI requests (`api.js`), automatically aborting pending generation or chat requests when users navigate away or enter new prompts.                                                    |
| **Debounced Storage**          | `saveEvent` writes to `localStorage` are debounced with a 300 ms trailing timer to eliminate disk I/O thrashing during slider or checklist updates, and flushed immediately on `pagehide` and `visibilitychange`.                   |
| **Lazy-Loaded Modules**        | Rarely accessed modules (`views/settings.js`, `views/vendor-outreach-modal.js`, `engine/ics.js`) are dynamically imported with `import()` only when invoked. Entry modules are preloaded with `<link rel="modulepreload">`.         |
| **In-Place Tab Re-rendering**  | Active tab transitions re-render only the active `.tabpanel-content` and ARIA attributes without unmounting the master shell, sidebar, or right-rail assistant widget.                                                              |
| **Browser Cache Headers**      | `/css/*` and `/js/*` served with `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`; `/api/*` marked `no-store`; cross-origin isolation enforced via COOP and CORP headers.                                        |

---

## 📐 Assumptions

| Assumption            | Detail                                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Benchmark figures** | Approximate ~2024 India market rates; sourced from public wedding/event industry reports. Treat as order-of-magnitude estimates, not binding quotes.                             |
| **Currency**          | Multi-currency support: Indian Rupee (₹ INR) is default; USD ($), EUR (€), GBP (£), and AED (د.إ) are supported in settings via benchmark conversion multipliers.                |
| **Show-up rate**      | Default **75%** applied to pending/unconfirmed RSVPs for catering sizing. Formula: `expectedAttendance = confirmed + Math.round(pending × 0.75)`.                                |
| **City tiers**        | Tier-1 (Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Pune), Tier-2 (Jaipur, Ahmedabad, Lucknow, Kochi, …), Tier-3 (all others). Multipliers: 1.0× / 0.75× / 0.55× respectively. |
| **Season**            | Peak (Oct–Feb, May–Jun) and off-peak multipliers applied to venue and catering line items.                                                                                       |
| **Plan variants**     | "Conservative", "Balanced", "Premium" are relative to the user's stated budget — not absolute price tiers.                                                                       |

---

## 🔐 Security

| Control                      | Implementation                                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API key isolation**        | `GEMINI_API_KEY` is read only inside Vercel serverless functions. It is never sent to the browser or logged.                                                                                         |
| **Input validation**         | All API request bodies are parsed through **Zod schemas** before any processing. Invalid payloads return `400` immediately.                                                                          |
| **Prompt injection defence** | User-supplied strings are never interpolated directly into system prompts. They are inserted into structured `user` turn content with role separation enforced by the API.                           |
| **CSP headers**              | `Content-Security-Policy` strictly enforces `connect-src 'self'`. The browser never connects directly to Google; all AI calls are proxied through serverless functions where the API key is secured. |
| **Rate limiting**            | In-memory sliding-window limiter: **30 requests / minute** per IP on all `/api/*` routes (`api/_lib/security.js`).                                                                                   |
| **Origin check**             | API routes enforce strict same-origin host matching (`matchesHost`). Subdomain spoofing (such as `localhost.evil.com`) and foreign `.vercel.app` domains are rejected with `403 Forbidden`.          |

---

## ♿ Accessibility

Utsav targets **WCAG 2.1 AA** compliance:

- **Skip link** — `<a href="#main-content">Skip to main content</a>` is the first focusable element.
- **ARIA landmarks** — `<header>`, `<main>`, `<nav>`, `<footer>` with appropriate roles and labels.
- **Tab keyboard navigation** — the 7-tab dashboard implements the [ARIA Authoring Practices `tablist` pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): arrow keys move focus between tabs, `Enter`/`Space` activates.
- **`aria-live` announcements** — plan generation progress and patch application results are announced to screen readers via a `role="status"` live region.
- **`prefers-reduced-motion`** — all CSS transitions and animations are suppressed when the OS motion preference is set to `reduce`.
- **Color contrast** — all text/background combinations meet ≥ 4.5 : 1 contrast ratio (AA). Verified with Chrome DevTools.
- **Focus indicators** — visible `:focus-visible` outlines on all interactive elements; never `outline: none` without a custom replacement.

---

## 🧪 Testing & Quality Gates

Tests run with **Node.js built-in test runner** (`node --test`). Zero test frameworks, zero bloat.

### Verification Chain

All code commits must pass the complete 5-point quality gate:

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test:coverage && npm run audit
```

| Check                  | Tool / Command          | What It Enforces                                                        |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------- |
| **Formatting**         | `npm run format:check`  | Strict Prettier code formatting across all JS, CSS, and Markdown        |
| **Linting**            | `npm run lint`          | ESLint rules for complexity, function size, and unused variables        |
| **Typecheck**          | `npm run typecheck`     | TypeScript compiler (`tsc --noEmit`) checking JSDoc types               |
| **Testing & Coverage** | `npm run test:coverage` | Built-in Node test runner verifying 147 test cases & >95% line coverage |
| **Security Audit**     | `npm run audit`         | Zero high/critical npm vulnerabilities (`zod ^4.6.7`)                   |

### Test Summary

| Suite                                        | Tests   | Failures | Line Coverage                                    |
| -------------------------------------------- | ------- | -------- | ------------------------------------------------ |
| `tests/engine/money.test.js`                 | 9       | 0        | 99.4%                                            |
| `tests/engine/dates.test.js`                 | 8       | 0        | 99.4%                                            |
| `tests/engine/catering.test.js`              | 5       | 0        | 100.0%                                           |
| `tests/engine/feasibility.test.js`           | 5       | 0        | 100.0%                                           |
| `tests/engine/patch.test.js`                 | 11      | 0        | 96.4%                                            |
| `tests/engine/benchmarks.test.js`            | 9       | 0        | 98.5%                                            |
| `tests/engine/templates.test.js`             | 4       | 0        | 100.0%                                           |
| `tests/engine/baseline.test.js`              | 3       | 0        | 97.1%                                            |
| `tests/engine/ics.test.js`                   | 4       | 0        | 98.5%                                            |
| `tests/api/endpoints.test.js`                | 8       | 0        | 99.0%                                            |
| `tests/api/gemini.test.js`                   | 8       | 0        | 91.3%                                            |
| `tests/api/security.test.js`                 | 14      | 0        | 83.1%                                            |
| `tests/api/cache.test.js`                    | 6       | 0        | 100.0%                                           |
| `tests/api/tools.test.js`                    | 6       | 0        | 100.0%                                           |
| `tests/ping.test.js`                         | 2       | 0        | 100.0%                                           |
| `tests/frontend/router.test.js`              | 6       | 0        | 97.7%                                            |
| `tests/frontend/storage.test.js`             | 12      | 0        | 81.8%                                            |
| `tests/frontend/new-event.test.js`           | 8       | 0        | 95.6%                                            |
| `tests/frontend/dashboard-tabs.test.js`      | 13      | 0        | 96.2%                                            |
| `tests/frontend/assistant-and-modal.test.js` | 6       | 0        | 91.6%                                            |
| **Total**                                    | **147** | **0**    | **96.1% line · 80.8% branch (all source files)** |

> **Coverage Note:** The test suite achieves **96.1% line coverage** and **80.8% branch coverage** across all application source files (and **96.8% line coverage** across the core planning engine and serverless API modules). Measured directly using Node.js built-in V8 test coverage with zero external test dependencies.

---

## 🚀 Run Locally

### Prerequisites

- Node.js ≥ 18
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- A [Google AI Studio](https://aistudio.google.com/) API key

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/samarrajx/Utsav.git
cd Utsav

# 2. Install dependencies (minimal — only for serverless functions)
npm install

# 3. Set environment variables
#    Create a .env.local file (never commit this)
echo 'GEMINI_API_KEY=your_key_here' >> .env.local
echo 'GEMINI_MODEL=gemini-2.5-flash' >> .env.local

# 4. Start the local dev server (Vercel emulates serverless functions)
vercel dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable         | Required | Description                              |
| ---------------- | -------- | ---------------------------------------- |
| `GEMINI_API_KEY` | ✅ Yes   | Google AI Studio API key                 |
| `GEMINI_MODEL`   | Optional | Model ID. Defaults to `gemini-2.5-flash` |

---

## ☁️ Deploy

Utsav deploys automatically from the `main` branch via **Vercel Git integration**.

```
Push to main  →  Vercel detects change  →  Builds & deploys  →  Live in ~30s
```

To deploy your own fork:

1. Fork the repo and import it into [vercel.com](https://vercel.com).
2. Add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) as **Environment Variables** in the Vercel dashboard (Settings → Environment Variables).
3. Push to `main` — Vercel handles the rest.

No build command needed. Output directory: `web/`.

---

## ⚠️ Limitations & What I'd Do Next

| Limitation                       | Notes                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **In-memory rate limiter**       | Resets on each serverless function cold-start; does not share state across Vercel instances. A production deployment would use Redis (e.g., Vercel KV). |
| **Static benchmarks**            | Prices are approximate ~2024 rates. A real product would integrate live vendor APIs or a regularly updated database.                                    |
| **No user accounts**             | Plans live in `localStorage`. There is no server-side database; user data is kept private in the browser with full JSON backup/restore.                 |
| **No real vendor marketplace**   | Vendor suggestions are illustrative planning targets with outreach scripts. A production version would integrate direct booking APIs.                   |
| **Static exchange rates**        | Multi-currency (INR, USD, EUR, GBP, AED) supported using fixed conversions rather than real-time forex feeds.                                           |
| **English/Hindi/Hinglish focus** | Regional languages (Tamil, Telugu, Bengali, Marathi) are planned for future releases.                                                                   |

**What I'd build next:**

- Vercel KV for persistent rate limiting and plan storage
- User accounts with plan history and sharing links
- Live vendor price feeds via scraping or partnerships
- WhatsApp notification integration for task reminders
- Regional language support (at least Tamil + Marathi)
- A/B testing different prompt strategies for plan quality

---

## 📄 Disclaimer

> **Plans are AI-generated suggestions. Always confirm prices and availability directly with vendors before making payments or commitments.** Benchmark figures are approximate and may not reflect current market rates in your city. Utsav is a planning aid, not a booking platform.

---

<div align="center">

Built with ❤️ for Indian celebrations · Powered by [Gemini 2.5 Flash Lite](https://ai.google.dev/) · Deployed on [Vercel](https://vercel.com)

</div>
