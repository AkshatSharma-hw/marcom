# MarComm

MarComm is a demo of an enterprise Communication Operating System — a single environment where communications (marketing campaigns, internal messages, press releases, crisis statements) are conceived, governed, produced, scheduled, and measured. It is a front-end-only proof of concept built on the NST design system: there is no backend, no network layer, and no real AI provider. Everything on screen derives from one seeded, id-linked data graph for a fictional company, **Aureon Group**.

The product vision, module map, personas, and domain model live in [BLUEPRINT.md](BLUEPRINT.md). The seeded data universe is specified in [src/data/SEED_MANIFEST.md](src/data/SEED_MANIFEST.md). A guided walkthrough is in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

## Stack

- React 18.3 + TypeScript 5.8, built with Vite 5 (SWC)
- Tailwind CSS 3.4 + shadcn/ui primitives (Radix), with the shadcn token layer remapped to the NST black theme in `src/index.css`; Poppins typography
- react-router-dom 6 (`BrowserRouter` with `basename="/marcomm/"`)
- TanStack Query, recharts (charts), lucide-react (icons), zod, react-hook-form
- vitest + Testing Library for unit tests; Playwright for e2e smoke tests; ESLint 9

This app follows the `ui/controls` lineage of the suite (scaffold, RBAC, data-driven page help) with the `ui/governance` DataStore ported for localStorage persistence — see BLUEPRINT.md Part 1 for the rationale.

## Running the app

```bash
npm install
```

```bash
npm run dev
```

The dev server listens on port 8091 and the app is served under the `/marcomm/` subpath: open **http://localhost:8091/marcomm/**. The subpath matters — the Vite `base` and the router `basename` are both `/marcomm/`, matching the suite-wide convention that every app deploys under its own path.

Other commands:

```bash
npm run build
```

```bash
npm run lint
```

```bash
npm run test
```

`npm run test` runs the vitest suite and `npm run test:e2e` runs the Playwright smoke tests (see Testing below). `npm run build:dev` produces a development-mode build and `npm run preview` serves the production build locally.

## How the demo works

**Seeded identities, not accounts.** There is no authentication. The `/login` route is a persona picker: you "sign in" as one of eleven seeded people (one per role — CMO, Campaign Manager, Brand Manager, Legal/Compliance Reviewer, Agency User, and so on), defined in `src/lib/rbac.ts` and joined to the seed stakeholder graph. The chosen identity drives navigation visibility (`NAV_RESTRICTIONS`), what the approvals inbox shows, and record-level masking. The default identity is the CMO.

**Scope switcher.** The topbar carries Brand / Business unit / Region selectors (`src/lib/scope.tsx`). Scope is honored by selectors, so KPI tiles, tables, charts, and calendars re-derive when you narrow it — the numbers are computed, not swapped.

**One seed graph.** All data is a single frozen, cross-referenced graph (`getSeedDB()`), with `assertAllLinksResolve(db)` guaranteeing every foreign key resolves. Displayed numbers (budget rollups, KPI attainment, segment sizes) are computed by selector functions over that graph, never stored literals. The anchor date is fixed: the seed pretends today is **2026-08-13**, so "live" campaigns, pending approvals, and this week's calendar always look current.

**Mutations persist locally.** Creates, edits, approvals, and deletions go through the DataStore (`src/store/DataStore.tsx`), which persists changed collections to localStorage under the key `marcomm-store` (with a runtime audit trail). Untouched collections keep rendering from the original seed. The signed-in role persists under `marcomm-role`.

**Resetting the demo.** To return to the pristine seed state, clear the two localStorage keys for the site (DevTools console):

```js
localStorage.removeItem("marcomm-store"); localStorage.removeItem("marcomm-role"); location.reload();
```

or use DevTools → Application → Storage → Clear site data.

**What is real vs simulated.** The data graph, selectors, RBAC/ABAC gating, persistence, and derived analytics are real code paths. The AI is deterministic simulation: one `aiService` seam (`src/services/ai/index.ts`) fronts every AI surface — draft-from-brief, idea-to-campaign proposal, summarization — and the demo binds a simulated provider that composes output from the seed graph. Swapping in a real LLM is a provider change behind the same interface. Channel delivery, email sending, and press distribution are likewise represented as data (ChannelExecution records), not real integrations.

## Architecture

