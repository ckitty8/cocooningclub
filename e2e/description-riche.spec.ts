import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const ESPACE = { id: "e0000000-0000-4000-8000-000000000001", nom: "Papotages", slug: "papotages" };

test("la description complète se met en forme dans l'éditeur et s'enregistre en HTML", async ({ page }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, { profil: admin, espaces: [ESPACE] });
  await connecterEn(page, admin);
  await page.goto("/admin/ateliers");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();

  const fenetre = page.locator("div.fixed").filter({ hasText: "Titre (obligatoire)" });
  await fenetre.locator("select").first().selectOption(ESPACE.id);
  await fenetre.locator("label", { hasText: "Titre (obligatoire)" }).locator("xpath=following-sibling::input").fill("Journée contenus");
  await fenetre.locator("label", { hasText: "Date (obligatoire)" }).locator("xpath=following-sibling::input").fill("2027-03-10");
  await fenetre.locator("label", { hasText: "Heure début (obligatoire)" }).locator("xpath=following-sibling::input").fill("10:30");

  const editeur = fenetre.getByRole("textbox", { name: "Description complète" });
  await editeur.click();
  await page.getByRole("button", { name: "Titre", exact: true }).click();
  await page.keyboard.type("Au programme");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Une matinée ");
  await page.getByRole("button", { name: "Gras" }).click();
  await page.keyboard.type("coworking");
  await page.getByRole("button", { name: "Gras" }).click();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Liste à puces" }).click();
  await page.keyboard.type("Photos");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Vidéos");
  await expect(editeur.getByRole("heading", { name: "Au programme" })).toBeVisible();

  await fenetre.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect.poll(() => (mock.inserts.ateliers?.[0] as { description?: string } | undefined)?.description).toBe(
    "<h2>Au programme</h2><p>Une matinée <strong>coworking</strong></p><ul><li><p>Photos</p></li><li><p>Vidéos</p></li></ul>",
  );
});

test("une ancienne description en texte brut est reprise dans l'éditeur, retours à la ligne compris", async ({ page }) => {
  const admin = profilTest();
  await mockSupabase(page, {
    profil: admin,
    espaces: [ESPACE],
    ateliers: [{ ...ATELIER_TEST, espace_id: ESPACE.id, description: "Le concept : une matinée coworking.\nPuis un après-midi photos." }],
  });
  await connecterEn(page, admin);
  await page.goto(`/admin/ateliers?modifier=${ATELIER_TEST.id}`);
  const editeur = page.getByRole("textbox", { name: "Description complète" });
  await expect(editeur).toContainText("Le concept : une matinée coworking.");
  await expect(editeur).toContainText("Puis un après-midi photos.");
  await expect(editeur.locator("br")).toHaveCount(1);
});

test("le calendrier public affiche la mise en forme, sans script", async ({ page }) => {
  await mockSupabase(page, {
    ateliers: [{
      ...ATELIER_TEST,
      description: '<h2>Au programme</h2><p><strong>Matin</strong> : coworking</p><ul><li><p>Photos</p></li></ul><img src="x" onerror="window.pirate=1">',
    }],
  });
  await page.goto(`/calendrier?atelier=${ATELIER_TEST.id}`);
  const description = page.locator(".texte-riche");
  await expect(description.getByRole("heading", { name: "Au programme" })).toBeVisible();
  await expect(description.locator("strong", { hasText: "Matin" })).toBeVisible();
  await expect(description.getByRole("listitem")).toHaveText("Photos");
  await expect(description.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { pirate?: number }).pirate)).toBeUndefined();
});
