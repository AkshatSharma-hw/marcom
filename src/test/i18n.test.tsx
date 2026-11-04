/**
 * Multilingual content-parity suite (NFR-01..05).
 *
 * Covers three things:
 *  1. the locale table itself (ar-SA marked RTL, ja-JP marked CJK),
 *  2. the deterministic formatters (numerals, grouping, and the Hijri and
 *     Japanese-era calendar hints),
 *  3. that <LocaleText> actually emits dir="rtl" and the right script face for
 *     the *seeded* localized ContentVersions rather than for hand-written
 *     fixtures.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  CJK_FONT_STACK,
  DEFAULT_LOCALE,
  RTL_FONT_STACK,
  SUPPORTED_LOCALES,
  TARGET_LOCALES,
  formatDate,
  formatDateWithCalendarHint,
  formatNumber,
  formatSecondaryDate,
  isCjk,
  isRtl,
  localeDir,
  localeMeta,
  localeName,
  localeScript,
} from '@/lib/i18n';
import { LocaleChip, LocaleText } from '@/components/marcomm/LocaleText';
import { seedContentVersions } from '@/data/seed/content';

/** ISO instant used across the date assertions (1 Sep 2026 UTC). */
const ISO = '2026-09-01T00:00:00Z';

describe('locale table', () => {
  it('supports every demo locale, including ar-SA', () => {
    const codes = SUPPORTED_LOCALES.map((l) => l.code);
    expect(codes).toEqual([
      'en-US',
      'en-GB',
      'de-DE',
      'fr-FR',
      'ja-JP',
      'hi-IN',
      'ar-SA',
    ]);
  });

  it('offers every non-source locale as a localization target', () => {
    expect(TARGET_LOCALES).toContain('ar-SA');
    expect(TARGET_LOCALES).not.toContain(DEFAULT_LOCALE);
    expect(TARGET_LOCALES).toHaveLength(SUPPORTED_LOCALES.length - 1);
  });

  it('marks ar-SA as the only RTL locale', () => {
    const rtl = SUPPORTED_LOCALES.filter((l) => l.dir === 'rtl').map((l) => l.code);
    expect(rtl).toEqual(['ar-SA']);
  });

  it('resolves direction for supported and unknown locales', () => {
    expect(isRtl('ar-SA')).toBe(true);
    expect(localeDir('ar-SA')).toBe('rtl');
    for (const code of ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP', 'hi-IN']) {
      expect(isRtl(code), `${code} must stay LTR`).toBe(false);
      expect(localeDir(code)).toBe('ltr');
    }
    // Unlisted RTL languages still flip, by language subtag.
    expect(isRtl('ar-AE')).toBe(true);
    expect(isRtl('he-IL')).toBe(true);
    expect(isRtl('pt-BR')).toBe(false);
    // Nullish never throws.
    expect(isRtl(undefined)).toBe(false);
    expect(isRtl('')).toBe(false);
  });

  it('exposes English names and the cultural secondary calendars', () => {
    expect(localeName('ar-SA')).toBe('Arabic (Saudi Arabia)');
    expect(localeName('fr-FR')).toBe('French (France)');
    expect(localeName('ja-JP')).toBe('Japanese (Japan)');
    expect(localeMeta('ar-SA')?.secondaryCalendar).toBe('islamic-umalqura');
    expect(localeMeta('ja-JP')?.secondaryCalendar).toBe('japanese');
    // French shares the Gregorian civil calendar with the chrome — no note.
    expect(localeMeta('fr-FR')?.secondaryCalendar).toBeUndefined();
    expect(localeMeta('en-US')?.secondaryCalendar).toBeUndefined();
    // Unknown locale degrades to its raw tag rather than throwing.
    expect(localeName('xx-YY')).toBe('xx-YY');
  });

  it('flags the two scripts Poppins cannot render, and only those', () => {
    expect(localeScript('ar-SA')).toBe('arabic');
    expect(localeScript('ja-JP')).toBe('cjk');
    expect(isCjk('ja-JP')).toBe(true);
    // French is Latin script — the UI face already covers it.
    expect(localeScript('fr-FR')).toBeNull();
    expect(isCjk('fr-FR')).toBe(false);
    for (const code of ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'hi-IN']) {
      expect(localeScript(code), `${code} must stay Latin`).toBeNull();
    }
    // Unlisted locales resolve by language subtag rather than dropping to tofu.
    expect(localeScript('ja')).toBe('cjk');
    expect(localeScript('zh-CN')).toBe('cjk');
    expect(localeScript('ar-AE')).toBe('arabic');
    expect(localeScript(undefined)).toBeNull();
  });
});

