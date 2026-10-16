import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";

// Le formulaire ignore les envois faits moins de 3 s après son ouverture
// (anti-robot) : les tests attendent ce délai avant d'envoyer.
const DELAI_ANTI_ROBOT = 3_100;

test.beforeEach(async ({ page }) => {
  await mockSupabase(page);
});

test("l'accueil affiche les espaces et les ateliers à venir", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Cocooning Club/);
  await expect(page.getByRole("heading", { level: 1, name: "À propos du Cocooning Club" })).toBeVisible();
  for (const espace of ["L'Espace Papotages", "L'Espace Créatif", "L'Espace Business"]) {
    await expect(page.getByRole("heading", { name: espace, exact: true })).toBeAttached();
  }
  await expect(page.getByText(ATELIER_TEST.titre).first()).toBeVisible();
});

test("la pré-inscription valide les champs puis envoie uniquement l'identité", async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();

  const envoyer = page.getByRole("button", { name: /Envoyer ma pré-inscription/ });
  await envoyer.click();
  await expect(page.getByText("Le nom doit contenir au moins 2 caractères.")).toBeVisible();
  await expect(page.getByText("Merci d'accepter les CGU et la politique de confidentialité.")).toBeVisible();

  await page.getByPlaceholder("Marie Dupont").fill("Léa Martin");
  await page.getByPlaceholder("marie@email.com").fill("lea@exemple.fr");
  await page.getByRole("dialog").locator("select").selectOption(ATELIER_TEST.titre);
  await page.getByRole("checkbox").check();
  await page.waitForTimeout(DELAI_ANTI_ROBOT);
  await envoyer.click();

  await expect(page.getByRole("heading", { name: "Pré-inscription enregistrée !" })).toBeVisible();
  expect(mock.inserts.inscriptions).toEqual([{
    atelier_id: ATELIER_TEST.id,
    prenom_invite: "Léa",
    nom_invite: "Martin",
    email_invite: "lea@exemple.fr",
    telephone_invite: null,
    date_naissance: null,
  }]);
});

test("un robot qui remplit le champ piège ne crée aucune pré-inscription", async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();
  await page.getByPlaceholder("Marie Dupont").fill("Robot Spam");
  await page.getByPlaceholder("marie@email.com").fill("robot@spam.fr");
  await page.getByRole("dialog").locator("select").selectOption(ATELIER_TEST.titre);
  await page.getByRole("checkbox").check();
  await page.getByRole("dialog").locator('input[name="site_web"]').fill("http://spam.example", { force: true });
  await page.waitForTimeout(DELAI_ANTI_ROBOT);
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

  await expect(page.getByRole("heading", { name: "Pré-inscription enregistrée !" })).toBeVisible();
  expect(mock.inserts.inscriptions).toBeUndefined();
});

test("sur téléphone, le menu de l'en-tête mène au calendrier", async ({ page, isMobile }) => {
  test.skip(!isMobile, "menu réservé aux petits écrans");
  await page.goto("/");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.locator("#menu-mobile").getByRole("link", { name: "Nos événements" }).click();
  await expect(page).toHaveTitle("Calendrier des ateliers · Cocooning Club");
  await expect(page.locator("#menu-mobile")).toBeHidden();
});

test("le lien partagé d'un atelier ouvre directement sa fiche dans le calendrier", async ({ page }) => {
  await page.goto(`/calendrier?atelier=${ATELIER_TEST.id}`);
  await expect(page).toHaveTitle("Calendrier des ateliers · Cocooning Club");
  await expect(page.getByRole("dialog", { name: ATELIER_TEST.titre })).toBeVisible();
});

test("le lien Contact du pied de page mène à la section contact depuis une autre page", async ({ page }) => {
  await page.goto("/cgu");
  await expect(page.getByRole("heading", { name: "Conditions générales d'utilisation" })).toBeVisible();
  await page.locator("footer").getByRole("link", { name: "Contact" }).click();
  await expect(page).toHaveURL(/\/#contact$/);
  await expect(page.locator("#contact")).toBeInViewport();
});

test("une adresse inconnue affiche la page 404, exclue de Google", async ({ page }) => {
  await page.goto("/page-qui-n-existe-pas");
  await expect(page.getByText("404")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("la page de connexion est exclue de Google", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle("Connexion à l'espace membre · Cocooning Club");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});
