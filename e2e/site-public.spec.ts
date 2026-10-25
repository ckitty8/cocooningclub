import { expect, test } from "@playwright/test";
import { ATELIER_ORACLE, ATELIER_TEST, MEMBRE_TEST, mockSupabase } from "./supabaseMock";
import { remplirPreInscription, TITRE_MERCI } from "./formulaire";

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
  await expect(page.getByText("Veuillez indiquer votre nom.")).toBeVisible();
  await expect(page.getByText("Veuillez indiquer votre prénom.")).toBeVisible();
  await expect(page.getByText("Veuillez indiquer votre numéro de téléphone.")).toBeVisible();
  await expect(page.getByText("Merci de choisir une réponse.")).toHaveCount(2); // droit à l'image et WhatsApp
  await expect(page.getByText("Merci d'accepter les CGU et la politique de confidentialité.")).toBeVisible();

  await page.getByRole("dialog").locator("select").selectOption(ATELIER_TEST.titre);
  await remplirPreInscription(page.getByRole("dialog"), { prenom: "Léa", nom: "Martin", email: "lea@exemple.fr", tel: "06 11 22 33 44", image: "oui", whatsapp: "non" });
  await page.clock.fastForward(DELAI_ANTI_ROBOT);
  await envoyer.click();

  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  await expect(page.getByText("On a hâte de te rencontrer et de partager ce moment avec toi.")).toBeVisible();
  await expect(page.getByText("Tu recevras un message très bientôt avec les détails pratiques.")).toBeVisible();
  expect(mock.inserts.inscriptions).toEqual([{
    atelier_id: ATELIER_TEST.id,
    prenom_invite: "Léa",
    nom_invite: "Martin",
    email_invite: "lea@exemple.fr",
    telephone_invite: "06 11 22 33 44",
    date_naissance: null,
    autorisation_image: true,
    accord_whatsapp: false,
  }]);
});

test("un membre connecté se pré-inscrit avec son compte, sans délai ni champs invité", async ({ page }) => {
  const mock = await mockSupabase(page, { membre: MEMBRE_TEST });
  await page.goto("/");
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Prénom", { exact: true })).toHaveValue("Marie");
  await expect(dialog.getByLabel("Nom", { exact: true })).toHaveValue("Dupont");
  await expect(dialog.getByLabel("Nom", { exact: true })).not.toBeEditable();
  await expect(dialog.getByLabel("E-mail", { exact: true })).toHaveValue(MEMBRE_TEST.email);
  await expect(dialog.getByLabel("E-mail", { exact: true })).not.toBeEditable();

  await dialog.locator("select").selectOption(ATELIER_TEST.titre);
  await remplirPreInscription(dialog, { tel: "0601020304", image: "non", whatsapp: "oui" });
  // Pas d'attente anti-robot : un membre est authentifié.
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  expect(mock.inserts.inscriptions).toEqual([{
    atelier_id: ATELIER_TEST.id,
    utilisateur_id: MEMBRE_TEST.id,
    telephone_invite: "0601020304",
    date_naissance: null,
    autorisation_image: false,
    accord_whatsapp: true,
  }]);
});

test("l'atelier Pierre & Oracle exige la date de naissance avant l'envoi", async ({ page }) => {
  const mock = await mockSupabase(page, { membre: MEMBRE_TEST, ateliers: [ATELIER_TEST, ATELIER_ORACLE] });
  await page.goto("/");
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();

  const dialog = page.getByRole("dialog");
  await dialog.locator("select").selectOption(ATELIER_ORACLE.titre);
  await remplirPreInscription(dialog, { tel: "0601020304" });
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

  await expect(page.getByText("La date de naissance est requise pour cet atelier.")).toBeVisible();
  expect(mock.inserts.inscriptions).toBeUndefined();

  await dialog.locator('input[type="date"]').fill("1990-05-17");
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  expect(mock.inserts.inscriptions).toEqual([{
    atelier_id: ATELIER_ORACLE.id,
    utilisateur_id: MEMBRE_TEST.id,
    telephone_invite: "0601020304",
    date_naissance: "1990-05-17",
    autorisation_image: true,
    accord_whatsapp: false,
  }]);
});

test("un robot qui remplit le champ piège ne crée aucune pré-inscription", async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();
  await page.getByRole("dialog").locator("select").selectOption(ATELIER_TEST.titre);
  await remplirPreInscription(page.getByRole("dialog"), { prenom: "Robot", nom: "Spam", email: "robot@spam.fr", tel: "0600000000" });
  await page.getByRole("dialog").locator('input[name="site_web"]').fill("http://spam.example", { force: true });
  await page.clock.fastForward(DELAI_ANTI_ROBOT);
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
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

test("le public voit le nombre de places total, jamais les places restantes", async ({ page }) => {
  await page.goto("/");
  const carte = page.locator("#ateliers").getByText(`${ATELIER_TEST.places_max} places`, { exact: true }).first();
  await expect(carte).toBeVisible();
  await expect(page.getByText(/places restantes/)).toHaveCount(0);

  await page.goto("/calendrier");
  await expect(page.getByText(`${ATELIER_TEST.places_max} places`, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/places restantes/)).toHaveCount(0);
  await expect(page.getByText(`${ATELIER_TEST.places_disponibles}/${ATELIER_TEST.places_max}`)).toHaveCount(0);

  await page.goto(`/calendrier?atelier=${ATELIER_TEST.id}`);
  await expect(page.getByRole("dialog").or(page.locator("div.fixed")).getByText(`${ATELIER_TEST.places_max} places`, { exact: true })).toBeVisible();
  await expect(page.getByText(/places restantes/)).toHaveCount(0);
});

test("le menu s'appelle « Notre histoire » (plus « À propos ») et mène à la page", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const menu = isMobile ? page.locator("#menu-mobile") : page.locator("header");
  await expect(menu.getByRole("link", { name: "À propos", exact: true })).toHaveCount(0);
  await menu.getByRole("link", { name: "Notre histoire", exact: true }).first().click();
  await expect(page).toHaveURL(/\/notre-histoire$/);
  await expect(page.getByRole("heading", { level: 1, name: "Notre histoire" })).toBeVisible();
});
