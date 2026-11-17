import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

test("Envies d'ateliers : page cachée accessible par le pied de page, sans connexion, réponse enregistrée", async ({ page }) => {
  const mock = await mockSupabase(page, { plafondMateriel: 50 });
  await page.goto("/");
  await page.getByRole("link", { name: "Une envie d'atelier ?" }).click();
  await expect(page).toHaveURL(/\/envies-ateliers$/);
  await expect(page.getByRole("heading", { name: "Tes envies d'ateliers" })).toBeVisible();
  // Page cachée : jamais indexée.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  // Ni Business ni connexion : seulement Papotages, Créatif, Je ne sais pas.
  await expect(page.getByRole("radio", { name: /Business/ })).toHaveCount(0);
  await expect(page.getByText("Pour les ateliers Créatifs et Papotages, le matériel peut être fourni par l'association, dans la limite de 50 € par atelier.")).toBeVisible();

  // Envoi incomplet : erreurs.
  await page.getByRole("button", { name: "Envoyer mon envie" }).click();
  await expect(page.getByText("Ton prénom est obligatoire")).toBeVisible();
  await expect(page.getByText("Choisis un espace")).toBeVisible();
  expect(mock.inserts.envies_ateliers).toBeUndefined();

  await page.getByLabel("Prénom (obligatoire)").fill("Lucie");
  await page.getByLabel("E-mail ou téléphone (facultatif)").fill("lucie@exemple.fr");

  await page.getByRole("radio", { name: /^Créatif/ }).check();
  // Plusieurs idées, saisies librement.
  await page.getByLabel("Idée 1", { exact: true }).fill("Couronnes de Noël");
  await page.getByRole("button", { name: "Ajouter une idée" }).click();
  await page.getByLabel("Idée 2", { exact: true }).fill("Bougies parfumées");
  await page.getByRole("button", { name: "Ajouter une idée" }).click();
  await page.getByLabel("Idée 3", { exact: true }).fill("Calendrier de l'avent");
  await page.getByRole("button", { name: "Retirer l'idée 3" }).click();
  await expect(page.getByLabel("Idée 3", { exact: true })).toHaveCount(0);
  await page.getByLabel("Raconte-nous (facultatif)").fill("Pour les fêtes");
  await page.getByRole("radio", { name: "L'animer moi-même, bénévolement" }).check();
  await page.getByLabel("Matériel nécessaire").fill("osier, rubans");
  await page.getByLabel("Budget estimé").fill("25 €");

  // Plusieurs jours et plusieurs plages horaires.
  await page.getByRole("checkbox", { name: "Samedi" }).check();
  await page.getByRole("checkbox", { name: "Mercredi" }).check();
  await page.getByLabel("Plage horaire 1").fill("14 h – 17 h 30");
  await page.getByRole("button", { name: "Ajouter une plage horaire" }).click();
  await page.getByLabel("Plage horaire 2").fill("après 19 h");
  await page.getByRole("checkbox", { name: /J'accepte que l'équipe/ }).check();
  await page.getByRole("button", { name: "Envoyer mes 2 idées" }).click();

  await expect(page.getByText("Merci pour tes idées 💛")).toBeVisible();
  // Les deux idées partent en un seul envoi, reliées par le même groupe.
  const lignes = mock.inserts.envies_ateliers?.[0] as Record<string, unknown>[];
  expect(lignes).toHaveLength(2);
  const commun = {
    prenom: "Lucie", contact: "lucie@exemple.fr", espace: "creatifs", souhait: "animer", details: "Pour les fêtes",
    materiel: "osier, rubans", budget: "25 €", jours: ["mercredi", "samedi"], plages: ["14 h – 17 h 30", "après 19 h"],
  };
  expect(lignes[0]).toMatchObject({ ...commun, idee: "Couronnes de Noël" });
  expect(lignes[1]).toMatchObject({ ...commun, idee: "Bougies parfumées" });
  expect(lignes[0].groupe_id).toBeTruthy();
  expect(lignes[1].groupe_id).toBe(lignes[0].groupe_id);
});

test("Envies d'ateliers : l'administration liste, filtre, change le statut, règle le plafond et prépare l'atelier", async ({ page }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, {
    profil: admin,
    plafondMateriel: 50,
    espaces: [{ id: "e-creatifs", nom: "Créatifs", slug: "creatifs" }, { id: "e-papotages", nom: "Papotages", slug: "papotages" }],
    envies: [
      { id: "11111111-0000-4000-8000-000000000001", cree_le: "2026-11-14T10:00:00Z", statut: "nouvelle", prenom: "Lucie", nom: "D.",
        contact: "lucie@exemple.fr", espace: "creatifs", idee: "Couronnes de Noël", details: "Avec du sapin", souhait: "animer",
        materiel: "osier", budget: "25 €", jours: ["samedi"], plages: ["14 h – 17 h"], groupe_id: "g1" },
      { id: "11111111-0000-4000-8000-000000000002", cree_le: "2026-11-13T10:00:00Z", statut: "a_etudier", prenom: "Sophie", nom: null,
        contact: "06 00 00 00 00", espace: "papotages", idee: "Jeux de société", details: null, souhait: "participer",
        materiel: null, budget: null, jours: [], plages: [], groupe_id: "g2" },
    ],
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await connecterEn(page, admin);
  await page.goto("/admin/envies-ateliers");
  await expect(page.getByRole("heading", { name: "Envies d'ateliers" })).toBeVisible();
  await expect(page.getByText("https://www.lecocooningclub.fr/envies-ateliers")).toBeVisible();

  await page.getByRole("button", { name: "À étudier (1)" }).click();
  await expect(page.getByRole("heading", { name: "Jeux de société" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Couronnes de Noël" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "WhatsApp" }).last()).toHaveAttribute("href", /wa\.me\/33600000000/);
  await page.getByRole("button", { name: "Toutes (2)" }).click();
  await expect(page.getByText("14 h – 17 h", { exact: true })).toBeVisible();

  await page.getByLabel("Statut de l'envie « Couronnes de Noël »").selectOption("retenue");
  await expect.poll(() => mock.updates.envies_ateliers?.[0]).toEqual({ statut: "retenue" });

  await page.getByLabel("Matériel pris en charge jusqu'à").fill("60");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect.poll(() => mock.updates.parametres_envies?.[0]).toMatchObject({ plafond_materiel: 60 });

  await page.getByRole("link", { name: "Créer l'atelier" }).first().click();
  await expect(page).toHaveURL(/\/admin\/ateliers$/);
  const fenetre = page.locator("div.fixed").filter({ hasText: "Titre (obligatoire)" });
  await expect(fenetre.locator("label", { hasText: "Titre (obligatoire)" }).locator("xpath=following-sibling::input")).toHaveValue("Couronnes de Noël");
});
