/**
 * Market intelligence — the Understand-stage view of the market itself:
 * sizing (TAM / SAM / SOM), tracked trends, share of voice, the derived
 * positioning map and competitor watch.
 *
 * This surface used to sit on a tab of the Ideation hub, which reads as a
 * Plan-stage page. Sizing and competitor activity are inputs to planning, not
 * outputs of it, so they now sit beside Audiences & personas under Understand.
 * The GTM strategy tab on the Ideation hub keeps positioning, messaging and
 * alignment — the parts that are authored rather than observed.
 *
 * Everything rendered comes from MarketIntelPanel, which reads the seed
 * collections directly; nothing is computed or fabricated here.
 */

import { Link } from "react-router-dom";
import { PageHeader } from "@/components/marcomm/PageHeader";
import { MarketIntelPanel } from "@/components/marcomm/MarketIntelPanel";

export default function MarketIntelligencePage() {
  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Market intelligence"
        description="Market sizing, trends, share of voice and competitor activity — the market context campaigns are planned against"
      />
      <p className="text-sm text-muted-foreground">
        Positioning, messaging and the campaigns laddering up to each strategy live on the{" "}
        <Link to="/ideas" className="text-primary hover:underline">
          GTM strategy tab of the Ideation hub
        </Link>
        .
      </p>
      <MarketIntelPanel />
    </div>
  );
}
