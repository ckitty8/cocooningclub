import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";
import { remplirPreInscription, TITRE_MERCI } from "./formulaire";

// Lien d'inscription partageable (/inscription/<atelier>) et garantie qu'aucune pré-inscription
// n'est perdue : base, puis demande de secours, puis file du navigateur.

const remplir = (page: import("@playwright/test").Page) =>
  remplirPreInscription(page, { prenom: "Léa", nom: "Martin", email: "lea@exemple.fr", tel: "06 11 22 33 44", image: "oui", whatsapp: "oui" });
const envoyer = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

test("le lien d'inscription ouvre directement le formulaire de l'atelier, même rempli très vite", async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await expect(page.getByRole("heading", { level: 1, name: ATELIER_TEST.titre })).toBeVisible();

  await remplir(page);
  await envoyer(page); // immédiatement : la demande n'est pas jetée, elle attend le délai minimal
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();

  expect(mock.inserts.inscriptions).toEqual([{
    atelier_id: ATELIER_TEST.id,
    prenom_invite: "Léa",
    nom_invite: "Martin",
    email_invite: "lea@exemple.fr",
    telephone_invite: "06 11 22 33 44",
    date_naissance: null,
    autorisation_image: true,
    accord_whatsapp: true,
  }]);
  expect(mock.inserts.pre_inscriptions_secours).toBeUndefined();
});

test("un lien vers un atelier passé ou retiré l'explique et renvoie au calendrier", async ({ page }) => {
  await mockSupabase(page, { ateliers: [] });
  await page.goto("/inscription/aaaaaaaa-0000-4000-8000-0000000000ff");
  await expect(page.getByRole("heading", { level: 1, name: "Atelier introuvable" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Voir les prochains ateliers/ })).toBeVisible();
});

test("si l'enregistrement normal échoue, les coordonnées vont dans les demandes de secours", async ({ page }) => {
  const mock = await mockSupabase(page);
  mock.pannes.inscriptions = true;
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await remplir(page);
  await envoyer(page);

  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  expect(mock.inserts.pre_inscriptions_secours).toEqual([expect.objectContaining({
    prenom: "Léa",
    nom: "Martin",
    email: "lea@exemple.fr",
    telephone: "06 11 22 33 44",
    droit_image: true,
    accord_whatsapp: true,
    atelier_id: ATELIER_TEST.id,
    atelier_titre: ATELIER_TEST.titre,
    utilisateur_id: null,
    erreur: expect.stringContaining("panne simulée"),
  })]);
});

test("si tout échoue, la demande est gardée dans le navigateur puis renvoyée toute seule", async ({ page }) => {
  const mock = await mockSupabase(page);
  mock.pannes.inscriptions = true;
  mock.pannes.secours = true;
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await remplir(page);
  await envoyer(page);

  await expect(page.getByRole("heading", { name: "Demande bien notée" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("cc_preinscriptions_en_attente") ?? "[]").length)).toBe(1);

  // Retour à la normale : au rechargement du site, la demande part en base et la file se vide.
  mock.pannes.inscriptions = false;
  mock.pannes.secours = false;
  await page.reload();
  await expect.poll(() => mock.inserts.inscriptions?.length ?? 0).toBe(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("cc_preinscriptions_en_attente"))).toBeNull();
  expect(mock.inserts.inscriptions[0]).toEqual(expect.objectContaining({ atelier_id: ATELIER_TEST.id, email_invite: "lea@exemple.fr" }));
});

test("un doublon n'est pas repris en secours : la personne est prévenue", async ({ page }) => {
  const mock = await mockSupabase(page);
  mock.pannes.doublon = true;
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await remplir(page);
  await envoyer(page);

  await expect(page.getByText("Une pré-inscription existe déjà pour cet atelier")).toBeVisible();
  expect(mock.inserts.pre_inscriptions_secours).toBeUndefined();
});

test("si la liste des ateliers ne se charge pas, le formulaire du lien reste utilisable", async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.route("**/rest/v1/ateliers*", route => route.fulfill({ status: 500, json: { code: "XX000", message: "panne" } }));
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await expect(page.getByText("Les détails de l'atelier ne se chargent pas")).toBeVisible({ timeout: 15_000 });
  await remplir(page);
  await envoyer(page);

  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  expect(mock.inserts.inscriptions).toEqual([expect.objectContaining({ atelier_id: ATELIER_TEST.id, email_invite: "lea@exemple.fr" })]);
});

