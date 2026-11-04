/**
 * Whether this build renders its own navigation chrome.
 *
 * MarCom runs in two situations and they want opposite things:
 *
 *  - Standalone (local development, and the hosted demo) — the module is the
 *    whole application, so it must supply its own sidebar, topbar and help rail
 *    or there is no way to move around it.
 *  - Embedded in a host platform — the host already provides navigation and its
 *    own page template. Rendering ours as well gives the user two menus, two
 *    identity chips and two scope switchers stacked on one screen.
 *
 * `IS_MENU_VISIBLE` is the single switch between them. When false the routed
 * page content renders alone, with no sidebar, no mobile nav drawer, no topbar
 * and no help rail — the host is expected to frame it.
 *
 * Resolution order:
 *   1. `VITE_IS_MENU_VISIBLE` when set — an explicit answer always wins.
 *   2. Otherwise `import.meta.env.DEV`: true while developing, false in a
 *      production build.
 *
 * Vite inlines `import.meta.env.VITE_*` at BUILD time, so this is a property of
 * the artifact, not a runtime toggle. Set it where the build runs:
 *
 *   # .env.local, or the deploy environment
 *   VITE_IS_MENU_VISIBLE=true
 *
 * NOTE for the hosted demo: a Vercel production build takes the default and
 * would therefore render WITHOUT the menu. The demo needs the chrome, so its
 * build must set `VITE_IS_MENU_VISIBLE=true` explicitly.
 */

/** The env var a build reads to force chrome on or off. */
export const MENU_VISIBILITY_ENV_VAR = "VITE_IS_MENU_VISIBLE";

/**
 * Parses an env value into a decision, or null when it says nothing.
 *
 * Accepts the spellings people actually type. An unrecognised value returns
 * null rather than silently reading as false — a typo should fall through to
 * the default, not blank the navigation.
 */
export function parseMenuVisibility(raw: string | undefined | null): boolean | null {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;
  if (["true", "1", "yes", "on"].includes(value)) return true;
  if (["false", "0", "no", "off"].includes(value)) return false;
  return null;
}

function resolve(): boolean {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const explicit = parseMenuVisibility(env[MENU_VISIBILITY_ENV_VAR] as string | undefined);
  if (explicit !== null) return explicit;
  // Standalone while developing; framed by a host once built for deployment.
  return Boolean(env.DEV);
}

/**
 * True when this build draws its own sidebar, topbar and help rail.
 *
 * Read once at module load: it is a build-time constant, and re-reading it per
 * render would imply it can change while the app is open, which it cannot.
 */
export const IS_MENU_VISIBLE: boolean = resolve();
