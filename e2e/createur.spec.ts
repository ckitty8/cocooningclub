import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

// Le menu latéral de l'administration n'est affiché qu'à partir de 1024 px :
// on teste les pages du créateur sur ordinateur.
test.beforeEach(({ browserName }, info) => {
  test.skip(info.project.name !== "desktop", `scénarios créateur testés sur ordinateur (${browserName})`);
});

const ouvrirEnCreatrice = async (page: import("@playwright/test").Page) => {
  const profil = profilTest();
  await mockSupabase(page, { profil });
  await connecterEn(page, profil);
};

test("la créatrice voit les outils du créateur dans le menu d'administration", async ({ page }) => {
  await ouvrirEnCreatrice(page);
  await page.goto("/admin/dashboard");
  const menu = page.getByRole("navigation").filter({ hasText: "Espace créateur" });
  await expect(menu.getByRole("link", { name: "Simulateur de rôle" })).toBeVisible();
  await menu.getByRole("link", { name: "Matrice des rôles" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Matrice des rôles" })).toBeVisible();

  // Le créateur a tous les droits de l'administrateur : même case cochée sur « Membres ».
  const ligne = page.getByRole("row", { name: /Membres/ }).first();
  await expect(ligne.getByLabel("Autorisé")).toHaveCount(2);
  // Personne ne peut s'attribuer le statut de créateur depuis le site.
  const attribuer = page.getByRole("row", { name: /Devenir créateur/ });
  await expect(attribuer.getByLabel("Autorisé")).toHaveCount(0);
});

test("une administratrice qui n'est pas créatrice n'a ni menu ni accès aux outils", async ({ page }) => {
  const profil = profilTest({ email: "admin@exemple.fr" });
  await mockSupabase(page, { profil });
  await connecterEn(page, profil);
  await page.goto("/admin/dashboard");
  await expect(page.getByRole("link", { name: "Membres" }).first()).toBeVisible();
  await expect(page.getByText("Espace créateur")).toHaveCount(0);

  await page.goto("/admin/createur/matrice");
  await expect(page).toHaveURL(/\/$/);
});

test("le simulateur fait voir le site comme un membre, puis permet d'en sortir", async ({ page }) => {
  await ouvrirEnCreatrice(page);
  await page.goto("/admin/createur/simulateur");
  await page.getByRole("button", { name: "Voir le site comme membre", exact: true }).click();

  // Atterrissage dans l'espace membre, avec le bandeau de simulation.
  await expect(page).toHaveURL(/\/espace-membre$/);
  const bandeau = page.getByRole("status");
  await expect(bandeau).toContainText("Simulation : vous voyez le site comme Membre");

  // Les pages d'administration sont fermées pendant la simulation…
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/$/);
  // …sauf les outils du créateur, pour pouvoir en sortir.
  await page.goto("/admin/createur/simulateur");
  await expect(page.getByRole("heading", { level: 1, name: "Simulateur de rôle" })).toBeVisible();

  await page.getByRole("status").getByRole("button", { name: "Quitter" }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
});

test("le simulateur de coût d'atelier calcule coûts, recettes et seuil, et garde les saisies", async ({ page }) => {
  await ouvrirEnCreatrice(page);
  await page.goto("/admin/dashboard");
  const menu = page.getByRole("navigation").filter({ hasText: "Espace créateur" });
  await menu.getByRole("link", { name: "Coût d'un atelier" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Simulateur de coût d'un atelier" })).toBeVisible();

  // Exemple de départ : coûts 190 € par atelier + 6 € × 10 participantes = 250 € ; recettes 4 × 25 + 4 × 18 = 172 € → déficit de 78 €.
  const resultat = page.getByRole("heading", { name: /^Résultat pour 10 participantes/ }).locator("xpath=..");
  await expect(resultat.getByText("Coût total").locator("xpath=..")).toContainText(/250,00\s€/);
  await expect(resultat.getByText("Déficit").locator("xpath=..")).toContainText(/78,00\s€/);

  // Avec 40 € / 30 € : recettes 4 × 40 + 4 × 30 = 280 € → excédent de 30 €.
  await page.getByLabel("Tarif non-adhérente").fill("40");
  await page.getByLabel("Tarif adhérente (qui règle l'atelier)").fill("30");
  await expect(resultat.getByText("Excédent").locator("xpath=..")).toContainText(/30,00\s€/);

  // Un coût de plus, par participante : 10 × 3 € = 30 € de plus → équilibre.
  await page.getByRole("button", { name: "Coût par participante" }).click();
  await page.getByLabel("Libellé du coût 6").fill("Sacs cadeaux");
  await page.getByLabel("Montant du coût 6 (€)").fill("3");
  await expect(resultat.getByText("Excédent").locator("xpath=..")).toContainText(/0,00\s€/);
  await expect(page.getByText("Selon le remplissage")).toBeVisible();

  // Les saisies sont gardées dans le navigateur.
  await page.reload();
  await expect(page.getByLabel("Tarif non-adhérente")).toHaveValue("40");
  await expect(page.getByLabel("Libellé du coût 6")).toHaveValue("Sacs cadeaux");
});

test("une administratrice qui n'est pas créatrice n'ouvre pas le simulateur de coût d'atelier", async ({ page }) => {
  const profil = profilTest({ email: "admin@exemple.fr" });
  await mockSupabase(page, { profil });
  await connecterEn(page, profil);
  await page.goto("/admin/createur/cout-atelier");
  await expect(page).toHaveURL(/\/$/);
});
