/**
 * Locale metadata and deterministic formatters (NFR-01..05).
 *
 * Scope is deliberately narrow: this is *content-level* bilingual parity, not
 * a UI translation layer. The app chrome stays English/LTR; what these helpers
 * do is let a ContentVersion body render the way a reader of that locale
 * expects: Arabic right-to-left, in an Arabic-capable face, with Arabic-Indic
 * numerals and a Hijri date note alongside the Gregorian one; Japanese in a
 * CJK-capable face with an imperial-era date note; French in the Latin face
 * the chrome already uses, with French number and date conventions.
 *
 * Determinism: every formatter is built from an explicit BCP-47 tag carrying
 * the numbering system (`-u-nu-`) and calendar (`-u-ca-`) as Unicode
 * extensions, and every date is formatted in UTC. Nothing here reads the
 * host's default locale or timezone, so the same input renders identically in
 * CI, in jsdom, and in the demo browser.
 */

export type TextDirection = "ltr" | "rtl";

export interface LocaleMeta {
  /** BCP-47 tag as stored on ContentVersion.locale. */
  code: string;
  /** English display name, for the LTR chrome. */
  englishName: string;
  /** Endonym, shown in the locale chip. */
  nativeName: string;
  /** Base rendering direction for body copy in this locale. */
  dir: TextDirection;
  /** Unicode numbering system used for numerals in this locale. */
  numberingSystem: "latn" | "arab";
  /**
   * Primary (civil) calendar. `secondaryCalendar` is the cultural calendar
   * shown as a note beside it — for ar-SA, the Umm al-Qura Hijri calendar
   * that Saudi editorial and regulatory copy dates against; for ja-JP, the
   * imperial era calendar (令和/Reiwa) that Japanese official and retail copy
   * carries alongside the Gregorian date.
   */
  calendar: "gregory";
  secondaryCalendar?: "islamic-umalqura" | "japanese";
  /**
   * Body copy in this locale needs a script-specific face because Poppins —
   * the NST UI face — carries no coverage for it. 'arabic' and 'cjk' select
   * the corresponding stack; omitted means Latin, which Poppins covers.
   */
  script?: "arabic" | "cjk";
}

/**
 * Every locale the demo can hold content in. Order is meaningful: en-US is
 * the source locale and renders first; the rest follow in the order offered
 * by the localization dialog.
 */
export const SUPPORTED_LOCALES: readonly LocaleMeta[] = [
  {
    code: "en-US",
    englishName: "English (United States)",
    nativeName: "English (US)",
    dir: "ltr",
    numberingSystem: "latn",
    calendar: "gregory",
  },
  {
    code: "en-GB",
    englishName: "English (United Kingdom)",
    nativeName: "English (UK)",
    dir: "ltr",
    numberingSystem: "latn",
    calendar: "gregory",
  },
  {
    code: "de-DE",
    englishName: "German (Germany)",
    nativeName: "Deutsch",
    dir: "ltr",
    numberingSystem: "latn",
    calendar: "gregory",
  },
  {
    code: "fr-FR",
    englishName: "French (France)",
    nativeName: "Français",
    dir: "ltr",
    numberingSystem: "latn",
    calendar: "gregory",
  },
  {
    code: "ja-JP",
    englishName: "Japanese (Japan)",
    nativeName: "日本語",
    dir: "ltr",
    numberingSystem: "latn",
    calendar: "gregory",
    secondaryCalendar: "japanese",
    script: "cjk",
  },
  {
    code: "hi-IN",
    englishName: "Hindi (India)",
    nativeName: "हिन्दी",
    dir: "ltr",
    numberingSystem: "latn",
    calendar: "gregory",
  },
  {
    code: "ar-SA",
    englishName: "Arabic (Saudi Arabia)",
    nativeName: "العربية",
    dir: "rtl",
    numberingSystem: "arab",
    calendar: "gregory",
    secondaryCalendar: "islamic-umalqura",
    script: "arabic",
  },
] as const;

/** The source locale — its version group always renders first. */
export const DEFAULT_LOCALE = "en-US";

