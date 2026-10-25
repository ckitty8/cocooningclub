import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const ADMIN = profilTest();
const ESPACES = [
  { id: "a0000000-0000-4000-8000-000000000001", nom: "Créatifs", slug: "creatifs" },
  { id: "a0000000-0000-4000-8000-000000000002", nom: "Business", slug: "business" },
];
const FORMULES = [
  {
    id: "f0000000-0000-4000-8000-0000000000a1", nom: "Cocooning Créatif", description: "Ateliers créatifs.", couleur: "sauge",
    prix: 80, duree_mois: 12, lien_helloasso: null, modes_reglement: ["en_ligne", "virement", "especes"],
    est_active: true, ordre: 2, formule_espaces: [{ espace_id: ESPACES[0].id }],
  },
  {
    id: "f0000000-0000-4000-8000-0000000000a2", nom: "Cocooning Complet", description: "Les deux univers.", couleur: "terracotta",
    prix: 150, duree_mois: 12, lien_helloasso: null, modes_reglement: ["en_ligne"],
    est_active: true, ordre: 3, formule_espaces: ESPACES.map(e => ({ espace_id: e.id })),
  },
];
const dansJours = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const ADHESION_A_VALIDER = {
  id: "d0000000-0000-4000-8000-000000000001", numero: 43, utilisateur_id: "dddddddd-0000-4000-8000-000000000001",
  formule_id: FORMULES[0].id, statut: "en_attente", mode_reglement: "virement", montant: 80,
  cotisation_recue_le: null, date_validation: null, valable_jusqu_au: null, cree_le: "2026-10-21T10:00:00Z",
  utilisateurs: { prenom: "Julie", nom: "Martin", email: "julie@exemple.fr", telephone: "0611223344", role: "inscrit" },
  formules: { nom: "Cocooning Créatif", couleur: "sauge", duree_mois: 12 },
};
const ADHESION_ACTIVE = {
  ...ADHESION_A_VALIDER, id: "d0000000-0000-4000-8000-000000000002", numero: 42, statut: "active", mode_reglement: "en_ligne",
  montant: 150, formule_id: FORMULES[1].id, date_validation: dansJours(-10), valable_jusqu_au: dansJours(355),
  cotisation_recue_le: dansJours(-10),
  utilisateurs: { prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr", telephone: null, role: "membre" },
  formules: { nom: "Cocooning Complet", couleur: "terracotta", duree_mois: 12 },
};

const ouvrir = async (page: import("@playwright/test").Page, options = {}) => {
  const mock = await mockSupabase(page, {
    profil: ADMIN, formules: FORMULES, espaces: ESPACES, adhesions: [ADHESION_A_VALIDER, ADHESION_ACTIVE], ...options,
  });
  await connecterEn(page, ADMIN);
  await page.goto("/admin/offre");
  return mock;
};

test("l'administratrice voit ses formules, leur prix et les espaces inclus", async ({ page }) => {
  await ouvrir(page);
  await expect(page.getByRole("heading", { name: "Offre & adhésions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cocooning Créatif" })).toBeVisible();
  await expect(page.getByText("80 €")).toBeVisible();
  await expect(page.getByText("Business + Créatifs").or(page.getByText("Créatifs + Business"))).toBeVisible();
  await expect(page.getByText("1 adhérente en cours").first()).toBeVisible();
});

test("elle crée une formule", async ({ page }) => {
  const mock = await ouvrir(page);
  await page.getByRole("button", { name: "Nouvelle formule" }).click();
  const fenetre = page.getByRole("dialog", { name: "Nouvelle formule" });
  await fenetre.getByLabel("Nom *").fill("Cocooning Business");
  await fenetre.getByLabel("Cotisation (€) *").fill("100");
  await fenetre.getByLabel("Business").check();
  await fenetre.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Formule créée")).toBeVisible();
  expect(mock.inserts.formules?.[0]).toMatchObject({ nom: "Cocooning Business", prix: 100, duree_mois: 12 });
  expect(mock.inserts.formule_espaces?.[0]).toEqual([{ formule_id: "eeeeeeee-0000-4000-8000-000000000001", espace_id: ESPACES[1].id }]);
});

test("elle refuse une formule sans tarif valide", async ({ page }) => {
  const mock = await ouvrir(page);
  await page.getByRole("button", { name: "Nouvelle formule" }).click();
  const fenetre = page.getByRole("dialog", { name: "Nouvelle formule" });
  await fenetre.getByLabel("Nom *").fill("Test");
  await fenetre.getByLabel("Cotisation (€) *").fill("abc");
  await fenetre.getByRole("button", { name: "Enregistrer" }).click();
  await expect(fenetre.getByRole("alert")).toContainText("tarif");
  expect(mock.inserts.formules).toBeUndefined();
});

test("elle valide une adhésion : la date de fin est calculée et la validation part en base", async ({ page }) => {
  const mock = await ouvrir(page);
  await page.getByRole("tab", { name: /Adhésions/ }).click();
  await expect(page.getByText("Julie Martin").locator("visible=true")).toBeVisible();
  await expect(page.getByText("Marie Dupont").locator("visible=true")).toHaveCount(0); // filtre « À valider » par défaut
  await page.getByRole("button", { name: "✓ Valider" }).click();

  const fiche = page.getByRole("dialog", { name: "Fiche d'adhésion" });
  await fiche.getByLabel("Date de validation").fill("2026-10-23");
  await expect(fiche.getByText("23/10/2027")).toBeVisible();
  await fiche.getByLabel("Cotisation reçue le").fill("2026-10-22");
  await fiche.getByLabel("Mode de règlement").selectOption("especes");
  await fiche.getByRole("button", { name: "✓ Valider l'adhésion" }).click();

  await expect(page.getByText("Adhésion de Julie Martin validée")).toBeVisible();
  expect(mock.rpc.valider_adhesion?.[0]).toEqual({
    p_id: ADHESION_A_VALIDER.id, p_mode: "especes", p_recue_le: "2026-10-22", p_validation: "2026-10-23",
  });
});

test("l'écran explique qu'il faut appliquer la migration quand les tables n'existent pas encore", async ({ page }) => {
  await ouvrir(page, { offreAbsente: true });
  await expect(page.getByRole("alert")).toContainText("mise à jour de la base de données");
  await expect(page.getByRole("button", { name: "Nouvelle formule" })).toHaveCount(0);
});