describe('formatNumber', () => {
  it('switches numerals for ar-SA and leaves Latin locales alone', () => {
    expect(formatNumber(1234, 'en-US')).toBe('1,234');
    expect(formatNumber(1234, 'de-DE')).toBe('1.234');
    // Arabic-Indic digits ١٢٣٤ with the Arabic group separator.
    expect(formatNumber(1234, 'ar-SA')).toBe('١٬٢٣٤');
    expect(formatNumber(2, 'ar-SA')).toBe('٢');
  });

  it('applies French and Japanese grouping conventions', () => {
    // French groups with a narrow no-break space, not a comma or a period.
    expect(formatNumber(1234, 'fr-FR')).not.toBe('1,234');
    expect(formatNumber(1234, 'fr-FR')).toMatch(/^1\s?234$/u);
    // Japanese uses Latin digits and comma grouping, like en-US.
    expect(formatNumber(1234, 'ja-JP')).toBe('1,234');
    expect(formatNumber(1234567, 'ja-JP')).toBe('1,234,567');
  });

  it('is deterministic and non-throwing on odd input', () => {
    expect(formatNumber(7, 'xx-YY')).toBe('7');
    expect(formatNumber(Number.NaN, 'ar-SA')).toBe('NaN');
  });
});

describe('formatDate', () => {
  it('formats in UTC regardless of host timezone', () => {
    // 23:00Z on 31 Aug must not roll forward/back into another local day.
    expect(formatDate('2026-08-31T23:00:00Z', 'en-GB')).toBe('31 August 2026');
  });

  it('renders ar-SA dates in Arabic with Arabic-Indic numerals', () => {
    const gregorian = formatDate(ISO, 'ar-SA');
    expect(gregorian).toContain('سبتمبر');
    expect(gregorian).toMatch(/[٠-٩]/);
    expect(gregorian).not.toMatch(/[0-9]/);
  });

  it('renders fr-FR and ja-JP dates in their own conventions', () => {
    // French: lowercase month name, day before month.
    expect(formatDate(ISO, 'fr-FR')).toBe('1 septembre 2026');
    // Japanese: year-month-day with the CJK date particles.
    expect(formatDate(ISO, 'ja-JP')).toBe('2026年9月1日');
  });

  it('adds a cultural-calendar note for ar-SA and ja-JP, and only those', () => {
    const hijri = formatSecondaryDate(ISO, 'ar-SA');
    expect(hijri).not.toBeNull();
    // Umm al-Qura: 1 Sep 2026 falls in 1448 AH.
    expect(hijri).toContain('١٤٤٨');

    const hinted = formatDateWithCalendarHint(ISO, 'ar-SA');
    expect(hinted).toBe(`${formatDate(ISO, 'ar-SA')} (${hijri})`);

    // Japanese imperial era: 1 Sep 2026 falls in Reiwa 8.
    const era = formatSecondaryDate(ISO, 'ja-JP');
    expect(era).not.toBeNull();
    expect(era).toContain('令和');
    expect(era).toContain('8');
    expect(formatDateWithCalendarHint(ISO, 'ja-JP')).toBe(
      `${formatDate(ISO, 'ja-JP')} (${era})`,
    );

    // No secondary calendar for the Latin locales — the hint is a no-op.
    expect(formatSecondaryDate(ISO, 'en-US')).toBeNull();
    expect(formatSecondaryDate(ISO, 'fr-FR')).toBeNull();
    expect(formatDateWithCalendarHint(ISO, 'fr-FR')).toBe(formatDate(ISO, 'fr-FR'));
  });

  it('returns the raw input for an unparseable date', () => {
    expect(formatDate('not-a-date', 'ar-SA')).toBe('not-a-date');
    expect(formatSecondaryDate('not-a-date', 'ar-SA')).toBeNull();
  });
});

