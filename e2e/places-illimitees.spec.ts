import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const ESPACES = [{ id: "e0000000-0000-4000-8000-000000000001", nom: "Papotages", slug: "papotages" }];

const remplirAtelier = async (page: import("@playwright/test").Page) => {
  const fenetre = page.locator("div.fixed").filter({ hasText: "Titre *" });
  await fenetre.locator("select").first().selectOption(ESPACES[0].id);
  await fenetre.locator("label", { hasText: "Titre *" }).locator("xpath=following-sibling::input").fill("Papotages - Sans limite");
  await fenetre.locator("label", { hasText: "Date *" }).locator("xpath=following-sibling::input").fill("2027-03-10");
  await fenetre.locator("label", { hasText: "Heure début *" }).locator("xpath=following-sibling::input").fill("14:00");
  return fenetre;
};

test("« Places max » laissé vide : l'atelier s'enregistre avec des places illimitées", async ({ page }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, { profil: admin, espaces: ESPACES });
  await connecterEn(page, admin);
  await page.goto("/admin/ateliers");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();

  const fenetre = await remplirAtelier(page);
  const champ = fenetre.locator("label", { hasText: "Places max" }).locator("xpath=following-sibling::input");
  await champ.fill("");
  await expect(fenetre.getByText("Laisser vide : places illimitées")).toBeVisible();
  await fenetre.getByRole("button", { name: "Enregistrer", exact: true }).click();

  await expect.poll(() => mock.inserts.ateliers?.[0]).toMatchObject({
    titre: "Papotages - Sans limite", places_max: null, places_disponibles: null,
  });
});

test("une capacité renseignée reste enregistrée avec ses places libres", async ({ page }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, { profil: admin, espaces: ESPACES });
  await connecterEn(page, admin);
  await page.goto("/admin/ateliers");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();

  const fenetre = await remplirAtelier(page);
  await fenetre.locator("label", { hasText: "Places max" }).locator("xpath=following-sibling::input").fill("12");
  await fenetre.getByRole("button", { name: "Enregistrer", exact: true }).click();

  await expect.poll(() => mock.inserts.ateliers?.[0]).toMatchObject({ places_max: 12, places_disponibles: 12 });
});

test("l'accueil n'affiche aucun nombre de places pour un atelier illimité, et il reste ouvert aux inscriptions", async ({ page }) => {
  await mockSupabase(page, { ateliers: [{ ...ATELIER_TEST, places_max: null, places_disponibles: null }] });
  await page.goto("/");
  const tuiles = page.locator("#ateliers");
  await expect(tuiles.getByText(ATELIER_TEST.titre).first()).toBeVisible();
  await expect(tuiles.getByText(/\d+ places/)).toHaveCount(0);
  await expect(tuiles.getByText("null")).toHaveCount(0);
  await expect(tuiles.getByRole("button", { name: "Pré-inscription" })).toBeEnabled();
});

test("le calendrier public n'affiche aucun nombre de places pour un atelier illimité", async ({ page }) => {
  await mockSupabase(page, { ateliers: [{ ...ATELIER_TEST, places_max: null, places_disponibles: null }] });
  await page.goto(`/calendrier?atelier=${ATELIER_TEST.id}`);
  await expect(page.getByText(ATELIER_TEST.titre).first()).toBeVisible();
  await expect(page.getByText(/\d+ places/)).toHaveCount(0);
});

test("les écrans d'administration affichent « illimitées » pour un atelier sans limite", async ({ page }) => {
  const admin = profilTest();
  await mockSupabase(page, { profil: admin, ateliers: [{ ...ATELIER_TEST, places_max: null, places_disponibles: null, espace_id: ESPACES[0].id }], espaces: ESPACES });
  await connecterEn(page, admin);
  await page.goto("/admin/ateliers");
  await expect(page.getByText("Places illimitées").first()).toBeVisible();
  await expect(page.getByText("NaN")).toHaveCount(0);
});
