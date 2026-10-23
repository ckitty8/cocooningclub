import { expect, test } from "@playwright/test";
import { ATELIER_ORACLE, ATELIER_TEST, MEMBRE_TEST, mockSupabase } from "./supabaseMock";

// Le formulaire ignore les envois faits moins de 3 s après son ouverture
// (anti-robot) : les tests avancent l'horloge du navigateur de ce délai
// plutôt que de l'attendre pour de vrai.
const DELAI_ANTI_ROBOT = 3_100;

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await mockSupabase(page);
});

test("l'accueil affiche les espaces et les ateliers à venir", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Cocooning Club/);
  await expect(page.getByRole("heading", { name: "Nos espaces" })).toBeVisible();
  for (const espace of ["Papotages", "Créatifs", "Business"]) {
    await expect(page.getByRole("heading", { name: espace, exact: true })).toBeAttached();
  }
  await expect(page.getByText(ATELIER_TEST.titre).first()).toBeVisible();
});

test("la pré-inscription valide les champs puis envoie uniquement l'identité", async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Découvrir les prochains ateliers" }).click();

  const envoyer = page.getByRole("button", { name: /Envoyer ma pré-inscription/ });
  await envoyer.click();
  await expect(page.getByText("Le nom doit contenir au moins 2 caractères.")).toBeVisible();
  await expect(page.getByText("Merci d'accepter les CGU et la politique de confidentialité.")).toBeVisible();

  await page.getByPlaceholder("Marie Dupont").fill("Léa Martin");
  await page.getByPlaceholder("marie@email.com").fill("lea@exemple.fr");
  await page.getByRole("dialog").locator("select").selectOption(ATELIER_TEST.titre);
  await page.getByRole("checkbox").check();
  await page.clock.fastForward(DELAI_ANTI_ROBOT);
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

test("un membre connecté se pré-inscrit avec son compte, sans délai ni champs invité", async ({ page }) => {
  const mock = await mockSupabase(page, { membre: MEMBRE_TEST });
  await page.goto("/");
  await page.getByRole("button", { name: "Découvrir les prochains ateliers" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByPlaceholder("Marie Dupont")).toHaveValue("Marie Dupont");
  await expect(dialog.getByPlaceholder("Marie Dupont")).not.toBeEditable();
  await expect(dialog.getByPlaceholder("marie@email.com")).toHaveValue(MEMBRE_TEST.email);
  await expect(dialog.getByPlaceholder("marie@email.com")).not.toBeEditable();

  await dialog.locator("select").selectOption(ATELIER_TEST.titre);
  await page.getByRole("checkbox").check();
  // Pas d'attente anti-robot : un membre est authentifié.
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

  await expect(page.getByRole("heading", { name: "Pré-inscription enregistrée !" })).toBeVisible();
  expect(mock.inserts.inscriptions).toEqual([{
    atelier_id: ATELIER_TEST.id,
    utilisateur_id: MEMBRE_TEST.id,
    telephone_invite: null,
    date_naissance: null,
  }]);
});

test("l'atelier Pierre & Oracle exige la date de naissance avant l'envoi", async ({ page }) => {
  const mock = await mockSupabase(page, { membre: MEMBRE_TEST, ateliers: [ATELIER_TEST, ATELIER_ORACLE] });
  await page.goto("/");
  await page.getByRole("button", { name: "Découvrir les prochains ateliers" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.locator("select").selectOption(ATELIER_ORACLE.titre);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

  await expect(page.getByText("La date de naissance est requise pour cet atelier.")).toBeVisible();
  expect(mock.inserts.inscriptions).toBeUndefined();

  await dialog.locator('input[type="date"]').fill("1990-05-17");
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

  await expect(page.getByRole("heading", { name: "Pré-inscription enregistrée !" })).toBeVisible();
  expect(mock.inserts.inscriptions).toEqual([{
    atelier_id: ATELIER_ORACLE.id,
    utilisateur_id: MEMBRE_TEST.id,
    telephone_invite: null,
    date_naissance: "1990-05-17",
  }]);
});

test("un robot qui remplit le champ piège ne crée aucune pré-inscription", async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Découvrir les prochains ateliers" }).click();
  await page.getByPlaceholder("Marie Dupont").fill("Robot Spam");
  await page.getByPlaceholder("marie@email.com").fill("robot@spam.fr");
  await page.getByRole("dialog").locator("select").selectOption(ATELIER_TEST.titre);
  await page.getByRole("checkbox").check();
  await page.getByRole("dialog").locator('input[name="site_web"]').fill("http://spam.example", { force: true });
  await page.clock.fastForward(DELAI_ANTI_ROBOT);
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

  await expect(page.getByRole("heading", { name: "Pré-inscription enregistrée !" })).toBeVisible();
  expect(mock.inserts.inscriptions).toBeUndefined();
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
