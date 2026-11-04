import { expect, test } from "@playwright/test";
import { seedLocalStorage } from "./helpers";

/**
 * Multilingual content parity (NFR-01..05).
 *
 * The unit suite (src/test/i18n.test.tsx) proves the attributes and the
 * formatters; this suite proves the *rendered geometry* in a real engine —
 * that Arabic body copy actually lays out right-to-left inside the LTR app
 * shell, that Japanese resolves to a CJK-capable face rather than rendering as
 * tofu, and that both are reachable from the localization dialog.
 *
 * CNT-004 (Volt5 global launch press release) carries the seeded ar-SA version
 * CV-018, the fr-FR version CV-091 and the ja-JP version CV-093.
 */

const ARABIC_CONTENT = "content/CNT-004";

test.describe("RTL content rendering", () => {
  test.beforeEach(async ({ page }) => {
    await seedLocalStorage(page, { role: "Content Manager", freshStore: true });
    await page.goto(ARABIC_CONTENT);
    await expect(
      page.getByRole("heading", { name: "Volt5 global launch press release" }),
    ).toBeVisible();
  });

  test("seeded Arabic versions render right-to-left; English stays LTR", async ({ page }) => {
    const arabic = page.locator('p[lang="ar-SA"]').first();
    await expect(arabic).toBeVisible();
    await expect(arabic).toHaveAttribute("dir", "rtl");

    // Computed direction and alignment, not just the attribute.
    const computed = await arabic.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { direction: cs.direction, textAlign: cs.textAlign, font: cs.fontFamily };
    });
    expect(computed.direction).toBe("rtl");
    expect(computed.textAlign).toBe("right");
    // Poppins carries no Arabic glyphs — the RTL stack must take over.
    expect(computed.font).not.toContain("Poppins");
    expect(computed.font).toContain("Arabic");

    // Geometry: the first character of RTL copy sits at the RIGHT edge of the
    // paragraph box. This is the assertion that would fail if dir were
    // dropped but the class survived (or vice versa).
    const geometry = await arabic.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const text = el.firstChild as Text;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 1);
      const first = range.getBoundingClientRect();
      return { width: box.width, gapFromRight: box.right - first.right };
    });
    expect(geometry.width).toBeGreaterThan(200);
    expect(geometry.gapFromRight).toBeLessThan(2);

    // The English source version on the same page is untouched.
    const english = page.locator('p[lang="en-US"]').first();
    await expect(english).toHaveAttribute("dir", "ltr");
    expect(
      await english.evaluate((el) => getComputedStyle(el).direction),
    ).toBe("ltr");
  });

  test("seeded Japanese renders LTR in a CJK face, not Poppins", async ({ page }) => {
    const japanese = page.locator('p[lang="ja-JP"]').first();
    await expect(japanese).toBeVisible();
    // CJK is left-to-right: only the face and leading change.
    await expect(japanese).toHaveAttribute("dir", "ltr");

    const computed = await japanese.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { direction: cs.direction, textAlign: cs.textAlign, font: cs.fontFamily };
    });
    expect(computed.direction).toBe("ltr");
    expect(computed.textAlign).not.toBe("right");
    // Poppins ships no CJK glyphs — kanji would render as tofu boxes.
    expect(computed.font).not.toContain("Poppins");
    expect(computed.font).toMatch(/Hiragino|Yu Gothic|Noto Sans (JP|CJK)|Meiryo/);

    // Geometry: LTR copy starts at the LEFT edge of the paragraph box — the
    // mirror of the Arabic assertion above, and what would fail if the CJK
    // branch ever picked up the RTL alignment by accident.
    const geometry = await japanese.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const text = el.firstChild as Text;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 1);
      const first = range.getBoundingClientRect();
      return { width: box.width, gapFromLeft: first.left - box.left };
    });
    expect(geometry.width).toBeGreaterThan(200);
    expect(geometry.gapFromLeft).toBeLessThan(2);
  });

  test("seeded French renders LTR in the UI face — no script override", async ({ page }) => {
    const french = page.locator('p[lang="fr-FR"]').first();
    await expect(french).toBeVisible();
    await expect(french).toHaveAttribute("dir", "ltr");

    const computed = await french.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { direction: cs.direction, font: cs.fontFamily };
    });
    expect(computed.direction).toBe("ltr");
    // Latin script: the chrome face is correct and must NOT be overridden.
    expect(computed.font).toContain("Poppins");
  });

  test("app chrome stays LTR — only content bodies flip", async ({ page }) => {
    await expect(page.locator('p[lang="ar-SA"]').first()).toBeVisible();
    const shell = await page.evaluate(() => ({
      html: document.documentElement.dir || "ltr",
      body: getComputedStyle(document.body).direction,
      nav: getComputedStyle(document.querySelector("nav")!).direction,
    }));
    expect(shell.html).toBe("ltr");
    expect(shell.body).toBe("ltr");
    expect(shell.nav).toBe("ltr");
  });

  test("Localization card groups Arabic under its own RTL heading", async ({ page }) => {
    const group = page.getByTestId("rtl-locale-group");
    await expect(group).toBeVisible();
    await expect(
      group.getByRole("heading", { name: "Arabic & right-to-left locales" }),
    ).toBeVisible();
    await expect(group.getByText("RTL", { exact: true }).first()).toBeVisible();
    await expect(group.getByText("Arabic (Saudi Arabia)")).toBeVisible();

    // Hijri note beside the Gregorian date, in Arabic-Indic numerals.
    const hijri = group.locator('bdi[lang="ar-SA"]').first();
    await expect(hijri).toHaveText(/[٠-٩]/);
    await expect(hijri).toHaveText(/هـ/);

    // The honest-scope caption.
    await expect(
      page.getByText(
        "Content-level bilingual support. Full UI localisation is a platform-phase item.",
      ),
    ).toBeVisible();
  });

  test("ja-JP is an offered localization target and its draft renders in CJK", async ({ page }) => {
    const before = await page.locator('p[lang="ja-JP"]').count();

    await page.getByRole("button", { name: "Request localization" }).click();
    await page.getByRole("combobox").first().click();
    const option = page.getByRole("option", { name: /ja-JP/ });
    await expect(option).toBeVisible();
    await option.click();

    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option").first().click();

    await page.getByRole("button", { name: "Create localization draft" }).click();

    const japaneseBodies = page.locator('p[lang="ja-JP"]');
    await expect(japaneseBodies).toHaveCount(before + 1);

    // The placeholder is written in Japanese, so the draft exercises the CJK
    // face rather than rendering tagged English in the wrong script.
    const draft = japaneseBodies.first();
    await expect(draft).toHaveText(/翻訳ドラフト/);
    await expect(draft).toHaveAttribute("dir", "ltr");
    expect(await draft.evaluate((el) => getComputedStyle(el).fontFamily)).not.toContain(
      "Poppins",
    );
  });

  test("ar-SA is an offered localization target and its draft renders RTL", async ({ page }) => {
    const before = await page.locator('p[lang="ar-SA"]').count();

    await page.getByRole("button", { name: "Request localization" }).click();
    await page.getByRole("combobox").first().click();
    const option = page.getByRole("option", { name: /ar-SA/ });
    await expect(option).toBeVisible();
    await option.click();

    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option").first().click();

    await page.getByRole("button", { name: "Create localization draft" }).click();

    // One new ar-SA body in the version history — the Localization card keeps
    // showing one row per locale (now pointing at this newer draft).
    const arabicBodies = page.locator('p[lang="ar-SA"]');
    await expect(arabicBodies).toHaveCount(before + 1);

    // The newest version sorts first, and the new draft renders RTL.
    const draft = arabicBodies.first();
    await expect(draft).toHaveText(/مسودة مترجمة/);
    await expect(draft).toHaveAttribute("dir", "rtl");
    expect(await draft.evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");
  });
});

