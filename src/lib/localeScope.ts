/**
 * Where the top-bar language scope actually bites.
 *
 * Language is not a universal axis the way brand, business unit and region are:
 * only ContentVersion, LegalClause and GlossaryTerm carry a locale, so a
 * Campaign or an Approval has no language to filter by. Left unqualified, the
 * top-bar control would look global and silently do nothing on most screens —
 * and a filter that changes nothing is worse than no filter. The topbar reads
 * this list to say where the scope applies instead of implying it is everywhere.
 *
 * Adding a locale consumer? Add its route prefix here in the same change.
 *
 * Kept out of scope.tsx deliberately: these are pure values with no dependency
 * on React, and a component module is the wrong home for them.
 */

/** Route prefixes whose pages narrow their results by the language scope. */
export const LOCALE_SCOPED_ROUTES: readonly string[] = ['/content', '/rulebook'];

/** Readable reach, for the topbar's explanation of where it applies. */
export const LOCALE_SCOPE_HINT = 'Content studio and the Brand rulebook';

/** Whether the language scope narrows anything on the given pathname. */
export function localeScopeApplies(pathname: string): boolean {
  return LOCALE_SCOPED_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
