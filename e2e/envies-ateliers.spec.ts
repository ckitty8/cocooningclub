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
  await page.getByLabel("Ton idée d'atelier en quelques mots (obligatoire)").fill("Couronnes de Noël");
  await page.getByRole("radio", { name: "L'animer moi-même, bénévolement" }).check();
  await page.getByLabel("Matériel nécessaire").fill("osier, rubans");
  await page.getByLabel("Budget estimé").fill("25 €");
  await page.getByRole("checkbox", { name: "Le week-end" }).check();
  await page.getByRole("checkbox", { name: /J'accepte que l'équipe/ }).check();
  await page.getByRole("button", { name: "Envoyer mon envie" }).click();

  await expect(page.getByText("Merci pour ton idée 💛")).toBeVisible();
  expect(mock.inserts.envies_ateliers?.[0]).toMatchObject({
    prenom: "Lucie", contact: "lucie@exemple.fr", espace: "creatifs", idee: "Couronnes de Noël",
    souhait: "animer", materiel: "osier, rubans", budget: "25 €", moments: ["week_end"],
  });
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
        materiel: "osier", budget: "25 €", moments: ["week_end"] },
      { id: "11111111-0000-4000-8000-000000000002", cree_le: "2026-11-13T10:00:00Z", statut: "a_etudier", prenom: "Sophie", nom: null,
        contact: "06 00 00 00 00", espace: "papotages", idee: "Jeux de société", details: null, souhait: "participer",
        materiel: null, budget: null, moments: [] },
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
