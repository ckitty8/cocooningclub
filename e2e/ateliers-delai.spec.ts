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

test("calendrier : sans réponse du serveur, la dernière liste reçue reste affichée", async ({ page }) => {
  test.setTimeout(60000);
  await mockSupabase(page);
  await page.goto("/calendrier");
  await expect(page.getByText(ATELIER_TEST.titre).first()).toBeVisible();

  // Le serveur tombe en panne (comme le 17/11 : erreurs 503) : la liste gardée en mémoire s'affiche quand même.
  await page.route("**/rest/v1/ateliers?select=*", route => route.fulfill({ status: 503, json: { code: "PGRST002", message: "Could not query the database for the schema cache. Retrying." } }));
  await page.reload();
  await expect(page.getByText(ATELIER_TEST.titre).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Chargement des ateliers")).toHaveCount(0);
});