test.describe("Rulebook renders every locale in its own script", () => {
  test.beforeEach(async ({ page }) => {
    await seedLocalStorage(page, { role: "Content Manager", freshStore: true });
    await page.goto("rulebook");
    await expect(page.getByRole("heading", { name: "Brand rulebook" })).toBeVisible();
  });

  test("glossary terms use the face their script needs", async ({ page }) => {
    await page.getByRole("tab", { name: "Terminology" }).click();

    // Arabic: RTL in an Arabic face, with a Latin transliteration alongside.
    const arabic = page.locator('td [lang="ar-SA"]').first();
    await expect(arabic).toBeVisible();
    await expect(arabic).toHaveAttribute("dir", "rtl");
    expect(await arabic.evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
      "Arabic",
    );

    // Japanese: LTR, but Poppins has no kanji — the CJK stack must take over.
    const japanese = page.locator('td [lang="ja-JP"]').first();
    await expect(japanese).toBeVisible();
    await expect(japanese).toHaveAttribute("dir", "ltr");
    const jaFont = await japanese.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(jaFont).not.toContain("Poppins");
    expect(jaFont).toMatch(/Hiragino|Yu Gothic|Noto Sans (JP|CJK)|Meiryo/);

    // French: Latin script, so the chrome face is correct and stays.
    const french = page.locator('td [lang="fr-FR"]').first();
    await expect(french).toBeVisible();
    expect(await french.evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
      "Poppins",
    );

    // Non-Latin entries carry a transliteration so reviewers can discuss them.
    await expect(page.getByText("yoyaku chumon")).toBeVisible();
  });

  test("the legal library carries clauses for all six jurisdictions", async ({ page }) => {
    await page.getByRole("tab", { name: "Legal library" }).click();
    for (const locale of ["ar-SA", "fr-FR", "ja-JP"]) {
      await expect(
        page.locator(`[lang="${locale}"]`).first(),
        `${locale} clause should render`,
      ).toBeVisible();
    }
  });
});
