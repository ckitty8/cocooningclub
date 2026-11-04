import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";
import { remplirPreInscription, TITRE_MERCI } from "./formulaire";

// Créneaux des ateliers Business : matinée, après-midi ou journée entière (décisions du 03/11).

const ESPACES = [
  { id: "e0000000-0000-4000-8000-000000000001", nom: "Papotages", slug: "papotages" },
  { id: "e0000000-0000-4000-8000-000000000003", nom: "Business", slug: "business" },
];

const ATELIER_BUSINESS = {
  ...ATELIER_TEST,
  titre: "Journée Création Instagram",
  heure_debut: "10:00:00",
  duree: "7h",
  tarif_standard: 0,
  tarif_affichage: null,
  matin: "Shooting photo de tes produits",
  apres_midi: "Montage de Reels",
  espaces: { slug: "business" },
  // Matinée limitée à 1 place, après-midi illimité, journée à 40 € ; pas de prix pour les demi-journées.
  creneaux: { matin: { debut: "10:00", fin: "13:00", places: 1 }, apres_midi: { debut: "14:00", fin: "17:00" }, journee: { tarif: 40 } },
};

test("pré-inscription : le choix du créneau est demandé, un créneau complet est grisé, le choix est enregistré", async ({ page }) => {
  const mock = await mockSupabase(page, { ateliers: [ATELIER_BUSINESS] });
  // La matinée a déjà sa place validée : la matinée et la journée entière sont complètes.
  await page.route("**/rest/v1/rpc/places_creneaux*", route => route.fulfill({ json: [{ matin: 1, apres_midi: 0 }] }));
  await page.goto(`/inscription/${ATELIER_BUSINESS.id}`);

  const choix = page.getByRole("group", { name: /Je viens/ });
  await expect(choix.getByRole("radio")).toHaveCount(3);
  await expect(choix.getByRole("radio", { name: /La matinée/ })).toBeDisabled();
  await expect(choix.getByRole("radio", { name: /La journée entière/ })).toBeDisabled();
  await expect(choix.getByText("Shooting photo de tes produits")).toBeVisible();
  await expect(choix.getByText("14:00 – 17:00")).toBeVisible();
  // Prix facultatif : seule la journée en a un.
  await expect(choix.getByText("40 €")).toBeVisible();
  await expect(choix.getByText(/€/)).toHaveCount(1);

  await remplirPreInscription(page, { prenom: "Léa", nom: "Martin", email: "lea@exemple.fr", tel: "06 11 22 33 44", image: "oui", whatsapp: "oui" });
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();
  await expect(page.getByText("Merci de choisir la matinée, l'après-midi ou la journée entière.")).toBeVisible();
  expect(mock.inserts.inscriptions).toBeUndefined();

  await choix.getByRole("radio", { name: /L'après-midi/ }).check();
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  await expect(page.getByText(/Après-midi/)).toBeVisible();
  expect(mock.inserts.inscriptions).toEqual([expect.objectContaining({ atelier_id: ATELIER_BUSINESS.id, creneau: "apres_midi" })]);
});

test("un atelier sans créneau s'inscrit comme avant (pas de choix, pas de colonne envoyée)", async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await expect(page.getByRole("group", { name: /Je viens/ })).toHaveCount(0);
  await remplirPreInscription(page, { prenom: "Léa", nom: "Martin", email: "lea@exemple.fr", tel: "06 11 22 33 44" });
  await page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  expect(mock.inserts.inscriptions?.[0]).not.toHaveProperty("creneau");
});

test("admin : les créneaux se cochent dans le formulaire d'un atelier Business, prix facultatifs", async ({ page }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, { profil: admin, espaces: ESPACES });
  await connecterEn(page, admin);
  await page.goto("/admin/ateliers");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  const fenetre = page.locator("div.fixed").filter({ hasText: "Titre *" });
  await expect(fenetre.getByText("Créneaux proposés à l'inscription")).toHaveCount(0);

  await fenetre.locator("select").first().selectOption(ESPACES[1].id);
  const creneaux = fenetre.getByRole("group", { name: "Créneaux proposés à l'inscription" });
  await creneaux.getByRole("checkbox", { name: "Proposer la matinée" }).check();
  await creneaux.locator("#creneau-matin-debut").fill("10:00");
  await creneaux.locator("#creneau-matin-fin").fill("13:00");
  await creneaux.locator("#creneau-matin-places").fill("8");
  await creneaux.getByRole("checkbox", { name: "Proposer la journée entière" }).check();
  await creneaux.locator("#creneau-journee-tarif").fill("40");

  await fenetre.locator("label", { hasText: "Titre *" }).locator("xpath=following-sibling::input").fill("Journée Création");
  await fenetre.locator("label", { hasText: "Date *" }).locator("xpath=following-sibling::input").fill("2027-03-10");
  await fenetre.locator("label", { hasText: "Heure début *" }).locator("xpath=following-sibling::input").fill("10:00");
  await fenetre.getByRole("button", { name: "Enregistrer", exact: true }).click();

  await expect.poll(() => mock.inserts.ateliers?.[0]).toMatchObject({
    titre: "Journée Création",
    creneaux: {
      matin: { debut: "10:00", fin: "13:00", places: 8, tarif: null, tarif_adherent: null },
      journee: { tarif: 40, tarif_adherent: null },
    },
  });
  expect((mock.inserts.ateliers?.[0] as { creneaux: object }).creneaux).not.toHaveProperty("apres_midi");
});

test("admin : la liste des pré-inscriptions montre le créneau choisi et les places par demi-journée", async ({ page }) => {
  const admin = profilTest({ email: "admin@exemple.fr" });
  const atelier = { ...ATELIER_BUSINESS, creneaux: { matin: { places: 8 }, apres_midi: {}, journee: {} } };
  const ligne = (n: number, prenom: string, creneau: string, statut = "confirme") => ({
    id: `dddddddd-0000-4000-8000-00000000000${n}`, atelier_id: atelier.id, utilisateur_id: null,
    prenom_invite: prenom, nom_invite: "Test", email_invite: `${prenom.toLowerCase()}@exemple.fr`, telephone_invite: "0601020304",
    date_naissance: null, statut, statut_paiement: "non_requis", inscrit_le: new Date().toISOString(), creneau,
    ateliers: atelier, utilisateurs: null,
  });
  await mockSupabase(page, {
    profil: admin,
    ateliers: [atelier],
    inscriptions: [ligne(1, "Sophie", "journee"), ligne(2, "Manon", "matin"), ligne(3, "Emilie", "apres_midi", "en_attente")],
  });
  await connecterEn(page, admin);
  await page.goto("/admin/pre-inscriptions");
  await page.getByRole("button", { name: /^Toutes/ }).click();

  const bloc = page.locator("section").filter({ hasText: atelier.titre }).first();
  // Validées : Sophie (journée) + Manon (matin) = 2 le matin ; Sophie seule l'après-midi (Emilie est en attente).
  await expect(bloc.getByText("Matinée : 2 / 8")).toBeVisible();
  await expect(bloc.getByText("Après-midi : 1", { exact: true })).toBeVisible();
  await expect(bloc.getByText("dont journée entière : 1")).toBeVisible();
  const sophie = bloc.locator("li").filter({ hasText: "Sophie Test" });
  await expect(sophie.getByText("Journée entière", { exact: true })).toBeVisible();
});