/** Locale codes offered as localization targets (everything but the source). */
export const TARGET_LOCALES: readonly string[] = SUPPORTED_LOCALES.filter(
  (l) => l.code !== DEFAULT_LOCALE,
).map((l) => l.code);

const BY_CODE = new Map(SUPPORTED_LOCALES.map((l) => [l.code, l]));

/**
 * Language subtags that are written right-to-left. Used as the fallback for a
 * locale that isn't in SUPPORTED_LOCALES (e.g. content seeded later as 'he-IL'
 * or 'ar-AE') so direction never silently degrades to LTR.
 */
const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur", "ps", "dv", "yi", "ckb"]);

/**
 * Language subtags written in CJK scripts. Same fallback role as
 * RTL_LANGUAGES: content seeded later as 'ja' or 'zh-CN' still resolves to a
 * face that can render it rather than dropping to tofu boxes in Poppins.
 */
const CJK_LANGUAGES = new Set(["ja", "zh", "ko", "yue"]);

/** Metadata for a locale code, or undefined if it isn't a supported locale. */
export function localeMeta(locale: string): LocaleMeta | undefined {
  return BY_CODE.get(locale);
}

/** True when body copy in this locale must render right-to-left. */
export function isRtl(locale: string | undefined | null): boolean {
  if (!locale) return false;
  const meta = BY_CODE.get(locale);
  if (meta) return meta.dir === "rtl";
  const language = locale.split(/[-_]/)[0]?.toLowerCase() ?? "";
  return RTL_LANGUAGES.has(language);
}

/** `'rtl'` or `'ltr'` — ready to spread onto a `dir` attribute. */
export function localeDir(locale: string | undefined | null): TextDirection {
  return isRtl(locale) ? "rtl" : "ltr";
}

/** English display name, falling back to the raw tag for unknown locales. */
export function localeName(locale: string): string {
  return BY_CODE.get(locale)?.englishName ?? locale;
}

/** Endonym ('العربية'), falling back to the raw tag for unknown locales. */
export function localeNativeName(locale: string): string {
  return BY_CODE.get(locale)?.nativeName ?? locale;
}

/* ------------------------------------------------------------------ */
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

/**
 * Font stack for right-to-left body copy. Poppins (the NST UI face) carries no
 * Arabic coverage, so RTL text must fall through to a face that does — this is
 * mirrored by the `.font-rtl` utility in index.css, which is what components
 * actually apply. Exported for tests and for any inline-style consumer.
 */
export const RTL_FONT_STACK =
  '"Noto Naskh Arabic", "Noto Sans Arabic", "Geeza Pro", "Al Bayan", "Segoe UI", Tahoma, serif';

/**
 * Font stack for CJK body copy — the same problem RTL_FONT_STACK solves, for
 * the other script Poppins does not cover. Mirrored by `.font-cjk` in
 * index.css. Japanese faces are listed before the pan-CJK fallbacks so kanji
 * render with Japanese rather than Chinese glyph forms.
 */
export const CJK_FONT_STACK =
  '"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", "Noto Sans CJK JP", "Meiryo", "MS PGothic", sans-serif';

/** The script-specific face a locale's body copy needs, or null for Latin. */
export function localeScript(
  locale: string | undefined | null,
): "arabic" | "cjk" | null {
  if (!locale) return null;
  const meta = BY_CODE.get(locale);
  if (meta?.script) return meta.script;
  // Fall back on the language subtag so content seeded later as 'ja', 'ar-AE'
  // or 'zh-CN' still gets a face that can render it.
  const language = locale.split(/[-_]/)[0]?.toLowerCase() ?? "";
  if (RTL_LANGUAGES.has(language)) return "arabic";
  return CJK_LANGUAGES.has(language) ? "cjk" : null;
}

/** True when body copy in this locale needs the CJK face. */
export function isCjk(locale: string | undefined | null): boolean {
  return localeScript(locale) === "cjk";
}

