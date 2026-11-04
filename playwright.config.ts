import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke config for the MarComm demo app.
 * The app serves under /marcomm/ on the Vite dev server (port 8091); an
 * already-running dev server is reused rather than restarted.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8091/marcomm/",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    /**
     * Pinned to the `default` pack, not the app's default world.
     *
     * These are fixture-based specs: they assert on named records and on
     * specific locales (ja-JP for the CJK face, ar-SA for RTL). Packs share
     * record SHAPES and STATE COVERAGE, not content — the renewable pack
     * carries de-DE where this one carries ja-JP, per its own spec — so the
     * assertions are only meaningful against the pack they were written for.
     * Same reasoning as `getPackDB('default')` in src/test/ai-review.test.ts.
     *
     * Verifying a specific pack renders is a separate run:
     *   VITE_DEMO_PACK=renewable npm run dev   (then point Playwright at it)
     */
    command: "VITE_DEMO_PACK=default npm run dev",
    port: 8091,
    reuseExistingServer: true,
  },
});
