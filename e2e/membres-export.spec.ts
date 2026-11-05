import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const INVITEE = {
  id: "dddddddd-0000-4000-8000-000000000001", atelier_id: ATELIER_TEST.id, utilisateur_id: null,
  prenom_invite: "Sophie", nom_invite: "Allain", email_invite: "sophie.allain@free.fr", telephone_invite: "0601020304",
  statut: "confirme", statut_paiement: "en_attente", inscrit_le: "2026-11-03T10:00:00Z",
  ateliers: { titre: "Journée Création Instagram", date_atelier: "2026-11-05" },
};

test("Membres : « Exporter en Excel » télécharge un vrai fichier .xlsx", async ({ page }) => {
  const admin = profilTest();
  await mockSupabase(page, { profil: admin, inscriptions: [INVITEE] });
  await connecterEn(page, admin);
  await page.goto("/admin/membres");
  await expect(page.getByText("Sophie").first()).toBeHidden(); // liste des comptes par défaut
  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exporter en Excel" }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(/^membres-cocooning-club-\d{4}-\d{2}-\d{2}\.xlsx$/);
  const contenu = readFileSync(await telechargement.path());
  expect(contenu.subarray(0, 2).toString()).toBe("PK"); // un .xlsx est une archive zip
  await expect(page.getByText(/est téléchargé/)).toBeVisible();
});

test("Membres : « Envoyer vers Google Drive » télécharge le fichier et ouvre Google Drive", async ({ page, context }) => {
  await context.route("https://drive.google.com/**", route => route.fulfill({ status: 200, body: "Drive" }));
  const admin = profilTest();
  await mockSupabase(page, { profil: admin, inscriptions: [INVITEE] });
  await connecterEn(page, admin);
  await page.goto("/admin/membres");
  const [telechargement, fenetre] = await Promise.all([
    page.waitForEvent("download"),
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "Envoyer vers Google Drive" }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(/\.xlsx$/);
  expect(fenetre.url()).toContain("drive.google.com");
  await expect(page.getByText(/glisse-le dans l'onglet Google Drive/)).toBeVisible();
});

test("Pré-inscriptions : chaque atelier s'exporte en Excel avec les réponses du formulaire", async ({ page }) => {
  const admin = profilTest();
  await mockSupabase(page, {
    profil: admin,
    inscriptions: [{ ...INVITEE, autorisation_image: false, accord_whatsapp: true, date_naissance: null, ateliers: { ...ATELIER_TEST } }],
  });
  await connecterEn(page, admin);
  await page.goto(`/admin/pre-inscriptions?atelier=${ATELIER_TEST.id}`);
  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exporter en Excel (1)" }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(/^inscrites-atelier-papotages-cafe-des-copines-.*\.xlsx$/);
  const contenu = readFileSync(await telechargement.path());
  expect(contenu.subarray(0, 2).toString()).toBe("PK");
});

test("Pré-inscriptions : les deux boutons coexistent et la feuille d'émargement est en paysage avec une colonne Signature", async ({ page }) => {
  const admin = profilTest();
  await mockSupabase(page, {
    profil: admin,
    inscriptions: [
      { ...INVITEE, autorisation_image: false, accord_whatsapp: true, date_naissance: null, ateliers: { ...ATELIER_TEST } },
      { ...INVITEE, id: "dddddddd-0000-4000-8000-000000000002", prenom_invite: "Inès", nom_invite: "Zed", email_invite: "ines@x.fr", statut: "en_attente", ateliers: { ...ATELIER_TEST } },
    ],
  });
  await connecterEn(page, admin);
  await page.goto(`/admin/pre-inscriptions?atelier=${ATELIER_TEST.id}`);
  await expect(page.getByRole("button", { name: "Exporter en Excel (2)" })).toBeVisible();
  const [telechargement] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Feuille d'émargement (1)" }).click(),
  ]);
  expect(telechargement.suggestedFilename()).toMatch(/^emargement-atelier-papotages-cafe-des-copines-.*\.xlsx$/);
  const chemin = await telechargement.path();
  const feuille = execSync(`unzip -p "${chemin}" xl/worksheets/sheet1.xml`).toString();
  const textes = execSync(`unzip -p "${chemin}" xl/sharedStrings.xml`).toString();
  expect(feuille).toContain('orientation="landscape"');
  expect(textes).toContain("Feuille d'émargement");
  expect(textes).toContain("Signature");
  expect(textes).toContain("ALLAIN");
  expect(textes).toContain("E-mail");
  expect(textes).toContain("sophie.allain@free.fr");
  expect(textes).not.toContain("ZED"); // en attente : pas sur la feuille d'émargement
});
