/**
 * Routed detail page for one Audience — `/audiences/:id`.
 *
 * This replaces the side sheet the Audiences registry used to open. Everything
 * the sheet showed is here — composed segments, the communications targeting
 * the audience, the audit trail — plus the consent posture and suppression
 * entries that only existed on a separate tab of the list page, so the three
 * facts a targeting decision actually needs are on one screen.
 *
 * THE POPULATION FIGURE IS NOT REACH. An audience is composed of segments and
 * the model carries no overlap data, so a profile in two composed segments is
 * counted twice: AUD-002 "Global employees" is SEG-005 "All employees" (8,200)
 * plus SEG-006 "People managers" (1,150) = 9,350, more employees than the
 * company has. The list page labels this "Segment population … summed, not
 * deduplicated" and this page says exactly the same thing in exactly the same
 * words. Nothing here calls it reach.
 *
 * Scoping (blueprint): agency users get no audience, consent or suppression
 * visibility at all, so for them every audience id resolves to the
 * out-of-scope screen rather than to a record.
 */

import { useParams, Link } from "react-router-dom";
import { Contact, Layers, Send, ShieldBan, UsersRound } from "lucide-react";

import { useLiveDB } from "@/data/useLiveDB";
import { segmentSize } from "@/data/selectors";
import { blockerFor } from "@/data/selectors/blockerSelectors";
import { originOf } from "@/data/selectors/originSelectors";
import type {
  Audience,
  Communication,
  SeedDB,
  Segment,
  SuppressionReason,
} from "@/data/types";
import { useRole, type AppRole } from "@/lib/rbac";
import { isAgencyRestricted, agencyScopeForRole } from "@/lib/agencyScope";
import { fmtCompact, fmtDate, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  KindChip,
  LOW_CONSENT_PCT,
  LowConsentChip,
  ReasonChip,
} from "@/components/marcomm/AudienceChips";
import { DEFAULT_LOCALE } from "@/lib/i18n";

import {
  RecordDetailHeader,
  RecordDetailPage,
  RecordNotFound,
} from "@/components/marcomm/RecordDetail";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { BlockerLine } from "@/components/marcomm/BlockerLine";
import { OriginChip } from "@/components/marcomm/OriginChip";
import { RecordAuditTrail } from "@/components/marcomm/RecordAuditTrail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ------------------------------------------------------------------ */
/* Chips — same tokens the registry uses                               */
/* ------------------------------------------------------------------ */

/** Roles allowed to read Restricted communication subjects. */
const RESTRICTED_READ_ROLES: readonly AppRole[] = [
  "Corporate Comms Manager",
  "CMO",
  "Executive",
  "Platform Admin",
];

const MASKED_SUBJECT = "Restricted communication";

/* ------------------------------------------------------------------ */
/* Derivations (pure over SeedDB — sizes always via segmentSize)       */
/* ------------------------------------------------------------------ */

/**
 * Sum of segmentSize over an audience's composed segments.
 *
 * A plain sum, because the model carries no segment-overlap data: a profile in
 * two composed segments is counted twice. This is the twin of the identically
 * named helper in AudiencesPage — both go through the `segmentSize` selector,
 * so the registry row and the record it opens cannot disagree. Every surface
 * calls the result what it is: the summed segment population, never reach.
 */
function audienceTotalSize(db: SeedDB, audience: Audience): number {
  return audience.segmentIds.reduce((sum, id) => sum + segmentSize(db, id), 0);
}

/** Reverse lookup: communications whose audienceId is this audience. */
function communicationsTargeting(db: SeedDB, audienceId: string): Communication[] {
  return db.communications
    .filter((c) => c.audienceId === audienceId)
    .slice()
    .sort((a, b) => a.subject.localeCompare(b.subject, DEFAULT_LOCALE));
}

