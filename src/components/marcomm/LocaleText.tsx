import { cn } from "@/lib/utils";
import {
  CJK_FONT_STACK,
  isRtl,
  localeDir,
  localeName,
  localeNativeName,
  localeScript,
  RTL_FONT_STACK,
} from "@/lib/i18n";

interface LocaleChipProps {
  locale: string;
  /** Append an explicit 'RTL' marker for right-to-left locales. */
  showDirection?: boolean;
  className?: string;
}

/**
 * Small locale marker — the BCP-47 tag, the endonym for non-English locales,
 * and an explicit RTL flag where the direction flips. The chip itself always
 * renders LTR so the tag reads the same everywhere in the (English) chrome.
 */
export function LocaleChip({
  locale,
  showDirection = true,
  className,
}: LocaleChipProps) {
  const rtl = isRtl(locale);
  const script = localeScript(locale);
  const native = localeNativeName(locale);
  return (
    <span
      dir="ltr"
      title={localeName(locale)}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground",
        className,
      )}
    >
      <span className="font-medium tabular-nums">{locale}</span>
      {native !== locale && (
        <span
          className={cn(
            "opacity-70",
            script === "arabic" && "font-rtl",
            script === "cjk" && "font-cjk",
          )}
        >
          {native}
        </span>
      )}
      {showDirection && rtl && (
        <span className="rounded-[3px] bg-foreground/10 px-1 font-medium text-foreground/70">
          RTL
        </span>
      )}
    </span>
  );
}

interface LocaleTextProps {
  /** BCP-47 locale the body copy is written in. */
  locale: string;
  /** The body copy itself. */
  children: string;
  /** Clamp to N lines (matches the surrounding card's density). */
  clamp?: 2 | 3 | 4;
  /** Render the locale chip above the copy. Off where the surface already
   *  labels the locale in its own header row. */
  showChip?: boolean;
  className?: string;
}

/**
 * Renders a content body in its own locale's direction and type.
 *
 * RTL locales get `dir="rtl"`, right alignment and an Arabic-capable font
 * stack; CJK locales stay LTR but take a CJK-capable stack — Poppins covers
 * neither script, so both would otherwise render as tofu. Latin locales render
 * `dir="ltr"` in Poppins unchanged. This is deliberately body-copy only — the
 * surrounding chrome stays LTR English.
 */
export function LocaleText({
  locale,
  children,
  clamp,
  showChip = true,
  className,
}: LocaleTextProps) {
  const rtl = isRtl(locale);
  const script = localeScript(locale);
  const clampClass =
    clamp === 2 ? "line-clamp-2" : clamp === 3 ? "line-clamp-3" : clamp === 4 ? "line-clamp-4" : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      {showChip && (
        <div dir="ltr" className="flex">
          <LocaleChip locale={locale} />
        </div>
      )}
      <p
        dir={localeDir(locale)}
        lang={locale}
        // The utility class carries the stack; the inline style is the
        // belt-and-braces fallback for environments that render this
        // component without the app stylesheet (tests, isolated stories).
        style={
          script === "arabic"
            ? { fontFamily: RTL_FONT_STACK }
            : script === "cjk"
              ? { fontFamily: CJK_FONT_STACK }
              : undefined
        }
        className={cn(
          "text-sm text-muted-foreground",
          rtl && "text-right",
          script === "arabic" && "font-rtl leading-[1.85]",
          script === "cjk" && "font-cjk leading-[1.9]",
          clampClass,
        )}
      >
        {children}
      </p>
    </div>
  );
}
