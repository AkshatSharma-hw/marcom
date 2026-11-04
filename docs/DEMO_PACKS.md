# Industry demo data packs

**Demo data is not decoration.** A prospect decides whether a platform is "for
them" in the first thirty seconds, and they decide it by reading the record
names. Generic data forces them to translate; industry-matched data lets them
go straight to evaluating the product.

A **demo pack** is a complete, self-consistent `SeedDB` written in one
industry's language. Packs are alternatives, never overlays: exactly one is
loaded per build.

---

## 1. What exists today

All four packs are built, tested and selectable.

| Pack | id | Org | Campaigns | Showcase moment |
|---|---|---|---|---|
| Consumer & enterprise technology | `default` | Aureon Group | 20 | A talent licence lapses while the asset is still embedded in live content |
| Renewable energy | `renewable` | Verdanta Group | 11 | A homeowner testimonial's **filmed consent** expires in six weeks while a live campaign still depends on it |
| Cloud & enterprise software | `cloud` | Kestrel | 12 | An outage freezes the campaign whose core claim the incident contradicts |
| Pharmaceutical & life sciences | `lifesciences` | Caldera Therapeutics Group | 11 | A safety-information block moves version and the graph names every asset now non-compliant |

Each pack is a complete `SeedDB` with its own integrity and state-coverage test
(`src/data/seed/packs/*.test.ts`), and the whole application suite passes
against every one of them — a bug found in one pack is found in all.

`PLANNED_DEMO_PACKS` in `src/lib/demoPack.ts` is now empty. It stays in the code
because it is how an unbuilt pack would be declared: a build naming one gets a
specific warning rather than a silent fallback to the default, so a presenter
can never quietly demo the wrong industry after a typo.

---

## 2. Layout

```
src/data/seed/
  packs/
    _shared.ts          ← pack-invariant layer (workflows, roles, channels, taxonomy, date helpers)
    renewable.ts        ← Pack A   + renewable.test.ts
    cloud.ts            ← Pack B   + cloud.test.ts
    lifesciences.ts     ← Pack C   + lifesciences.test.ts
  org.ts, campaigns.ts, …  ← the default pack's collections
  index.ts              ← assembles the default pack, then selects the active pack
src/lib/
  demoPack.ts           ← which pack is active; reads the environment
```

`src/lib/demoPack.ts` imports no seed data on purpose. Importing it must never
pull several thousand records into a bundle that only wanted to know which pack
is running.

---

## 3. Switching packs

Set the env var and restart the dev server (or rebuild). `src/data/seed/index.ts`
reads `activeDemoPackId()` and returns that pack's `SeedDB` from `getSeedDB()`,
so every selector and screen follows automatically.

The active pack is resolved from an environment variable at **build** time:

```sh
# .env.local
VITE_DEMO_PACK=renewable
```

Absent, empty or unrecognised values fall back to `default` — and an
unrecognised value logs a warning naming the built packs, because a silent
fallback would let a salesperson demo the wrong industry to a prospect without
ever learning their typo was ignored.

Vite inlines `import.meta.env.VITE_*` at build time, so switching packs is a
rebuild or a dev-server restart, not a runtime toggle. That is deliberate: the
seed is a frozen object assembled at module load, and a runtime switch would
mean re-deriving every memoised selector mid-session.

```ts
import { activeDemoPackId, activeDemoPack, DEMO_PACKS } from '@/lib/demoPack';

activeDemoPackId();   // 'default' | 'renewable' | 'cloud' | 'lifesciences'
activeDemoPack();     // { id, label, industry, bestFor, showcaseMoment }
```

### Adding a fifth pack

`src/data/seed/index.ts` owns pack selection; pack files never modify it. To add
one:

```ts
// src/lib/demoPack.ts
export type DemoPackId = 'default' | 'renewable' | 'cloud' | 'lifesciences' | 'yourpack';
// …plus a DEMO_PACKS registry entry

// src/data/seed/index.ts
import { yourPack } from './packs/yourpack';
const packs: Record<DemoPackId, SeedDB> = { default: db, renewable: renewablePack,
  cloud: cloudPack, lifesciences: lifesciencesPack, yourpack: yourPack };
```

`DemoPackId` keys `Record<DemoPackId, SeedDB>`, so adding an id without a pack
is a compile error rather than a silent runtime fallback — deliberately.

Nothing else changes: `getSeedDB()` and `assertAllLinksResolve()` already take a
`SeedDB` and work unmodified on any pack.

**Bundle cost.** Packs are imported statically, because the seed is a frozen
object read synchronously by every selector — a dynamic import would mean making
the entire read path async. Four packs put the index chunk at ~1.4 MB (891 KB
with one). That is the right trade for a tool whose competitive point is
switching industry worlds mid-bake-off, but it is real: measure before adding a
fifth, and revisit static imports if it climbs much further.

