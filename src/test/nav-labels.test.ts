/**
 * Nav labels are the one string a destination is called by, and PageHeader uses
 * them to drop a heading that only repeats the menu item beneath it.
 *
 * Two things can silently break that, and neither shows up as a type error:
 *  - a list page retitles itself and no longer matches its menu entry, so the
 *    duplicate heading quietly comes back;
 *  - the predicate loosens and starts hiding a *record* title on a detail page,
 *    leaving that page with no visible heading at all.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { NAV_LABELS, duplicatesNavLabel } from "@/lib/navLabels";
import { NAV_KEYS, NAV_KEY_BY_ROUTE } from "@/lib/rbac";

describe("NAV_LABELS", () => {
  it("labels every nav key exactly once", () => {
    for (const key of NAV_KEYS) {
      expect(NAV_LABELS[key], `no label for '${key}'`).toBeTruthy();
    }
    const labels = NAV_KEYS.map((k) => NAV_LABELS[k]);
    expect(new Set(labels).size, `duplicate labels: ${labels.join(", ")}`).toBe(labels.length);
  });

  it("is the sidebar's only source of labels", () => {
    // The sidebar used to carry its own `label:` on each item, which is how the
    // admin matrix drifted from the menu in the first place.
    const sidebar = readFileSync("src/components/layout/AppSidebar.tsx", "utf8");
    expect(sidebar).toContain("NAV_LABELS[item.key]");
    expect(sidebar).not.toMatch(/^\s*label: "/m);
  });
});

describe("duplicatesNavLabel", () => {
  it("recognises a list page titled with its own menu label", () => {
    for (const [route, key] of Object.entries(NAV_KEY_BY_ROUTE)) {
      expect(duplicatesNavLabel(route, NAV_LABELS[key]), route).toBe(true);
    }
  });

  it("ignores case and surrounding space", () => {
    expect(duplicatesNavLabel("/market", "  market INTELLIGENCE ")).toBe(true);
  });

  it("leaves a record title on a detail route alone", () => {
    expect(duplicatesNavLabel("/campaigns/CMP-001", "Aureon Cloud Momentum")).toBe(false);
    expect(duplicatesNavLabel("/content/CNT-004", "Launch blog post")).toBe(false);
    // The nearest miss: a record whose own name starts with the menu label.
    // An exact comparison is what keeps this visible.
    expect(duplicatesNavLabel("/campaigns/CMP-009", "Campaigns Q4 wrap-up")).toBe(false);
  });

  it("matches a section's own label on its detail routes too", () => {
    // Not a bug: the only way to hit this is to name a record after its own
    // section, and the heading is still reachable to screen readers.
    expect(duplicatesNavLabel("/campaigns/CMP-001", "Campaigns")).toBe(true);
  });

  it("says no for routes outside the menu", () => {
    expect(duplicatesNavLabel("/workflow-designer", "Workflow designer")).toBe(false);
    expect(duplicatesNavLabel("/", "Command center")).toBe(false);
  });
});
