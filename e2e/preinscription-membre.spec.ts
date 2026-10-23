import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const MEMBRE = profilTest({
  id: "cccccccc-0000-4000-8000-000000000001",
  prenom: "Marie",
  nom: "Dupont",
  email: "marie@exemple.fr",
  telephone: "0601020304",
  date_naissance: "1990-05-12",
  role: "membre",
});

test("un membre se pré-inscrit depuis son espace avec les informations de son compte", async ({ page }) => {
  const mock = await mockSupabase(page, { profil: MEMBRE });
  await connecterEn(page, MEMBRE);
  await page.goto("/espace-membre/ateliers");

  // Même libellé que sur l'accueil : « Pré-inscription », jamais « S'inscrire ».
  await expect(page.getByText("S'inscrire")).toHaveCount(0);
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();
  await page.getByRole("dialog").or(page.locator("div.fixed")).getByRole("button", { name: "Pré-inscription" }).click();

  // Fenêtre commune avec l'accueil, identité du compte déjà remplie et non modifiable.
  const fenetre = page.getByRole("dialog", { name: "Pré-inscription" });
  await expect(fenetre.getByPlaceholder("Marie Dupont")).toHaveValue("Marie Dupont");
  await expect(fenetre.getByPlaceholder("Marie Dupont")).toHaveAttribute("readonly", "");
  await expect(fenetre.getByPlaceholder("marie@email.com")).toHaveValue("marie@exemple.fr");
  await fenetre.getByRole("checkbox").check();
  await fenetre.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();
  await expect(page.getByRole("heading", { name: "Pré-inscription enregistrée !" })).toBeVisible();

  // Rattachée au compte : aucun champ « invité » n'est envoyé.
  expect(mock.inserts.inscriptions).toEqual([{
    atelier_id: ATELIER_TEST.id,
    utilisateur_id: MEMBRE.id,
    telephone_invite: null,
    date_naissance: null,
  }]);
});

test("l'administration voit l'identité du membre pré-inscrit", async ({ page }) => {
  const admin = profilTest({ email: "admin@exemple.fr" });
  await mockSupabase(page, {
    profil: admin,
    inscriptions: [{
      id: "dddddddd-0000-4000-8000-000000000001",
      atelier_id: ATELIER_TEST.id,
      utilisateur_id: MEMBRE.id,
      prenom_invite: null,
      nom_invite: null,
      email_invite: null,
      telephone_invite: null,
      date_naissance: null,
      statut: "en_attente",
      statut_paiement: "en_attente",
      inscrit_le: new Date().toISOString(),
      ateliers: { id: ATELIER_TEST.id, titre: ATELIER_TEST.titre, date_atelier: ATELIER_TEST.date_atelier, heure_debut: "14:00:00", lieu: "Gagny", adresse: null },
      utilisateurs: { prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr", telephone: "0601020304", date_naissance: "1990-05-12", role: "membre" },
    }],
  });
  await connecterEn(page, admin);
  await page.goto("/admin/pre-inscriptions");

  await expect(page.getByRole("heading", { name: "Marie Dupont" })).toBeVisible();
  await expect(page.getByText("marie@exemple.fr")).toBeVisible();
  await expect(page.getByText("0601020304")).toBeVisible();
  await expect(page.getByText(/Date de naissance : 12 mai 1990/)).toBeVisible();
  await expect(page.getByText(ATELIER_TEST.titre).first()).toBeVisible();
});
