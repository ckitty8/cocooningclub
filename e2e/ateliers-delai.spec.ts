import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";

// 17/11 : une réponse qui ne revient jamais laissait « Chargement des ateliers… » affiché sans fin.
test("calendrier : une requête restée sans réponse est relancée et les ateliers s'affichent", async ({ page }) => {
  test.setTimeout(45000);
  await mockSupabase(page);
  let appels = 0;
  await page.route("**/rest/v1/ateliers?select=*", async route => {
    appels += 1;
    if (appels === 1) return; // jamais de réponse
    await route.fallback();
  });
  await page.goto("/calendrier");
  await expect(page.getByText(ATELIER_TEST.titre).first()).toBeVisible({ timeout: 20000 });
  expect(appels).toBeGreaterThanOrEqual(2);
});
