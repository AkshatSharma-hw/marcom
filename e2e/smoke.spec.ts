import { expect, test } from "@playwright/test";
import { kpiValuesSnapshot, seedLocalStorage } from "./helpers";

/**
 * Smoke suite for the MarComm demo app.
 *
 * Every test controls its identity via localStorage ('marcomm-role') seeded
 * through addInitScript before the app boots, and mutation tests start from a
 * fresh DataStore ('marcomm-store' removed) so seed data is deterministic.
 */

const KPI_LABELS = [
  "Total reach",
  "Avg engagement rate",
  "Conversions",
  "Budget utilization",
];

test.describe("app load", () => {
  test.beforeEach(async ({ page }) => {
    await seedLocalStorage(page, { role: "CMO", freshStore: true });
  });

  test("/marcomm/ redirects to the dashboard and renders KPI tiles", async ({ page }) => {
    await page.goto(".");

    await expect(page).toHaveURL(/\/marcomm\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Command center" })).toBeVisible();

    for (const label of KPI_LABELS) {
      // KpiTile renders the label div and the value line as siblings, so the
      // label's parent (CardContent) scopes us to exactly one tile.
      const tile = page
        .getByText(label, { exact: true })
        .locator("..")
        .locator(".text-3xl");
      await expect(tile, `KPI tile '${label}' should have a value`).toHaveText(/\S/);
    }
  });
});

test.describe("navigation", () => {
  test.beforeEach(async ({ page }) => {
    await seedLocalStorage(page, { role: "CMO", freshStore: true });
    await page.goto(".");
    // "/" redirects to the Command center, whose own h1 is now sr-only — so
    // wait on the menu entry that marks the landing instead of the heading.
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Command center", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });

  const destinations: { link: string; heading: string }[] = [
    { link: "Campaigns", heading: "Campaigns" },
    { link: "Content studio", heading: "Content studio" },
    { link: "Calendar", heading: "Calendar" },
    { link: "Approvals", heading: "Approvals" },
  ];

  for (const { link, heading } of destinations) {
    /**
     * The page heading is deliberately not painted when it would only repeat
     * the menu item the user just clicked — the highlighted nav row already
     * names the page. So this checks the two things that must both hold:
     * the h1 still exists for screen readers, and it takes up no visual space.
     *
     * `toBeVisible()` cannot express that: Playwright counts an sr-only element
     * (1px, clipped) as visible, so it would pass either way and catch nothing.
     */
    test(`sidebar link '${link}' lands on its page without repeating the label`, async ({
      page,
    }) => {
      const navLink = page
        .getByRole("navigation")
        .getByRole("link", { name: link, exact: true });
      await navLink.click();

      await expect(navLink).toHaveAttribute("aria-current", "page");

      const h1 = page.getByRole("heading", { level: 1, name: heading, exact: true });
      await expect(h1).toBeAttached();
      const box = await h1.boundingBox();
      expect(box, `no box for the '${heading}' heading`).not.toBeNull();
      expect(
        box!.height,
        `'${heading}' is painted again below the menu item of the same name`,
      ).toBeLessThanOrEqual(1);
    });
  }

  /**
   * The counterpart rule: below the sidebar's breakpoint the menu is a drawer
   * the user has to open, so nothing on screen names the page — and the
   * heading has to come back, or the page loses its title entirely.
   */
  test("narrow viewport keeps the page heading, since the menu is a drawer there", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("./campaigns");

    const h1 = page.getByRole("heading", { level: 1, name: "Campaigns", exact: true });
    await expect(h1).toBeVisible();
    const box = await h1.boundingBox();
    expect(box!.height, "heading is hidden with no menu on screen to replace it").toBeGreaterThan(
      1,
    );
  });
});

test.describe("scope selector", () => {
  test.beforeEach(async ({ page }) => {
    await seedLocalStorage(page, { role: "CMO", freshStore: true });
  });

  test("selecting a brand changes at least one KPI tile", async ({ page }) => {
    await page.goto(".");
    await expect(page.getByRole("heading", { name: "Command center" })).toBeVisible();

    const before = await kpiValuesSnapshot(page);
    expect(before).not.toBe("");

    /* The inline scope row only renders from 1320px — below that the header
       cannot hold it and a compact "Filters" popover carries the same controls.
       Desktop Chrome's default viewport is narrower than the threshold, so open
       the popover when the inline control is not on screen. This exercises the
       path a user at this width actually takes; the assertion below is
       unchanged either way. */
    const brand = page.getByRole("combobox").filter({ hasText: "All brands" });
    if (!(await brand.isVisible())) {
      await page.getByRole("button", { name: "Scope filters" }).click();
    }
    await brand.click();
    await page.getByRole("option", { name: "Volt", exact: true }).click();

    await expect
      .poll(() => kpiValuesSnapshot(page), {
        message: "KPI tiles should re-derive when the brand scope narrows",
      })
      .not.toBe(before);
  });
});

test.describe("RBAC navigation visibility", () => {
  test("Content Manager does not see restricted nav items", async ({ page }) => {
    await seedLocalStorage(page, { role: "Content Manager", freshStore: true });
    await page.goto(".");
    await expect(page.getByRole("heading", { name: "Command center" })).toBeVisible();

    // Anchor on an always-visible sibling so we know the sidebar rendered.
    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Governance & crisis" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Administration" })).toHaveCount(0);
  });

  test("Platform Admin sees restricted nav items", async ({ page }) => {
    await seedLocalStorage(page, { role: "Platform Admin", freshStore: true });
    await page.goto(".");
    await expect(page.getByRole("heading", { name: "Command center" })).toBeVisible();

    const nav = page.getByRole("navigation");
    await expect(nav.getByRole("link", { name: "Governance & crisis" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Administration" })).toBeVisible();
  });
});

test.describe("ABAC restricted-incident masking", () => {
  test("Content Manager is blocked at the route and never sees incident detail", async ({
    page,
  }) => {
    await seedLocalStorage(page, { role: "Content Manager", freshStore: true });
    // RequireRole guards the route itself — deep-linking is not a way in.
    await page.goto("governance");

    await expect(page.getByText(/restricted/i).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("overheating");
    await expect(
      page.getByRole("heading", { name: "Governance & crisis" }),
    ).toHaveCount(0);
  });

  test("CMO sees the real incident title", async ({ page }) => {
    await seedLocalStorage(page, { role: "CMO", freshStore: true });
    await page.goto("governance");

    await expect(page.getByRole("heading", { name: "Governance & crisis" })).toBeVisible();
    await expect(
      page.getByText("Volt battery overheating reports").first(),
    ).toBeVisible();
  });
});

test.describe("approve flow", () => {
  test("Brand Manager approves a pending item; row leaves the queue and a toast confirms", async ({ page }) => {
    await seedLocalStorage(page, { role: "Brand Manager", freshStore: true });
    await page.goto("approvals");

    await expect(
      page.getByRole("heading", { level: 1, name: "Approvals", exact: true }),
    ).toBeVisible();

    const rows = page.locator("tbody tr");
    const pendingCount = await rows.count();
    expect(pendingCount, "seed data should queue items for the Brand Manager").toBeGreaterThan(0);

    const firstRow = rows.first();
    // Target the subject span directly. Reading the whole first <div> also
    // swept up the origin chip that shares it, so the extracted string stopped
    // matching the toast the moment a queued subject had agent provenance.
    const subject = (await firstRow.getByTestId("approval-subject").innerText()).trim();
    await firstRow.getByRole("button", { name: "Approve", exact: true }).click();

    await expect(rows).toHaveCount(pendingCount - 1);

    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible();
    // Deciding now advances the subject's lifecycle, so the toast names the
    // transition ("Approved — <subject> moved to Approved") rather than just
    // the subject; assert on the stable prefix plus the subject.
    await expect(toast).toContainText("Approved");
    await expect(toast).toContainText(subject);
  });
});
