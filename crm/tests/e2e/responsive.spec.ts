import { expect, test } from "@playwright/test";

/**
 * Aucune page ne doit nécessiter de défilement horizontal, sur les largeurs cibles.
 * Pré-requis : application démarrée + base seedée (npm run db:seed).
 */
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440];
const STATIC_PAGES = [
  "/",
  "/entities",
  "/entities/new",
  "/meetings",
  "/demos",
  "/rfps",
  "/proposals",
  "/catalog/products",
  "/catalog/subscriptions",
  "/catalog/services",
  "/catalog/maintenances",
  "/admin",
  "/search?q=acme",
];

async function firstDetailLinks(page: import("@playwright/test").Page) {
  const paths: string[] = [];
  for (const [list, prefix] of [
    ["/entities", "/entities/"],
    ["/proposals", "/proposals/"],
    ["/meetings", "/meetings/"],
    ["/demos", "/demos/"],
    ["/rfps", "/rfps/"],
  ] as const) {
    await page.goto(list);
    const href = await page
      .locator(`a[href^="${prefix}"]:not([href$="/new"])`)
      .first()
      .getAttribute("href")
      .catch(() => null);
    if (href) paths.push(href);
  }
  return paths;
}

test("aucun débordement horizontal", async ({ page }) => {
  test.setTimeout(240_000);
  const pages = [...STATIC_PAGES, ...(await firstDetailLinks(page))];
  const failures: string[] = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) failures.push(`${path} @ ${width}px : +${overflow}px`);
    }
  }
  expect(failures).toEqual([]);
});
