import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

test.beforeEach(({ browserName }, info) => {
  test.skip(info.project.name !== "desktop", `scénarios testés sur ordinateur (${browserName})`);
});

const ESPACES = [
  { id: "a0000000-0000-4000-8000-000000000001", nom: "Papotages", slug: "papotages", ordre_affichage: 1 },
  { id: "a0000000-0000-4000-8000-000000000002", nom: "Créatifs", slug: "creatifs", ordre_affichage: 2 },
  { id: "a0000000-0000-4000-8000-000000000003", nom: "Business", slug: "business", ordre_affichage: 3 },
];

const atelier = (n: number, titre: string, antenne: (typeof ESPACES)[number]) => ({
  ...ATELIER_TEST,
  id: `aaaaaaaa-0000-4000-8000-00000000010${n}`,
  titre,
  antenne_id: antenne.id,
  antennes: { slug: antenne.slug },
  tarif_standard: 25,
  tarif_affichage: "25 €",
});

const ATELIERS = [
  atelier(1, "Café des copines", ESPACES[0]),
  atelier(2, "Atelier floral", ESPACES[1]),
  atelier(3, "Pitch en public", ESPACES[2]),
];

const ouvrir = async (page: import("@playwright/test").Page) => {
  const profil = profilTest();
  await mockSupabase(page, { profil, antennes: ESPACES, ateliers: ATELIERS });
  await connecterEn(page, profil);
};

const carte = (page: import("@playwright/test").Page, titre: string) =>
  page.getByRole("main").locator("article, li, div").filter({ hasText: titre }).last();

test("adhérente Créatif : Papotages gratuit, Créatifs inclus, Business à régler", async ({ page }) => {
  await ouvrir(page);
  await page.goto("/admin/createur/simulateur");
  await page.getByRole("button", { name: "Adhérente Créatif" }).click();
  await expect(page).toHaveURL(/espace-membre\/ateliers/);

  await expect(page.getByText("Votre offre").first()).toBeVisible();
  await expect(carte(page, "Café des copines").getByText("Gratuit pour tous")).toBeVisible();
  await expect(carte(page, "Atelier floral").getByText("Inclus dans votre adhésion")).toBeVisible();
  await expect(carte(page, "Pitch en public").getByText(/25 € à régler/)).toBeVisible();
});

test("sans adhésion : seul Papotages est gratuit", async ({ page }) => {
  await ouvrir(page);
  await page.goto("/admin/createur/simulateur");
  await page.getByRole("button", { name: "Sans adhésion" }).click();
  await expect(page.getByText("Aucune adhésion en cours.")).toBeVisible();
  await expect(carte(page, "Café des copines").getByText("Gratuit pour tous")).toBeVisible();
  await expect(carte(page, "Atelier floral").getByText(/25 € à régler/)).toBeVisible();
  await expect(carte(page, "Pitch en public").getByText(/25 € à régler/)).toBeVisible();
});

test("adhérente Complet : tout est inclus", async ({ page }) => {
  await ouvrir(page);
  await page.goto("/admin/createur/simulateur");
  await page.getByRole("button", { name: "Adhérente Complet" }).click();
  await expect(carte(page, "Atelier floral").getByText("Inclus dans votre adhésion")).toBeVisible();
  await expect(carte(page, "Pitch en public").getByText("Inclus dans votre adhésion")).toBeVisible();
});

test("la page « Droits par offre » du créateur résume la règle", async ({ page }) => {
  await ouvrir(page);
  await page.goto("/admin/createur/droits");
  await expect(page.getByRole("heading", { level: 1, name: "Droits par offre" })).toBeVisible();
});
