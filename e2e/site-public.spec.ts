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
  await expect(page.getByRole("heading", { level: 1, name: "À propos du Cocooning Club" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trois univers pour se retrouver" })).toBeVisible();
  // Cartes à retournement : le nom de l'espace est dans un titre lisible par les lecteurs d'écran.
  for (const espace of ["Papotages", "Créatifs", "Business"]) {
    await expect(page.getByRole("heading", { name: espace, exact: true })).toBeAttached();
  }
  await expect(page.getByText(ATELIER_TEST.titre).first()).toBeVisible();
  await expect(page.locator("#ateliers").getByRole("img", { name: "Espace Papotages" })).toBeVisible();
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
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();

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
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();

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
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();
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

test("sur téléphone, le menu de l'en-tête mène au calendrier", async ({ page, isMobile }) => {
  test.skip(!isMobile, "menu réservé aux petits écrans");
  await page.goto("/");
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.locator("#menu-mobile").getByRole("link", { name: "Nos événements" }).click();
  await expect(page).toHaveTitle("Calendrier des ateliers · Cocooning Club");
  await expect(page.locator("#menu-mobile")).toBeHidden();
});

test("le bouton « Notre histoire » de l'accueil mène à la page dédiée", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Notre histoire", exact: true }).first().click();
  await expect(page).toHaveTitle("Notre histoire · Cocooning Club");
  await expect(page.getByRole("heading", { level: 1, name: "Notre histoire" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cinq femmes, une même envie" })).toBeVisible();
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

test("un atelier s'ajoute à l'agenda depuis l'accueil et depuis sa fiche", async ({ page }) => {
  await page.goto("/");
  const carte = page.locator("#ateliers");
  await carte.getByRole("button", { name: "Ajouter à mon agenda" }).first().click();
  const google = carte.getByRole("link", { name: "Google Agenda" });
  await expect(google).toHaveAttribute("href", /calendar\.google\.com.*20\d{6}T140000/);
  // Le choix d'agenda n'ouvre pas la fiche de l'atelier.
  await expect(page).toHaveURL(/\/$/);

  await page.goto(`/calendrier?atelier=${ATELIER_TEST.id}`);
  const telechargement = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: /Apple \/ Outlook/ }).click();
  expect((await telechargement).suggestedFilename()).toMatch(/\.ics$/);
});

test("une adresse inconnue affiche la page 404, exclue de Google", async ({ page }) => {
  await page.goto("/page-qui-n-existe-pas");
  await expect(page.getByText("404")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("la page de connexion est exclue de Google", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle("Connexion à l'espace membre · Cocooning Club");
  await expect(page.getByRole("heading", { level: 1, name: "Bon retour parmi nous" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Mot de passe", { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("les mentions légales sont accessibles depuis le pied de page et nomment l'éditeur et les hébergeurs", async ({ page }) => {
  await page.goto("/");
  await page.locator("footer").getByRole("link", { name: "Mentions légales" }).click();
  await expect(page).toHaveURL(/\/mentions-legales$/);
  await expect(page).toHaveTitle("Mentions légales · Cocooning Club");
  await expect(page.getByRole("heading", { level: 1, name: "Mentions légales" })).toBeVisible();
  await expect(page.getByText("16 rue Graffan, 93190 Livry-Gargan")).toBeVisible();
  await expect(page.getByText("Maëlle Guennanf")).toBeVisible();
  await expect(page.getByText(/Vercel Inc\./)).toBeVisible();
  await expect(page.getByText(/Supabase Inc\./)).toBeVisible();
});
