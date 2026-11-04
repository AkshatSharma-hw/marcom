/**
 * Tests for the navigation-chrome switch.
 *
 * The failure this guards against is silent: a typo in the env var blanking the
 * whole menu in a build nobody re-checks. `parseMenuVisibility` therefore
 * returns null for anything it does not recognise, so an unreadable value falls
 * through to the default instead of reading as false.
 */

import { describe, expect, it } from 'vitest';
import { parseMenuVisibility, MENU_VISIBILITY_ENV_VAR, IS_MENU_VISIBLE } from '@/lib/appChrome';

describe('menu visibility env parsing', () => {
  it('reads the spellings people actually type as true', () => {
    for (const raw of ['true', 'TRUE', ' True ', '1', 'yes', 'on']) {
      expect(parseMenuVisibility(raw), `"${raw}"`).toBe(true);
    }
  });

  it('reads the negative spellings as false', () => {
    for (const raw of ['false', 'FALSE', ' False ', '0', 'no', 'off']) {
      expect(parseMenuVisibility(raw), `"${raw}"`).toBe(false);
    }
  });

  it('returns null — not false — when the value says nothing', () => {
    // Falling through to the default is the safe outcome. Treating a typo as
    // false would ship a build with no navigation at all.
    for (const raw of [undefined, null, '', '   ', 'ture', 'maybe', 'enabled']) {
      expect(parseMenuVisibility(raw), `${String(raw)}`).toBeNull();
    }
  });

  it('names the env var the build actually reads', () => {
    // Vite only exposes variables prefixed VITE_ to client code; a rename that
    // drops the prefix would make the switch silently inert.
    expect(MENU_VISIBILITY_ENV_VAR).toBe('VITE_IS_MENU_VISIBLE');
    expect(MENU_VISIBILITY_ENV_VAR.startsWith('VITE_')).toBe(true);
  });

  it('resolves to a boolean under the test runner', () => {
    // Vitest runs with DEV true and no override, so chrome is on — the same
    // answer local development gets.
    expect(typeof IS_MENU_VISIBLE).toBe('boolean');
    expect(IS_MENU_VISIBLE).toBe(true);
  });
});