/** Campaign a communication rolls up to via its activity, if any. */
function campaignOf(db: SeedDB, comm: Communication) {
  if (!comm.campaignActivityId) return undefined;
  const activity = db.campaignActivities.find((a) => a.id === comm.campaignActivityId);
  if (!activity) return undefined;
  return db.campaigns.find((c) => c.id === activity.campaignId);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AudienceDetail() {
  const db = useLiveDB();
  const { id } = useParams<{ id: string }>();
  const { role } = useRole();

  const audience = db.audiences.find((a) => a.id === id);

  /* Agency users are hard-scoped away from audience, consent and suppression
     data entirely (blueprint), so this is not a per-record assignment check:
     an existing audience is out of scope for them, full stop. */
  const agencyRestricted = isAgencyRestricted(role);
  const agencyScope = agencyScopeForRole(db, role);

  if (!audience || agencyRestricted) {
    return (
      <RecordNotFound
        icon={UsersRound}
        noun="audience"
        id={id}
        backTo="/audiences"
        backLabel="audiences"
        outOfScope={audience !== undefined}
        scopeHint={
          agencyScope?.agencyName
            ? `${agencyScope.agencyName} — audience, consent and suppression data is never shared with an agency`
            : undefined
        }
      />
    );
  }

  const canReadRestricted = RESTRICTED_READ_ROLES.includes(role);

  const segments = audience.segmentIds
    .map((sid) => db.segments.find((s) => s.id === sid))
    .filter((s): s is Segment => Boolean(s));
  const missingSegmentIds = audience.segmentIds.filter(
    (sid) => !db.segments.some((s) => s.id === sid),
  );
  const totalPopulation = audienceTotalSize(db, audience);

  const comms = communicationsTargeting(db, audience.id);
  const personas = db.customerPersonas
    .filter((p) => p.audienceId === audience.id)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, DEFAULT_LOCALE));

  /* Consent posture for the segments this audience composes — one row per
     (segment × channel), exactly as the consent platform records it. */
  const segmentIdSet = new Set(segments.map((s) => s.id));
  const consentRows = db.consentSummaries
    .filter((c) => segmentIdSet.has(c.segmentId))
    .slice()
    .sort((a, b) => a.optedInPct - b.optedInPct);
  const lowConsentRows = consentRows.filter((c) => c.optedInPct < LOW_CONSENT_PCT);
  const consentMin = consentRows.length > 0 ? consentRows[0].optedInPct : null;
  const consentMax =
    consentRows.length > 0 ? consentRows[consentRows.length - 1].optedInPct : null;

  /* Suppression splits in two: entries scoped to this audience, and org-wide
     entries that also suppress against it. They are counted separately because
     they answer different questions — the first is about this audience, the
     second is about everyone. */
  const scopedSuppressions = db.suppressionEntries
    .filter((e) => e.audienceId === audience.id)
    .slice()
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt, DEFAULT_LOCALE));
  const orgWideSuppressions = db.suppressionEntries.filter((e) => !e.audienceId);
  const applyingSuppressions = [...scopedSuppressions, ...orgWideSuppressions];
  const suppressionsByReason = applyingSuppressions.reduce<
    Record<string, number>
  >((acc, e) => {
    acc[e.reason] = (acc[e.reason] ?? 0) + 1;
    return acc;
  }, {});

  const regionCodes = audience.regionIds
    .map((rid) => db.regions.find((r) => r.id === rid)?.code ?? rid)
    .join(", ");
  const stakeholderName = (sid: string): string =>
    db.stakeholders.find((s) => s.id === sid)?.name ?? sid;
  const subjectFor = (c: Communication): string =>
    c.classification === "Restricted" && !canReadRestricted
      ? MASKED_SUBJECT
      : c.subject;

  const facts: { label: string; value: string; hint?: string }[] = [
    { label: "Kind", value: audience.audienceKind },
    { label: "Regions", value: regionCodes || "None listed" },
    { label: "Segments", value: String(audience.segmentIds.length) },
    {
      label: "Segment population",
      value: fmtCompact(totalPopulation),
      // The exact wording the registry uses. It is a sum over overlapping
      // segments, so it is never presented as reach.
      hint: segments.length > 1 ? "summed, not deduplicated" : undefined,
    },
    { label: "Targeted by", value: plural(comms.length, "communication") },
    {
      label: "Suppressions applying",
      value: String(applyingSuppressions.length),
      hint:
        orgWideSuppressions.length > 0
          ? `${orgWideSuppressions.length} org-wide`
          : undefined,
    },
  ];

  return (
    <RecordDetailPage>
      <RecordDetailHeader
        db={db}
        entity="Audience"
        id={audience.id}
        title={audience.name}
        description={`${audience.audienceKind} audience`}
        blocker={blockerFor(db, "Audience", audience.id)}
        backTo="/audiences"
        backLabel="Audiences"
        chipPrefix={<OriginChip info={originOf(db, "Audience", audience.id)} />}
        actions={<KindChip kind={audience.audienceKind} />}
      />

      {/* Key facts */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 md:grid-cols-3 lg:grid-cols-6">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {f.label}
              </div>
              <div className="mt-0.5 truncate text-sm capitalize" title={f.value}>
                {f.value}
              </div>
              {f.hint && (
                <div className="text-[11px] normal-case text-muted-foreground">
                  {f.hint}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs defaultValue="composition">
        <TabsList>
          <TabsTrigger value="composition">Composition</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="consent">Consent &amp; suppression</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------- */}
        {/* Composition — the segments, and who they describe            */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="composition" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Segments ({segments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              {segments.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Layers}
                    title="No segments composed"
                    hint={
                      missingSegmentIds.length > 0
                        ? `This audience lists ${missingSegmentIds.length} segment id(s) that no segment record matches (${missingSegmentIds.join(", ")}), so it has a population of zero and nothing can be targeted through it.`
                        : "An audience is composed of segments, and this one lists none — so it has a population of zero and a communication sent to it would reach nobody. Segments are defined on the Audiences workspace."
                    }
                  />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Segment</TableHead>
                        <TableHead>Criteria</TableHead>
                        <TableHead className="w-32 text-right">Population</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {segments.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            {s.name}
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {s.id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="break-all font-mono text-xs text-muted-foreground">
                              {s.criteria}
                            </span>
                          </TableCell>
                          <TableCell
                            className="text-right text-sm tabular-nums"
                            title={`${segmentSize(db, s.id).toLocaleString(DEFAULT_LOCALE)} profiles`}
                          >
                            {fmtCompact(segmentSize(db, s.id))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* The one sentence this page exists to get right. */}
                  <p className="border-t p-3 text-xs text-muted-foreground">
                    {segments.length > 1 ? (
                      <>
                        These populations sum to{" "}
                        <span className="tabular-nums">
                          {fmtCompact(totalPopulation)}
                        </span>
                        , which is the summed segment population and{" "}
                        <span className="font-medium">not a reach figure</span> — the
                        model carries no overlap data, so a profile in two of these
                        segments is counted twice.
                      </>
                    ) : (
                      <>
                        One composed segment, so the segment population of{" "}
                        <span className="tabular-nums">
                          {fmtCompact(totalPopulation)}
                        </span>{" "}
                        involves no summing. It is still a raw population: consent
                        and suppression are applied at send time, not here.
                      </>
                    )}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Customer personas ({personas.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {personas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No persona is cut against this audience. A persona describes who
                  the people in a cohort actually are; without one, the segment
                  criteria above are the only description this audience has.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {personas.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0"
                    >
                      <Contact
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {p.demographics}
                        </div>
                      </div>
                      <span
                        className="text-xs tabular-nums text-muted-foreground"
                        title={`${p.cohortSize.toLocaleString(DEFAULT_LOCALE)} profiles in the cohort, ${p.consentedPct}% consented`}
                      >
                        {fmtCompact(p.cohortSize)} cohort · {p.consentedPct}% consented
                      </span>
                      {p.consentedPct < LOW_CONSENT_PCT && <LowConsentChip />}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Targeting — what is actually sent to this audience           */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="targeting" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Targeted by communications ({comms.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              {comms.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Send}
                    title="No communication targets this audience"
                    hint="A communication picks its audience when it is drafted, on the Communications workspace. Until one does, this audience is defined but unused."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead className="w-24">Type</TableHead>
                      <TableHead className="w-56">Status</TableHead>
                      <TableHead className="w-48">Campaign</TableHead>
                      <TableHead className="w-32">Scheduled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comms.map((c) => {
                      const campaign = campaignOf(db, c);
                      const masked = subjectFor(c) === MASKED_SUBJECT;
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Link
                              to={`/communications/${c.id}`}
                              className={cn(
                                "font-medium",
                                masked
                                  ? "italic text-muted-foreground hover:underline"
                                  : "text-primary hover:underline",
                              )}
                            >
                              {subjectFor(c)}
                            </Link>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {c.id}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm capitalize">
                            {c.commsType}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={c.status} />
                            <BlockerLine
                              blocker={blockerFor(db, "Communication", c.id, c.status)}
                              className="mt-1 flex max-w-[14rem]"
                            />
                          </TableCell>
                          <TableCell className="text-sm">
                            {campaign ? (
                              <Link
                                to={`/campaigns/${campaign.id}`}
                                className="text-primary hover:underline"
                              >
                                {campaign.name}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">Standalone</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm tabular-nums">
                            {c.scheduledAt ? fmtDate(c.scheduledAt) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- */}
        {/* Consent & suppression — what narrows a send at send time      */}
        {/* ---------------------------------------------------------- */}
        <TabsContent value="consent" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Consent by segment and channel ({consentRows.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              {consentRows.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Layers}
                    title="No consent posture recorded"
                    hint={
                      segments.length === 0
                        ? "Consent is summarized per segment and channel, and this audience composes no segments."
                        : `Consent is summarized per segment and channel; none of this audience's ${plural(segments.length, "segment")} has a summary yet. Summaries arrive from the consent platform.`
                    }
                  />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Segment</TableHead>
                        <TableHead className="w-24">Channel</TableHead>
                        <TableHead className="w-72">Opted in</TableHead>
                        <TableHead className="w-32">Last refreshed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consentRows.map((c) => {
                        const segment = db.segments.find((s) => s.id === c.segmentId);
                        const low = c.optedInPct < LOW_CONSENT_PCT;
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">
                              {segment?.name ?? c.segmentId}
                            </TableCell>
                            <TableCell className="text-sm">{c.channelKind}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Progress
                                  value={c.optedInPct}
                                  className="h-1.5 w-32"
                                  aria-label={`${c.optedInPct}% opted in`}
                                />
                                <span className="w-10 shrink-0 text-sm tabular-nums">
                                  {c.optedInPct}%
                                </span>
                                {low && <LowConsentChip />}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {fmtDate(c.lastRefreshedAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {/* A range, not an average: the segments overlap and differ in
                      size, so averaging their opt-in percentages would invent a
                      figure the data cannot support. */}
                  <p className="border-t p-3 text-xs text-muted-foreground">
                    Opt-in runs from{" "}
                    <span className="tabular-nums">{consentMin}%</span> to{" "}
                    <span className="tabular-nums">{consentMax}%</span> across{" "}
                    {consentRows.length} segment-and-channel pairs
                    {lowConsentRows.length > 0 && (
                      <>
                        , {lowConsentRows.length} of them below {LOW_CONSENT_PCT}%
                      </>
                    )}
                    . These are not averaged into one number: the segments overlap
                    and differ in size, so a single figure would be invented rather
                    than measured.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Suppression ({applyingSuppressions.length} applying)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-0">
              {applyingSuppressions.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={ShieldBan}
                    title="Nothing suppressed against this audience"
                    hint="No entry is scoped to this audience and no org-wide entry exists. Entries are added by Legal/Compliance, Internal Comms or a platform admin, and are enforced at send time by the channel layer."
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 text-sm">
                    <span className="tabular-nums">
                      {scopedSuppressions.length}{" "}
                      <span className="text-muted-foreground">
                        scoped to this audience
                      </span>
                    </span>
                    <span className="tabular-nums">
                      {orgWideSuppressions.length}{" "}
                      <span className="text-muted-foreground">
                        org-wide, which also apply
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {Object.entries(suppressionsByReason).map(([reason, count]) => (
                        <span key={reason} className="flex items-center gap-1">
                          <ReasonChip reason={reason as SuppressionReason} />
                          <span className="text-xs tabular-nums text-muted-foreground">
                            ×{count}
                          </span>
                        </span>
                      ))}
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject key</TableHead>
                        <TableHead className="w-36">Reason</TableHead>
                        <TableHead className="w-28">Channel</TableHead>
                        <TableHead className="w-40">Scope</TableHead>
                        <TableHead className="w-40">Added by</TableHead>
                        <TableHead className="w-28">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applyingSuppressions.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-sm">
                            {e.subjectKey}
                          </TableCell>
                          <TableCell>
                            <ReasonChip reason={e.reason} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {e.channelKind ?? (
                              <span className="text-muted-foreground">All channels</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {e.audienceId === audience.id ? (
                              "This audience"
                            ) : (
                              <span className="text-muted-foreground">Org-wide</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {stakeholderName(e.addedByStakeholderId)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {fmtDate(e.addedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* Why the counts above are not subtracted from the population
                      on the Composition tab. */}
                  <p className="border-t p-3 text-xs text-muted-foreground">
                    Subject keys are masked, so a suppression cannot be matched to a
                    segment member — these counts are not deducted from the segment
                    populations. Suppression is enforced at send time by the channel
                    layer and no approval can override it.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RecordAuditTrail entity="Audience" id={audience.id} />
    </RecordDetailPage>
  );
}