/** Explicit BCP-47 tag pinning the numbering system, so output is stable. */
function numberTag(meta: LocaleMeta | undefined, locale: string): string {
  return meta ? `${meta.code}-u-nu-${meta.numberingSystem}` : `${locale}-u-nu-latn`;
}

/** Explicit BCP-47 tag pinning both calendar and numbering system. */
function dateTag(
  meta: LocaleMeta | undefined,
  locale: string,
  calendar: string,
): string {
  const nu = meta?.numberingSystem ?? "latn";
  const code = meta?.code ?? locale;
  return `${code}-u-ca-${calendar}-nu-${nu}`;
}

const numberCache = new Map<string, Intl.NumberFormat>();
const dateCache = new Map<string, Intl.DateTimeFormat>();

function numberFormatter(tag: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${tag}|${JSON.stringify(opts)}`;
  let fmt = numberCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(tag, opts);
    numberCache.set(key, fmt);
  }
  return fmt;
}

function dateFormatter(tag: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${tag}|${JSON.stringify(opts)}`;
  let fmt = dateCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(tag, opts);
    dateCache.set(key, fmt);
  }
  return fmt;
}

/**
 * Locale-aware number. Switches numerals with the locale: '1,234' in en-US,
 * '١٬٢٣٤' in ar-SA (Arabic-Indic digits, Arabic group separator).
 */
export function formatNumber(
  value: number,
  locale: string = DEFAULT_LOCALE,
  opts: Intl.NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return String(value);
  const meta = BY_CODE.get(locale);
  try {
    return numberFormatter(numberTag(meta, locale), opts).format(value);
  } catch {
    return numberFormatter("en-US-u-nu-latn", opts).format(value);
  }
}

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
};

/**
 * Options for the cultural-calendar note. `era` is what makes both secondary
 * calendars readable — 'هـ' for Hijri, '令和' for the Japanese imperial era —
 * so the note can never be mistaken for the Gregorian date beside it.
 */
const SECONDARY_DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
  era: "short",
  timeZone: "UTC",
};

/** Parses an ISO date/timestamp, or null when it isn't a real date. */
function toDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Locale-aware Gregorian date in UTC — '1 September 2026' (en-GB),
 * '2026年9月1日' (ja-JP), '١ سبتمبر ٢٠٢٦' (ar-SA).
 */
export function formatDate(iso: string, locale: string = DEFAULT_LOCALE): string {
  const d = toDate(iso);
  if (!d) return iso;
  const meta = BY_CODE.get(locale);
  try {
    return dateFormatter(dateTag(meta, locale, meta?.calendar ?? "gregory"), DATE_OPTS).format(d);
  } catch {
    return dateFormatter("en-US-u-ca-gregory-nu-latn", DATE_OPTS).format(d);
  }
}

/**
 * The locale's secondary/cultural calendar rendering, or null when it has
 * none. For ar-SA this is the Umm al-Qura Hijri date — '١٩ ربيع الأول ١٤٤٨ هـ';
 * for ja-JP the imperial era date — '令和8年9月1日'.
 */
export function formatSecondaryDate(
  iso: string,
  locale: string = DEFAULT_LOCALE,
): string | null {
  const meta = BY_CODE.get(locale);
  if (!meta?.secondaryCalendar) return null;
  const d = toDate(iso);
  if (!d) return null;
  try {
    return dateFormatter(dateTag(meta, locale, meta.secondaryCalendar), SECONDARY_DATE_OPTS).format(d);
  } catch {
    // Runtime shipped without the Islamic calendar in its ICU data — drop the
    // note rather than showing a wrong date.
    return null;
  }
}

/**
 * Primary date plus the cultural-calendar note where the locale has one:
 * ar-SA → '١ سبتمبر ٢٠٢٦ (١٩ ربيع الأول ١٤٤٨ هـ)', ja-JP → '2026年9月1日
 * (令和8年9月1日)'. Every other locale returns exactly `formatDate`.
 */
export function formatDateWithCalendarHint(
  iso: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const primary = formatDate(iso, locale);
  const secondary = formatSecondaryDate(iso, locale);
  return secondary ? `${primary} (${secondary})` : primary;
}
