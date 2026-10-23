import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const MEMBRE = profilTest({
  id: "cccccccc-0000-4000-8000-000000000001", prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr",
  telephone: "0601020304", role: "membre", commune: "Gagny", activite: "Graphiste",
});
const ESPACES = [
  { id: "a0000000-0000-4000-8000-000000000001", nom: "Créatifs" },
  { id: "a0000000-0000-4000-8000-000000000002", nom: "Business" },
];
const dansJours = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const ADHESION = {
  id: "d0000000-0000-4000-8000-000000000002", numero: 42, utilisateur_id: MEMBRE.id, statut: "active",
  mode_reglement: "en_ligne", montant: 150, cotisation_recue_le: dansJours(-10), date_validation: dansJours(-10),
  valable_jusqu_au: dansJours(355), engagement_accepte_le: dansJours(-12), whatsapp: true, autorisation_image: true,
  image_supports: ["site", "reseaux"], image_signee_le: dansJours(-12), cree_le: "2026-10-12T10:00:00Z",
  formules: {
    nom: "Cocooning Complet", description: "Les deux univers.", couleur: "terracotta", prix: 150, duree_mois: 12,
    formule_espaces: ESPACES.map(e => ({ antenne_id: e.id })),
  },
};

test("une membre retrouve son récapitulatif et son bulletin d'adhésion", async ({ page }) => {
  await mockSupabase(page, { profil: MEMBRE, adhesions: [ADHESION], antennes: ESPACES });
  await connecterEn(page, MEMBRE);
  await page.goto("/espace-membre/mon-adhesion");

  // Récapitulatif : formule, dates, coordonnées, engagements.
  await expect(page.getByRole("heading", { name: "Mon adhésion" })).toBeVisible();
  await expect(page.getByText("Cocooning Complet").first()).toBeVisible();
  await expect(page.getByText("0042")).toBeVisible();
  await expect(page.getByText("Créatifs, Business")).toBeVisible();
  await expect(page.getByText("Gagny")).toBeVisible();
  await expect(page.getByText("Graphiste")).toBeVisible();
  await expect(page.getByText("Consentement photo et vidéo")).toBeVisible();
  await expect(page.getByText("Oui", { exact: true })).toHaveCount(2); // WhatsApp et consentement photo
  await expect(page.getByText("Site internet, Réseaux sociaux")).toBeVisible();

  // Bulletin : le document rempli, imprimable.
  await page.getByRole("tab", { name: "Mon bulletin" }).click();
  await expect(page.getByRole("heading", { name: "Bulletin d'adhésion" })).toBeVisible();
  await expect(page.getByText("☑ Cocooning Complet")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Autorisation photo/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Imprimer/ })).toBeVisible();
});

test("une membre sans bulletin enregistré en est informée", async ({ page }) => {
  await mockSupabase(page, { profil: MEMBRE, adhesions: [], antennes: ESPACES });
  await connecterEn(page, MEMBRE);
  await page.goto("/espace-membre/mon-adhesion");
  await expect(page.getByText("Aucun bulletin d'adhésion enregistré")).toBeVisible();
});

test("l'admin voit le consentement photo dans la liste des membres", async ({ page }) => {
  const admin = profilTest();
  await mockSupabase(page, {
    profil: admin,
    autorisationsImage: [{
      utilisateur_id: admin.id, autorisation_image: false, image_supports: [], image_signee_le: dansJours(-5),
      image_valable_jusqu_au: null, image_valide: false,
    }],
  });
  await connecterEn(page, admin);
  await page.goto("/admin/membres");
  // Colonne « Consentement » sur grand écran ; sous le nom sur téléphone.
  if (test.info().project.name === "desktop") await expect(page.getByRole("columnheader", { name: "Consentement" })).toBeVisible();
  await expect(page.getByText(/^(Consentement : )?Non$/).locator("visible=true")).toBeVisible();
});

test("l'admin voit le consentement photo d'une personne pré-inscrite", async ({ page }) => {
  const admin = profilTest({ email: "admin@exemple.fr" });
  await mockSupabase(page, {
    profil: admin,
    autorisationsImage: [{
      utilisateur_id: MEMBRE.id, autorisation_image: true, image_supports: ["site"], image_signee_le: dansJours(-12),
      image_valable_jusqu_au: dansJours(1000), image_valide: true,
    }],
    inscriptions: [{
      id: "dddddddd-0000-4000-8000-000000000001", atelier_id: ATELIER_TEST.id, utilisateur_id: MEMBRE.id,
      prenom_invite: null, nom_invite: null, email_invite: null, telephone_invite: null, date_naissance: null,
      statut: "en_attente", statut_paiement: "en_attente", inscrit_le: new Date().toISOString(),
      ateliers: { id: ATELIER_TEST.id, titre: ATELIER_TEST.titre, date_atelier: ATELIER_TEST.date_atelier, heure_debut: "14:00:00", lieu: "Gagny", adresse: null },
      utilisateurs: { prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr", telephone: "0601020304", date_naissance: "1990-05-12", role: "membre" },
    }],
  });
  await connecterEn(page, admin);
  await page.goto("/admin/pre-inscriptions");
  await page.getByRole("button", { name: "Ouvrir la pré-inscription de Marie Dupont" }).click();
  const fenetre = page.getByRole("dialog", { name: "Pré-inscription de Marie Dupont" });
  await expect(fenetre.getByText("Consentement : Oui")).toBeVisible();
});
