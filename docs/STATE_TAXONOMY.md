# MarCom state taxonomy

**Source of truth for every status badge in the product.** Derived from the
unions in `src/data/types.ts`; the tone map in
`src/components/marcomm/StatusBadge.tsx` implements it.

Divergence between entity lifecycles is legitimate — an asset's life genuinely
differs from a KPI's. What is *not* legitimate is badge colour meaning different
things on different screens. Colour carries information only if it is fixed.

---

## 1. Colour semantics

| Tone | Meaning | Never used for |
|---|---|---|
| **Muted / grey** | Inert — not started, nothing in motion | Anything actively progressing |
| **Blue** (`info`) | In motion — a machine or process owns it | Anything waiting on a person |
| **Amber** (`warning`) | **A person is the bottleneck** | Machine work, however slow |
| **Red** (`destructive`) | **Blocked, failed, breached or rejected** | Merely "late" or "unstarted" |
| **Green** (`success`) | Complete / healthy | Anything still in flight |

**The two rules that must never bend:**

> Amber *always* means a person is the bottleneck.
> Red *always* means something is broken or breached.

Without these, a user cannot triage a list by colour, which is the entire point
of having colour.

---

## 2. Per-entity states, in lifecycle order

Order is the intended forward path. Exception states are listed separately
because they are exits, not steps.

### Campaign — `CampaignStatus`
`Draft` → `Planned` → `In Approval` → `Approved` → `Live` → `Completed` → `Archived`
Exceptions: `Paused`, `Cancelled`

| State | Tone | Stage |
|---|---|---|
| Draft, Planned | muted | Plan |
| In Approval, Approved | amber / green | Comply |
| Live | green | Activate |
| Paused | blue | Activate |
| Completed, Cancelled | green / red | Measure |
| Archived | muted | Learn |

### Content — `ContentStatus`
`Draft` → `In Review` → `Approved` → `Published` → `Retired` → `Archived`
Exceptions: `Rework`, `Discarded`

| State | Tone | Stage |
|---|---|---|
| Draft | muted | Create |
| Rework | amber | Create |
| In Review | amber | Comply |
| Approved, Published | green | Activate |
| Retired, Archived, Discarded | muted | Learn |

### Communication — `CommunicationStatus`
`Idea` → `Briefed` → `Drafting` → `In Review` → `Approved` → `Scheduled` → `Live` → `Completed` → `Archived`
Exceptions: `Rework`, `Paused`, `Killed`

| State | Tone | Stage |
|---|---|---|
| Idea, Briefed | muted / amber | Plan |
| Drafting | blue | Create |
| Rework | amber | Create |
| In Review | amber | Comply |
| Approved | green | Comply |
| Scheduled, Live | blue / green | Activate |
| Paused | blue | Activate |
| Completed | green | Measure |
| Archived, Killed | muted / red | Learn |

### Asset — `AssetStatus`
`Uploaded` → `Cataloged` → `Approved` → `In Use` → `Archived`
Exceptions: `Rejected`, `Expired`

| State | Tone | Stage |
|---|---|---|
| Uploaded | muted | Create |
| Cataloged | blue | Activate |
| Approved, In Use | green | Activate |
| Rejected | red | Create |
| Expired | red | Govern |
| Archived | muted | Learn |

### Approval — `ApprovalStatus`
`Requested` → `In Review` → `Approved`
Exceptions: `Changes Requested`, `Escalated`, `Rejected`, `Withdrawn`, `Expired`

All pending states (`Requested`, `In Review`, `Changes Requested`, `Escalated`)
are **amber** without exception — an approval is the canonical case of a person
being the bottleneck. `Rejected` and `Expired` are red; `Withdrawn` is muted.

### Idea — `IdeaStatus`
`Draft` → `Scored` → `Approved` → `Promoted` → `Archived`
Exception: `Parked`

All sit in **Plan** except `Archived` (Learn). `Promoted` is blue — the process
owns the hand-off to a campaign.

### Campaign activity — `CampaignActivityStatus`
`Planned` → `In Progress` → `Completed`
Exception: `Blocked` (red, Comply)

### Brief — `BriefStatus`
`Draft` → `In Review` → `Approved`

### Channel execution — `ChannelExecutionStatus`
`draft` → `queued` → `sending` → `sent`
Exception: `failed`

**Casing note:** these five ship lowercase in the data while every other status
is title case. `StatusBadge` normalises the *presentation* to title case via
`displayLabel()` without mutating the stored value, so the badge reads `Sent`
while `execution.status === 'sent'` stays true. Do not "fix" this by rewriting
the data — the lowercase union is load-bearing in comparisons across the app.

### KPI health (derived, not stored)
`On track` (green) · `At risk` (amber) · `Off track` (red) · `No data yet` (muted)

`No data yet` is muted rather than red: absence of measurement is not a failure,
and colouring it red trains users to ignore red.

---

## 3. Adding a state

1. Add it to the union in `src/data/types.ts`.
2. Add it to `statusTones` in `StatusBadge.tsx` — an unmapped status silently
   falls back to muted, which reads as "inert" and will be wrong.
3. Add it to the stage table in `src/lib/lifecycle.ts` so the lifecycle stepper
   can place records in that state.
4. Add it here.

Steps 2 and 3 are the ones that get forgotten; both fail quietly rather than
loudly, so they are worth checking deliberately.