Two related gaps that live outside the pack files:

- **`src/data/selectors/graphSelectors.ts`** — `ID_PATTERN` and `collections()`
  must know every id prefix a pack uses, or those records are invisible to the
  graph and "Referenced by" returns a confidently wrong empty answer.
- **`src/lib/i18n.ts`** — `SUPPORTED_LOCALES` governs which locales the language
  scope offers. See §6.

---

## 4. What a new pack must provide

### 4.1 The same shapes

Every record is an unmodified type from `src/data/types.ts`. A pack never adds a
field, never widens a union, and never introduces a new id prefix scheme. If a
pack genuinely needs a new state, it goes in the type union and in
`docs/STATE_TAXONOMY.md` first, for every pack.

### 4.2 The same states

This is the part that is easy to lose. A pack that quietly drops its off-track
KPI still looks fine on screen and stops demonstrating anything. Every pack must
carry at minimum:

- 1 active crisis with **frozen sends** and a war-room roster
- 1 resolved crisis, for the archive view
- 2+ **blocked** activities with a named blocker and an SLA breach
- 1 item stuck in **Rework** after a failed check
- 1 asset with rights or consent **expiring within 60 days**
- 1 asset already **expired** but still referenced — the alarming case
- 2 KPIs with **no data**, 2 **at risk**, 1 **off track**
- 1 **failed** channel execution
- 1 **non-waivable legal failure** blocking a launch, whose rejection comment
  names the rule
- 1 **inherited-rule conflict** resolved by override precedence
- 1 **Arabic-language** content item and an Arabic rulebook variant
- 1 agent output **awaiting review**

`packs/<pack>.test.ts` asserts every one of these. Copy Pack A's test file and
change the import; it is written to be pack-agnostic apart from the two
documented unreferenced assets.

The busy entities must also exercise their full status union — Pack A's test
pins `Communication` at 12 distinct statuses, `Content` at 8, `Approval` at 8
and `ChannelExecution` at 5.

### 4.3 Relative dates only

Seed every date as an offset from one anchor, never as a literal. An asset
seeded to expire on a fixed date stops being "expiring soon" the month after it
is written, and the coverage the pack promises quietly disappears.

```ts
import { packDate, packAt, PACK_ANCHOR } from './_shared';

const d = packDate;   // ISO date,      d(41)  → 41 days from the anchor
const at = packAt;    // ISO timestamp, at(-6, '14:00')
```

`PACK_ANCHOR` mirrors `TODAY` in
`src/data/selectors/campaignSelectors.ts` — the app's demo clock. It is
duplicated as a string rather than imported so the seed layer keeps no runtime
dependency on the selector layer; the pack test asserts the two are equal, which
is what stops them drifting. Moving `TODAY` moves the whole pack with it.

`METRIC_WEEK_OFFSETS` and `METRIC_ROLLUP_OFFSETS` give the ten ISO week-start
Mondays the metric grid reports on. The anchor falls inside the last of them, so
that week is partial and its rollup timestamp lands before the anchor.

### 4.4 Graph density

The graph explorer is the differentiator, and a sparse graph makes it look like
a gimmick. Target:

- **every asset referenced by ≥2 content versions**
- **every content version carried by ≥1 channel execution**

so `asset → version → execution → communication → activity → campaign` is a real
path rather than a lucky one.

Two honest exceptions are allowed and must be named in the pack file and in its
test: an `Uploaded` asset and a `Rejected` asset. Linking either into live
content to hit the target would make its status a lie, and an honest hole beats
a convenient link.

### 4.5 Fictional brands, real regulators

Invent the brand names. Do **not** use real company or product names anywhere —
it creates trademark exposure, implies a customer relationship that does not
exist, and gets raised in procurement review.

Real context is what makes the data feel researched: actual regulators (CMA,
SFDA, FDA, EMA), actual compliance regimes (UL 9540A, ISO 27001, SOC 2, PDPL),
and realistic publication archetypes.

### 4.6 Numbers must be derivable or flagged

Every rendered figure has to come from a selector or a seeded fact row. Where a
pack carries an unverified figure — market sizing is the usual case — the caveat
goes **in the data**, in `sourceLabel` and in the first assumption, so it renders
beside the number instead of living in a document nobody opens. Pack A's four
`MarketSizing` rows all carry:

> ILLUSTRATIVE PLACEHOLDER — not verified against a licensed source. Confirm
> against IEA, BNEF or IRENA before any client-facing use.

### 4.7 One MENA/Arabic thread

Required, and not only for the KSA opportunity: it forces the language dimension
to be real rather than theoretical. `REG-MENA` is seeded in `_shared.ts` for
every pack.

---

## 5. What `_shared.ts` owns

Anything that is what the *product* is defined against rather than what the
*demo* is about:

| Shared | Why |
|---|---|
| Workflows and workflow stages | The approval machinery, including SLA hours and which role owns each gate |
| Roles | The `AppRole` union. Every pack seeds exactly one stakeholder per role, so the persona switcher is complete in all of them |
| Channel types and the six channels | `ChannelKind`, plus hard delivery constraints — a subject line truncates at the same character count whichever industry wrote it |
| Status taxonomy | The status unions and `docs/STATE_TAXONOMY.md` |
| Lifecycle stages and the A1..A8 agent roster | How the function runs, not what it sells |
| Positioning frameworks | Reference prompts a strategist fills in |
| Regions | AMER · EMEA · MENA · APAC |
| Date helpers | `PACK_ANCHOR`, `packDate`, `packAt`, the metric week grid |

These are **re-exported** from the default pack's modules rather than copied.
Copying lets packs drift, and a workflow that differs between packs is exactly
the divergence that hides a bug in one pack while it is visible in another.

Two things are added on top of the default pack's versions, because every pack
in the specification needs them and the default dataset predates both:

- `REG-MENA`, a fourth operating region.
- `WF-005`, the crisis-response workflow: parallel clearances on a 30-minute
  SLA, pre-delegated to the crisis lead. Seeded as a real workflow so a crisis
  approval resolves to a stage with a real SLA rather than to a special case.

A pack binds the channels to its own people:

```ts
export const channels = sharedChannels(
  { [CHANNEL_IDS.email]: 'STK-002', /* … one owner per channel … */ },
  ALL_REGION_IDS,
);
```

`sharedChannels` throws if a channel has no owner. An unowned channel produces a
delivery surface nobody is accountable for.

---

## 6. Known gaps

Recorded rather than worked around, because a mislabelled record is worse than a
missing one.

**No UK or US jurisdiction code.** `JurisdictionCode` in `src/data/types.ts` is
`'KSA' | 'GCC' | 'EU' | 'FR' | 'JP' | 'GLOBAL'`. Pack A therefore carries the UK
CMA Green Claims obligations on `JUR-EU` — with the CMA named in the clause text,
since the substance is close enough that material is written once against the
stricter of the two — and the UL 9540A battery-safety requirement on
`JUR-GLOBAL`, scoped to the `battery-storage` product category. Adding a UK or US
code means editing the union, which affects every pack.

**Spanish is not a supported locale.** The Pack A specification lists English,
Arabic, Spanish and German. `SUPPORTED_LOCALES` in `src/lib/i18n.ts` carries
en-US, en-GB, de-DE, fr-FR, ja-JP, hi-IN and ar-SA — no es-ES. Seeding es-ES
content would produce versions the language scope cannot offer, so Pack A ships
en-US, en-GB, ar-SA and de-DE. Adding a pack language means adding the locale to
`SUPPORTED_LOCALES` first.

**"Blocked" is not a `CampaignStatus`.** The pack specification marks two
campaigns Blocked. Per `docs/STATE_TAXONOMY.md` a campaign has no blocked state,
so both are seeded as `In Approval` — which is what they actually are — and their
blockage is carried where the taxonomy puts it: `Blocked` activities with a named
blocking approval and a breached SLA.

**Campaign types are a fixed union.** `CampaignType` has no `investor`,
`partner` or `corporate` value. Pack A maps those to the nearest member and
carries the real character where the app reads it — `commsType: 'investor'` on
the communications, and the audience.

---

## 7. Building the next pack

Pack B and Pack C are materially cheaper than A because the record shapes are
proven. In order:

1. Copy `renewable.ts` and replace the domain language section by section. The
   section numbering in that file is the running order.
2. Copy `renewable.test.ts`, change the import, and update the two documented
   unreferenced asset ids.
3. Add the pack to `DEMO_PACKS` in `src/lib/demoPack.ts` and remove it from
   `PLANNED_DEMO_PACKS`.
4. Add the branch in `src/data/seed/index.ts`.
5. Run `npm run typecheck`, `npx vitest run`, and confirm
   `assertAllLinksResolve(pack)` returns `[]` — the pack test does the last one.

   Use `npm run typecheck` (`tsc -b --force`), **not** `npx tsc --noEmit`. The
   root `tsconfig.json` carries `"files": []` and only project references, and
   `tsc --noEmit` does not follow references — so it exits 0 having checked
   nothing. Two packs shipped with real `AgentRun[]` type errors behind that
   hollow green before it was caught.

6. Prove the pack actually loads rather than silently falling back. A wrong or
   unbuilt id resolves to `default` with a console warning, so a suite can pass
   235/235 against the default data while appearing to test your pack. Assert
   `activeDemoPackId()` inside the run, or check the org name differs.

The pack is finished when its test file passes without any of its assertions
being relaxed.