Data flows one way: **seed → selectors → pages**, with the DataStore as the only mutation path.

- `src/data/seed/` — the Aureon Group universe, one file per domain (`org`, `strategy`, `campaigns`, `communications`, `content`, `audience`, `governance`, `money`, `metrics`, `pr`), assembled into a frozen `SeedDB` by `seed/index.ts` and validated by `assertAllLinksResolve`.
- `src/data/selectors/` — pure functions that derive every displayed number (campaign rollups, budget reconciliation, calendar ranges and audience conflicts, KPI attainment, metric series, graph traversal). Scope-aware selectors take the topbar scope as input.
- `src/data/types.ts` — the entity catalog (Campaign, Communication, ChannelExecution, Content/ContentVersion, Journey, CrisisIncident, and the rest) mirroring BLUEPRINT.md Part 7.
- `src/store/DataStore.tsx` — self-registering localStorage collections with CRUD helpers and an audit trail; pages call `useCollection(id, seedArray)` to overlay runtime mutations on the seed.
- `src/lib/rbac.ts` — roles, seeded demo identities, and nav visibility. `src/lib/scope.tsx` — Brand/BU/Region scope context. Pages combine both for ABAC-style gating (for example, `Restricted` records render masked subjects for roles outside the allow list).
- `src/services/ai/` — the `aiService` seam (`generateDraft`, `proposeCampaign`, `summarize`) with the deterministic simulated provider. `src/services/attribution.ts` — five pluggable attribution models (first-touch, last-touch, linear, time-decay, position-based) computed over ChannelExecution touchpoints, compared side by side on the Performance page.
- `src/data/page-help.ts` + `src/components/playbook/` — the data-driven help rail: every page registers a synopsis and an operations playbook, rendered by `HelpRail` / `SynopsisPanel` / `OperationsPlaybook`.
- `src/components/marcomm/` — app-level building blocks (`StatusBadge`, `KpiTile`, `PageHeader`, `GlobalSearch`, `NotificationPopover`, `JourneyCanvas`, `GraphExplorer` support components).
- `src/components/ui/` — shadcn primitives, themed to NST black via token remapping only.

Routes (see `src/App.tsx`): `/dashboard` (command center), `/ideas`, `/campaigns` and `/campaigns/:id`, `/communications`, `/internal`, `/content` and `/content/:id`, `/calendar`, `/approvals`, `/assets`, `/journeys`, `/performance`, `/budget`, `/audiences`, `/pr`, `/agencies`, `/governance`, `/admin` (workflow designer, Platform Admin only), `/graph`, plus `/login`.

## Directory layout

```
ui/marcomm/
├── BLUEPRINT.md              product vision, module map, personas, domain model
├── docs/DEMO_SCRIPT.md       15-minute guided walkthrough
├── src/
│   ├── App.tsx               providers + routes
│   ├── data/
│   │   ├── SEED_MANIFEST.md  binding id universe for the seed graph
│   │   ├── seed/             seed files (org, campaigns, content, pr, …)
│   │   ├── selectors/        derived-number functions
│   │   ├── page-help.ts      per-page synopsis + playbook content
│   │   └── types.ts          entity catalog
│   ├── lib/                  rbac, scope, formatting, csv export, chart palette
│   ├── services/             ai/ (simulated aiService), attribution.ts
│   ├── store/DataStore.tsx   localStorage persistence + audit trail
│   ├── components/
│   │   ├── layout/           AppLayout, sidebar, topbar (scope switcher, search)
│   │   ├── marcomm/          app building blocks
│   │   ├── playbook/         help rail system
│   │   └── ui/               shadcn primitives (NST-themed)
│   ├── pages/                one file per route
│   └── test/                 vitest suites
└── vite.config.ts            base /marcomm/, port 8091
```

## Testing

```bash
npm run test
```

Runs vitest. The main suite is `src/test/data-integrity.test.ts`, which validates the seed graph against the manifest contracts: link resolution, counts, budget reconciliation, approval/stage role agreement, status legality, and selector invariants. `npm run test:watch` runs vitest in watch mode.

```bash
npm run test:e2e
```

Runs the Playwright end-to-end smoke suite (`e2e/smoke.spec.ts`, configured by `playwright.config.ts`). It targets `http://localhost:8091/marcomm/` and reuses an already-running dev server, starting one via `npm run dev` if none is up.
