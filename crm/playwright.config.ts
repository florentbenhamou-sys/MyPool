import { defineConfig } from "@playwright/test";

/**
 * Tests de bout en bout (parcours + responsive).
 * Pré-requis : application démarrée (npm run dev ou docker compose up) et base seedée.
 * Chromium : `npx playwright install chromium` (ou PLAYWRIGHT_CHROMIUM_PATH pour un binaire existant).
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  reporter: [["list"]],
});
