import { expect, test, type Page } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";

// Bannière de consentement : rien n'est mesuré avant le choix ; Google Analytics (identifiant factice
// G-TEST000000 fixé dans playwright.config.ts) n'est chargé qu'après « Tout accepter ».

const surveillerGoogle = async (page: Page) => {
  const requetes: string[] = [];
  await page.route(/googletagmanager\.com/, route => {
    requetes.push(route.request().url());
    return route.fulfill({ contentType: "application/javascript", body: "" });
  });
  return requetes;
};

test("avant tout choix : la bannière s'affiche et rien n'est mesuré", async ({ page }) => {
  const mock = await mockSupabase(page, { sansChoixCookies: true });
  const google = await surveillerGoogle(page);
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Cookies et mesure d'audience" })).toBeVisible();
  await page.waitForTimeout(500);
  expect(google).toEqual([]);
  expect(mock.inserts.visites_site ?? []).toHaveLength(0);
});

test("« Tout refuser » : aucune mesure, ni Google ni comptage interne, et le choix est conservé", async ({ page }) => {
  const mock = await mockSupabase(page, { sansChoixCookies: true });
  const google = await surveillerGoogle(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await expect(page.getByRole("dialog", { name: "Cookies et mesure d'audience" })).toHaveCount(0);

  await page.reload();
  await page.waitForTimeout(500);
  await expect(page.getByRole("dialog", { name: "Cookies et mesure d'audience" })).toHaveCount(0);
  expect(google).toEqual([]);
  expect(mock.inserts.visites_site ?? []).toHaveLength(0);
});

test("« Tout accepter » : Google Analytics est chargé et les visites sont comptées", async ({ page }) => {
  const mock = await mockSupabase(page, { sansChoixCookies: true });
  const google = await surveillerGoogle(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Tout accepter" }).click();
  await expect.poll(() => google.some(u => u.includes("gtag/js?id=G-TEST000000"))).toBe(true);

  await page.goto("/notre-histoire");
  await expect.poll(() => mock.inserts.visites_site?.length ?? 0).toBeGreaterThan(0);
  const evenements = await page.evaluate(() =>
    window.dataLayer.map(e => Array.from(e as ArrayLike<unknown>)).filter(a => a[0] === "event").map(a => a[2]),
  );
  expect(evenements.some(e => (e as { page_path: string }).page_path === "/notre-histoire")).toBe(true);
});

test("« Gérer mes cookies » rouvre le choix, et un refus efface les cookies Google", async ({ page }) => {
  await mockSupabase(page, { sansChoixCookies: true });
  await surveillerGoogle(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Tout accepter" }).click();
  await page.evaluate(() => { document.cookie = "_ga=GA1.1.123; path=/"; });
  expect(await page.evaluate(() => document.cookie)).toContain("_ga=");

  await page.locator("footer").getByRole("button", { name: "Gérer mes cookies" }).click();
  const fenetre = page.getByRole("dialog", { name: "Cookies et mesure d'audience" });
  await expect(fenetre.getByRole("checkbox", { name: /Mesure d'audience/ })).toBeChecked();
  await fenetre.getByRole("button", { name: "Tout refuser" }).click();
  expect(await page.evaluate(() => document.cookie)).not.toContain("_ga=");
});

test("« Personnaliser » : le choix par défaut est le refus", async ({ page }) => {
  const mock = await mockSupabase(page, { sansChoixCookies: true });
  const google = await surveillerGoogle(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Personnaliser" }).click();
  const fenetre = page.getByRole("dialog", { name: "Cookies et mesure d'audience" });
  await expect(fenetre.getByRole("checkbox", { name: /Mesure d'audience/ })).not.toBeChecked();
  await fenetre.getByRole("button", { name: "Enregistrer mon choix" }).click();
  await page.waitForTimeout(300);
  expect(google).toEqual([]);
  expect(mock.inserts.visites_site ?? []).toHaveLength(0);
});
