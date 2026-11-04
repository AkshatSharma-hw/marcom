/**
 * Locale-pinning guard.
 *
 * The app chrome is English everywhere, for every viewer. That is only true if
 * no formatting or collation call falls back to the *host* locale — the
 * browser's `navigator.language`, which we do not control and which differs
 * per user. A single `toLocaleString()` with no argument is enough to render
 * "1.234" to a German viewer and "1,234" to an American one on the same
 * screen, and a bare `localeCompare` reorders lists under a different
 * collation.
 *
 * Every such call must name its locale — `DEFAULT_LOCALE` for chrome, or the
 * content's own locale where the content is deliberately localized (that path
 * goes through src/lib/i18n.ts, which pins the BCP-47 tag explicitly).
 *
 * This test reads the source rather than exercising behaviour, because the
 * failure it prevents only reproduces on a machine whose locale is not en-US —
 * which is nobody's dev machine and everybody's customer.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');

/** This file quotes the very patterns it bans, so it must exempt itself. */
const SELF = 'test/locale-pinning.test.ts';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

interface Offence {
  file: string;
  line: number;
  text: string;
}

function scan(pattern: RegExp): Offence[] {
  const offences: Offence[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = relative(SRC, file).split('\\').join('/');
    if (rel === SELF) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      // Reset per line — these regexes are global.
      pattern.lastIndex = 0;
      if (pattern.test(text)) {
        offences.push({ file: rel, line: i + 1, text: text.trim() });
      }
    });
  }
  return offences;
}

const report = (offences: Offence[]) =>
  offences.map((o) => `  ${o.file}:${o.line}  ${o.text}`).join('\n');

describe('locale pinning', () => {
  it('no toLocale* formatter falls back to the host locale', () => {
    // Matches `.toLocaleString()`, `.toLocaleDateString()` etc. with no
    // arguments at all, or with `undefined` as the locale argument.
    const implicit =
      /\.toLocale(?:String|DateString|TimeString|UpperCase|LowerCase)\(\s*(?:\)|undefined\b)/g;
    const offences = scan(implicit);
    expect(
      offences,
      `These calls read the viewer's browser locale. Pass DEFAULT_LOCALE (or the content's own locale):\n${report(offences)}`,
    ).toEqual([]);
  });

  it('no localeCompare falls back to the host collation', () => {
    // A single-argument localeCompare sorts under whatever collation the
    // browser happens to use. Matches a call whose argument list has no
    // top-level comma.
    const implicit = /\.localeCompare\([^,)]*\)/g;
    const offences = scan(implicit);
    expect(
      offences,
      `These comparisons sort under the viewer's collation. Pass DEFAULT_LOCALE as the second argument:\n${report(offences)}`,
    ).toEqual([]);
  });

  it('no Intl formatter is constructed without a locale', () => {
    // `new Intl.NumberFormat()` and `new Intl.NumberFormat(undefined, …)` both
    // resolve to the host locale.
    const implicit = /new Intl\.[A-Za-z]+\(\s*(?:\)|undefined\b)/g;
    const offences = scan(implicit);
    expect(
      offences,
      `These formatters resolve to the viewer's locale. Name the locale explicitly:\n${report(offences)}`,
    ).toEqual([]);
  });

  it('the guard actually catches the patterns it claims to', () => {
    // Guards the guard: a regex typo would make all three tests vacuously
    // pass, which is the failure mode that matters for a source-scanning test.
    const toLocale =
      /\.toLocale(?:String|DateString|TimeString|UpperCase|LowerCase)\(\s*(?:\)|undefined\b)/g;
    const compare = /\.localeCompare\([^,)]*\)/g;
    const intl = /new Intl\.[A-Za-z]+\(\s*(?:\)|undefined\b)/g;

    expect(toLocale.test('value.toLocaleString()')).toBe(true);
    toLocale.lastIndex = 0;
    expect(toLocale.test('d.toLocaleDateString(undefined, { month: "short" })')).toBe(true);
    toLocale.lastIndex = 0;
    expect(toLocale.test('value.toLocaleString(DEFAULT_LOCALE)')).toBe(false);

    expect(compare.test('a.name.localeCompare(b.name)')).toBe(true);
    compare.lastIndex = 0;
    expect(compare.test('a.name.localeCompare(b.name, DEFAULT_LOCALE)')).toBe(false);

    expect(intl.test('new Intl.NumberFormat()')).toBe(true);
    intl.lastIndex = 0;
    expect(intl.test('new Intl.NumberFormat("en-US", opts)')).toBe(false);
  });
});