describe('<LocaleText>', () => {
  it('renders RTL body copy with dir/lang, right alignment and an Arabic face', () => {
    render(
      <LocaleText locale="ar-SA" showChip={false}>
        مرحبا بالعالم
      </LocaleText>,
    );
    const p = screen.getByText('مرحبا بالعالم');
    expect(p).toHaveAttribute('dir', 'rtl');
    expect(p).toHaveAttribute('lang', 'ar-SA');
    expect(p.className).toContain('text-right');
    expect(p.className).toContain('font-rtl');
    expect(p).toHaveStyle({ fontFamily: RTL_FONT_STACK });
  });

  it('leaves LTR locales untouched', () => {
    render(
      <LocaleText locale="en-US" showChip={false}>
        Hello world
      </LocaleText>,
    );
    const p = screen.getByText('Hello world');
    expect(p).toHaveAttribute('dir', 'ltr');
    expect(p.className).not.toContain('text-right');
    expect(p.className).not.toContain('font-rtl');
  });

  it('renders CJK body copy LTR but in a CJK-capable face', () => {
    render(
      <LocaleText locale="ja-JP" showChip={false}>
        ボルト5Gを発表しました
      </LocaleText>,
    );
    const p = screen.getByText('ボルト5Gを発表しました');
    // CJK is left-to-right — only the face and leading change.
    expect(p).toHaveAttribute('dir', 'ltr');
    expect(p).toHaveAttribute('lang', 'ja-JP');
    expect(p.className).not.toContain('text-right');
    expect(p.className).toContain('font-cjk');
    expect(p).toHaveStyle({ fontFamily: CJK_FONT_STACK });
  });

  it('leaves French in the UI face — Latin script needs no override', () => {
    render(
      <LocaleText locale="fr-FR" showChip={false}>
        Derniers jours
      </LocaleText>,
    );
    const p = screen.getByText('Derniers jours');
    expect(p).toHaveAttribute('dir', 'ltr');
    expect(p).toHaveAttribute('lang', 'fr-FR');
    expect(p.className).not.toContain('font-rtl');
    expect(p.className).not.toContain('font-cjk');
  });

  it('shows a locale chip that flags direction', () => {
    const { unmount } = render(<LocaleChip locale="ar-SA" />);
    expect(screen.getByText('ar-SA')).toBeInTheDocument();
    expect(screen.getByText('العربية')).toBeInTheDocument();
    expect(screen.getByText('RTL')).toBeInTheDocument();
    unmount();

    const ja = render(<LocaleChip locale="ja-JP" />);
    expect(screen.getByText('ja-JP')).toBeInTheDocument();
    expect(screen.getByText('日本語')).toBeInTheDocument();
    // CJK is not RTL — the direction marker must not appear.
    expect(screen.queryByText('RTL')).toBeNull();
    ja.unmount();

    const fr = render(<LocaleChip locale="fr-FR" />);
    expect(screen.getByText('fr-FR')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.queryByText('RTL')).toBeNull();
    fr.unmount();

    render(<LocaleChip locale="en-GB" />);
    expect(screen.getByText('en-GB')).toBeInTheDocument();
    expect(screen.queryByText('RTL')).toBeNull();
  });
});

describe('seeded localized content renders in its own script', () => {
  const arabicVersions = seedContentVersions.filter((v) => v.locale === 'ar-SA');

  it('the seed actually carries ar-SA versions', () => {
    expect(arabicVersions.length).toBeGreaterThan(0);
    for (const v of arabicVersions) {
      // Body must be Arabic script, not a Latin placeholder tagged ar-SA.
      expect(v.body, `${v.id} body should be Arabic script`).toMatch(/[؀-ۿ]/);
    }
  });

  it('every seeded ar-SA body renders right-to-left through LocaleText', () => {
    for (const v of arabicVersions) {
      const { container, unmount } = render(
        <LocaleText locale={v.locale} showChip={false}>
          {v.body}
        </LocaleText>,
      );
      const p = container.querySelector('p');
      expect(p, `${v.id} should render a body paragraph`).not.toBeNull();
      expect(p).toHaveAttribute('dir', 'rtl');
      expect(p).toHaveAttribute('lang', 'ar-SA');
      unmount();
    }
  });

  it('every non-Arabic seeded version stays LTR', () => {
    const others = seedContentVersions.filter((v) => v.locale !== 'ar-SA');
    expect(others.length).toBeGreaterThan(0);
    for (const v of others) {
      expect(localeDir(v.locale), `${v.id} (${v.locale}) must stay LTR`).toBe('ltr');
    }
  });

  it('the seed carries ja-JP versions in genuine CJK script', () => {
    const japanese = seedContentVersions.filter((v) => v.locale === 'ja-JP');
    expect(japanese.length).toBeGreaterThan(0);
    for (const v of japanese) {
      // Hiragana, katakana or CJK ideographs — not a Latin placeholder tagged
      // ja-JP, which would pass a naive locale check while rendering as tofu.
      expect(v.body, `${v.id} body should be CJK script`).toMatch(
        /[\u3040-\u30ff\u4e00-\u9fff]/u,
      );
      expect(isCjk(v.locale)).toBe(true);
    }
  });

  it('the seed carries fr-FR versions in French, not tagged English', () => {
    const french = seedContentVersions.filter((v) => v.locale === 'fr-FR');
    expect(french.length).toBeGreaterThan(0);
    for (const v of french) {
      // A Latin-script check cannot distinguish French from English, so assert
      // on French orthography instead: accented characters must be present.
      expect(v.body, `${v.id} body should read as French`).toMatch(/[àâçéèêëîïôûùüœ]/u);
      expect(v.body, `${v.id} should not be a tagged English placeholder`).not.toContain(
        'Simulated transcreation',
      );
    }
  });

  it('every seeded localized version is scoped to a region', () => {
    const localized = seedContentVersions.filter((v) =>
      ['ar-SA', 'fr-FR', 'ja-JP'].includes(v.locale),
    );
    expect(localized.length).toBeGreaterThan(0);
    for (const v of localized) {
      expect(v.regionId, `${v.id} (${v.locale}) needs a regionId`).toBeTruthy();
    }
  });
});
