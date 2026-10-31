import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const ESPACES = [
  { id: "e0000000-0000-4000-8000-000000000001", nom: "Papotages", slug: "papotages" },
  { id: "e0000000-0000-4000-8000-000000000003", nom: "Business", slug: "business" },
];

test("les champs Matin et Après-midi n'existent que pour un atelier Business", async ({ page }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, { profil: admin, espaces: ESPACES });
  await connecterEn(page, admin);
  await page.goto("/admin/ateliers");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();

  const fenetre = page.locator("div.fixed").filter({ hasText: "Titre *" });
  await expect(fenetre.getByLabel("Matin")).toHaveCount(0);

  await fenetre.locator("select").first().selectOption(ESPACES[1].id);
  await expect(fenetre.getByLabel("Matin")).toBeVisible();
  await expect(fenetre.getByLabel("Après-midi")).toBeVisible();

  await fenetre.locator("select").first().selectOption(ESPACES[0].id);
  await expect(fenetre.getByLabel("Matin")).toHaveCount(0);

  await fenetre.locator("select").first().selectOption(ESPACES[1].id);
  await fenetre.getByLabel("Matin").fill("9h30 – 12h : atelier marque personnelle");
  await fenetre.getByLabel("Après-midi").fill("14h – 17h : prise de parole");
  await fenetre.locator("label", { hasText: "Titre *" }).locator("xpath=following-sibling::input").fill("Business - Journée");
  await fenetre.locator("label", { hasText: "Date *" }).locator("xpath=following-sibling::input").fill("2027-03-10");
  await fenetre.locator("label", { hasText: "Heure début *" }).locator("xpath=following-sibling::input").fill("09:30");
  await fenetre.getByRole("button", { name: "Enregistrer", exact: true }).click();

  await expect.poll(() => mock.inserts.ateliers?.[0]).toMatchObject({
    titre: "Business - Journée",
    matin: "9h30 – 12h : atelier marque personnelle",
    apres_midi: "14h – 17h : prise de parole",
  });
});

test("la tuile de la page d'accueil affiche le matin et l'après-midi", async ({ page }) => {
  await mockSupabase(page, {
    ateliers: [{
      ...ATELIER_TEST,
      titre: "Business - Journée",
      espaces: { slug: "business" },
      matin: "9h30 – 12h : marque personnelle",
      apres_midi: "14h – 17h : prise de parole",
    }],
  });
  await page.goto("/");
  const tuile = page.locator("#ateliers");
  await expect(tuile.getByText("Matin :")).toBeVisible();
  await expect(tuile.getByText("9h30 – 12h : marque personnelle")).toBeVisible();
  await expect(tuile.getByText("Après-midi :")).toBeVisible();
  await expect(tuile.getByText("14h – 17h : prise de parole")).toBeVisible();
});

test("sans matin ni après-midi, la tuile n'affiche aucune de ces lignes", async ({ page }) => {
  await mockSupabase(page, {});
  await page.goto("/");
  await expect(page.locator("#ateliers").getByText(ATELIER_TEST.titre).first()).toBeVisible();
  await expect(page.locator("#ateliers").getByText("Matin :")).toHaveCount(0);
  await expect(page.locator("#ateliers").getByText("Après-midi :")).toHaveCount(0);
});
