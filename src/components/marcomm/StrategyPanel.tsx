/**
 * Strategy (GTM) panel — positioning, messaging and alignment for every
 * strategy in scope.
 *
 * Market sizing, trends, share of voice and competitor watch are no longer
 * rendered here: they are observed market context rather than authored
 * strategy, so they live on the Understand-stage Market intelligence page
 * (/market). This panel keeps only what a strategist writes.
 *
 * Planning depth (blueprint Part 5, planning module):
 *  - FR-PP-02 — the framework library: db.positioningFrameworks rendered as
 *    reference data (name, description, field prompts as a definition list),
 *    with the note that enterprise-specific templates plug in identically.
 *  - FR-PP-03 — the messaging hierarchy: one messaging house per strategy
 *    (roof message → pillars with proof points → objection handling).
 *
 * Frameworks hold no campaign content; MessagingHouses hold the filled-in
 * narrative. Both come straight from the seed — nothing is computed here.
 */

import { Link } from "react-router-dom";
import {
  Check,
  Compass,
  Home,
  Library,
  Lightbulb,
  Megaphone,
  MessageSquare,
  Radar,
  Target,
  TriangleAlert,
} from "lucide-react";
import { getSeedDB } from "@/data/seed";
import type { KPI, MessagingHouse } from "@/data/types";
import {
  kpiAttainment,
  orphanCampaigns,
  strategiesInScope,
  strategyAlignment,
} from "@/data/selectors";
import { fmtCurrency } from "@/lib/format";
import { useScope } from "@/lib/scope";
import { EmptyState } from "@/components/marcomm/EmptyState";
import { StatusBadge } from "@/components/marcomm/StatusBadge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatKpiValue(value: number, kpi: KPI): string {
  if (kpi.unit === "USD") {
    return fmtCurrency(value);
  }
  if (kpi.unit === "%") {
    return `${value.toFixed(1)}%`;
  }
  return Math.round(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/* ------------------------------------------------------------------ */
/* FR-PP-02 — framework library (reference data, no campaign content)  */
/* ------------------------------------------------------------------ */

/**
 * The positioning frameworks a strategist can author against. Each framework
 * is a named prompt list; the fields render as a definition list because that
 * is exactly what they are — a term and the guidance for filling it in.
 */
function FrameworkLibrary() {
  const db = getSeedDB();
  const frameworks = db.positioningFrameworks;
  if (frameworks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Library className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Framework library ({frameworks.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          The frameworks a strategist can author positioning against. A framework is
          reference data — a named set of field prompts — so the same strategy can be
          expressed in whichever frame the business unit already works in.
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {frameworks.map((framework) => (
            <AccordionItem key={framework.id} value={framework.id}>
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="flex flex-wrap items-center gap-2 pr-2">
                  <span className="text-sm font-medium">{framework.name}</span>
                  <Badge variant="outline" className="font-normal">
                    {framework.fields.length} fields
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="mb-3 text-sm text-muted-foreground">
                  {framework.description}
                </p>
                <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {framework.fields.map((field) => (
                    <div key={field.label}>
                      <dt className="text-sm font-medium">{field.label}</dt>
                      <dd className="text-xs text-muted-foreground">{field.hint}</dd>
                    </div>
                  ))}
                </dl>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Enterprise-specific templates plug in the same way. A house brand frame, a
          regulator-mandated claim structure or an agency's own canvas is added as one
          more framework — a name, a description and its own field list — with no change
          to the strategies already authored against the frameworks above.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* FR-PP-03 — messaging house (roof → pillars → proof → objections)    */
/* ------------------------------------------------------------------ */

/** The filled-in messaging hierarchy for one strategy. */
function MessagingHouseBlock({ house }: { house: MessagingHouse }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Home className="h-3.5 w-3.5" aria-hidden="true" />
        Messaging house
      </div>

      {/* Roof — the one thing the market must remember. */}
      <div className="rounded-md border border-border bg-muted/40 p-3">
        <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          Primary message
        </div>
        <p className="text-sm font-medium">{house.primaryMessage}</p>
      </div>

      {/* Pillars, each with the evidence that holds it up. */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {house.pillars.map((pillar) => (
          <div key={pillar.title} className="rounded-md border border-border p-3">
            <div className="text-sm font-medium">{pillar.title}</div>
            <ul className="mt-1.5 space-y-1">
              {pillar.proofPoints.map((proof) => (
                <li key={proof} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" aria-hidden="true" />
                  <span>{proof}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Objection handling — pushback and the approved response. */}
      {house.objections.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Objection handling ({house.objections.length})
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/5">Objection</TableHead>
                <TableHead>Approved response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {house.objections.map((item) => (
                <TableRow key={item.objection}>
                  <TableCell className="align-top text-sm font-medium">
                    {item.objection}
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {item.response}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/**
 * Pointer to the market context this strategy is authored against. Market
 * sizing, trends, share of voice and competitor watch moved to the
 * Understand-stage Market intelligence page; this keeps the path obvious from
 * the tab that used to hold them.
 */
function MarketIntelLink() {
  return (
    <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      <Radar className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />
      Market sizing, trends, share of voice and competitor watch now sit under Understand
      on{" "}
      <Link to="/market" className="font-medium text-primary hover:underline">
        Market intelligence
      </Link>
      , alongside audiences and personas.
    </p>
  );
}

/** Warning chip for campaigns that ladder to no strategy. */
function OrphanChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
      <TriangleAlert className="h-3 w-3" aria-hidden="true" />
      Not aligned to strategy
    </span>
  );
}

export function StrategyPanel() {
  const db = getSeedDB();
  const { brandId, businessUnitId, regionId } = useScope();
  const scope = { brandId, businessUnitId, regionId };

  const strategies = strategiesInScope(db, scope);
  const orphans = orphanCampaigns(db, scope);

  const businessUnitName = (id: string): string =>
    db.businessUnits.find((bu) => bu.id === id)?.name ?? id;

  if (strategies.length === 0 && orphans.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={Compass}
          title="No strategies in this scope"
          hint={
            db.strategies.length === 0
              ? "A strategy is what campaigns ladder up to, and none has been authored yet. Authoring one against a framework below is what fills this tab."
              : `${db.strategies.length} ${db.strategies.length === 1 ? "strategy exists" : "strategies exist"}, and none is owned by the business unit currently selected in the top bar. Strategies scope by business unit only — brand and region do not narrow this list.`
          }
        />
        {/* Reference data — scope-independent, so it still has something to say. */}
        <FrameworkLibrary />
        <MarketIntelLink />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Go-to-market (GTM) strategy — positioning, value propositions, objectives and
        KPIs, with the ideas and campaigns that ladder up to each strategy.
      </p>
      <MarketIntelLink />
      <FrameworkLibrary />
      {strategies.map((strategy) => {
        const { ideas, campaigns } = strategyAlignment(db, strategy.id, scope);
        const house = db.messagingHouses.find((h) => h.strategyId === strategy.id);
        return (
          <Card key={strategy.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{strategy.title}</CardTitle>
                <Badge variant="outline">{strategy.horizon}</Badge>
                <span className="text-xs text-muted-foreground">
                  {businessUnitName(strategy.businessUnitId)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Positioning */}
              {strategy.positioning && (
                <div>
                  <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Positioning
                  </div>
                  <p className="text-sm">{strategy.positioning}</p>
                </div>
              )}

              {/* Value propositions */}
              {strategy.valuePropositions && strategy.valuePropositions.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    Value propositions
                  </div>
                  <ul className="space-y-1">
                    {strategy.valuePropositions.map((vp) => (
                      <li key={vp} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                        <span>{vp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Objectives */}
              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Objectives
                </div>
                <ul className="space-y-1">
                  {strategy.objectives.map((objective) => (
                    <li key={objective} className="flex items-start gap-2 text-sm">
                      <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* KPIs */}
              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  KPIs
                </div>
                {strategy.kpiIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No KPIs attached.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {strategy.kpiIds.map((kpiId) => {
                      const kpi = db.kpis.find((k) => k.id === kpiId);
                      if (!kpi) return null;
                      const attainment = kpiAttainment(db, kpiId);
                      return (
                        <li
                          key={kpiId}
                          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                        >
                          <span className="font-medium">{kpi.name}</span>
                          <span className="text-xs text-muted-foreground">
                            target {formatKpiValue(kpi.target, kpi)} · {kpi.period}
                          </span>
                          {attainment ? (
                            <span
                              className={
                                "rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums " +
                                (attainment.attainment >= 1
                                  ? "border-success/20 bg-success/10 text-success"
                                  : attainment.attainment >= 0.7
                                    ? "border-warning/20 bg-warning/10 text-warning"
                                    : "border-destructive/20 bg-destructive/10 text-destructive")
                              }
                            >
                              {Math.round(attainment.attainment * 100)}% ·{" "}
                              {formatKpiValue(attainment.actual, kpi)} actual
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              no results yet
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Messaging house (FR-PP-03) — authored against PFW-003 */}
              {house && (
                <>
                  <Separator />
                  <MessagingHouseBlock house={house} />
                </>
              )}

              <Separator />

              {/* Alignment map */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                    Ideas referencing this strategy ({ideas.length})
                  </div>
                  {ideas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No ideas in scope reference this strategy.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {ideas.map((idea) => (
                        <li key={idea.id} className="flex items-center gap-2 text-sm">
                          <span>{idea.title}</span>
                          <StatusBadge status={idea.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
                    Campaigns laddering up ({campaigns.length})
                  </div>
                  {campaigns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No campaigns in scope ladder to this strategy.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {campaigns.map((campaign) => (
                        <li key={campaign.id} className="flex items-center gap-2 text-sm">
                          <Link
                            to={`/campaigns/${campaign.id}`}
                            className="text-primary hover:underline"
                          >
                            {campaign.name}
                          </Link>
                          <StatusBadge status={campaign.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Orphan campaigns */}
      {orphans.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="h-4 w-4 text-warning" aria-hidden="true" />
              Campaigns without a strategy ({orphans.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {orphans.map((campaign) => (
                <li key={campaign.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    className="text-primary hover:underline"
                  >
                    {campaign.name}
                  </Link>
                  <StatusBadge status={campaign.status} />
                  <OrphanChip />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
