import type { Page } from "@playwright/test";

/** Roles used by the smoke suite (subset of APP_ROLES in src/lib/rbac.ts). */
export type AppRole =
  | "CMO"
  | "Brand Manager"
  | "Content Manager"
  | "Platform Admin";

const ROLE_KEY = "marcomm-role";
const STORE_KEY = "marcomm-store";

interface SeedOptions {
  /** Sign in as this demo identity before the app boots. */
  role?: AppRole;
  /** Drop any persisted DataStore so every collection re-reads its seed. */
  freshStore?: boolean;
}

/**
 * Prepares localStorage before any page script runs. Must be called before
 * the first `page.goto`; applies to every subsequent navigation too.
 */
export async function seedLocalStorage(page: Page, opts: SeedOptions): Promise<void> {
  await page.addInitScript(
    ({ role, freshStore, roleKey, storeKey }) => {
      if (role) window.localStorage.setItem(roleKey, role);
      if (freshStore) window.localStorage.removeItem(storeKey);
    },
    { role: opts.role ?? null, freshStore: opts.freshStore ?? false, roleKey: ROLE_KEY, storeKey: STORE_KEY },
  );
}

/** Text of every KPI-tile value currently on the page, joined for comparison. */
export async function kpiValuesSnapshot(page: Page): Promise<string> {
  const values = await page.locator(".text-3xl").allTextContents();
  return values.map((v) => v.trim()).join("|");
}