test("l'administratrice copie le lien d'inscription d'un atelier", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const admin = profilTest();
  await mockSupabase(page, { profil: admin });
  await connecterEn(page, admin);
  await page.goto("/admin/ateliers");

  await page.getByRole("button", { name: `Copier le lien d'inscription de ${ATELIER_TEST.titre}` }).click();
  await expect(page.getByText("Lien d'inscription copié")).toBeVisible();
  const copie = await page.evaluate(() => navigator.clipboard.readText());
  expect(copie).toBe(`${new URL(page.url()).origin}/inscription/${ATELIER_TEST.id}`);
});

test("l'administratrice voit les demandes à récupérer et les marque comme traitées", async ({ page }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, {
    profil: admin,
    secours: [{
      id: "ffffffff-0000-4000-8000-000000000001",
      cree_le: "2026-10-25T10:00:00Z",
      prenom: "Léa",
      nom: "Martin",
      email: "lea@exemple.fr",
      telephone: "0611223344",
      atelier_titre: ATELIER_TEST.titre,
      erreur: "XX000 : panne simulée",
    }],
  });
  await connecterEn(page, admin);
  await page.goto("/admin/pre-inscriptions");

  const zone = page.getByRole("region", { name: "Demandes à récupérer" });
  await expect(zone.getByText("Léa Martin")).toBeVisible();
  await expect(zone.getByRole("link", { name: "lea@exemple.fr" })).toBeVisible();
  await zone.getByRole("button", { name: "Traitée" }).click();
  await expect(zone).toHaveCount(0);
  expect(mock.deletes.pre_inscriptions_secours).toEqual(["?id=eq.ffffffff-0000-4000-8000-000000000001"]);
});

test("droit à l'image et WhatsApp : une seule case à la fois, et la réponse peut être changée", async ({ page }) => {
  await mockSupabase(page);
  await page.goto(`/inscription/${ATELIER_TEST.id}`);

  const autorise = page.getByRole("checkbox", { name: "J'autorise", exact: true });
  const refuse = page.getByRole("checkbox", { name: "Je n'autorise pas", exact: true });
  await autorise.check();
  await refuse.check();
  await expect(autorise).not.toBeChecked();
  await expect(refuse).toBeChecked();
  await refuse.uncheck();
  await expect(refuse).not.toBeChecked();

  await expect(page.getByText("Les modalités de paiement te seront envoyées après validation de ton inscription.")).toBeVisible();
  await expect(page.getByText("Inscription et paiement au plus tard le vendredi précédant l’atelier.")).toBeVisible();
  await expect(page.getByText("L’atelier est maintenu à partir de 5 participants minimum.")).toBeVisible();
  await expect(page.getByText("Le Cocooning Club est autorisé à m'ajouter au groupe WhatsApp")).toBeVisible();
});

test("la fiche de pré-inscription rappelle la date, l'heure et le lieu de l'atelier", async ({ page }) => {
  await mockSupabase(page);
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  const rappel = page.getByRole("list", { name: "Rappel de l'atelier" });
  await expect(rappel).toBeVisible();
  // 14:00 + 2 h de durée.
  await expect(rappel).toContainText("14h – 16h");
  await expect(rappel).toContainText(String(new Date(ATELIER_TEST.date_atelier + "T00:00:00").getFullYear()));
  await expect(rappel).toContainText("Gagny");
  await expect(rappel.getByRole("link", { name: "1 rue de la Paix, 93220 Gagny" })).toHaveAttribute("href", /google\.com\/maps/);
});

test("depuis l'accueil, le rappel suit l'atelier choisi dans la liste", async ({ page }) => {
  await mockSupabase(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();
  const dialogue = page.getByRole("dialog", { name: "Pré-inscription" });
  const rappel = dialogue.getByRole("list", { name: "Rappel de l'atelier" });
  // L'atelier de la carte est présélectionné : son rappel est déjà là.
  await expect(rappel).toContainText("Gagny");
  await dialogue.locator("select").selectOption("");
  await expect(rappel).toHaveCount(0);
  await dialogue.locator("select").selectOption(ATELIER_TEST.titre);
  await expect(rappel).toContainText("14h – 16h");
});
