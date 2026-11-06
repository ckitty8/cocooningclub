import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";
import { remplirPreInscription, TITRE_MERCI } from "./formulaire";

const remplir = (page: import("@playwright/test").Page) =>
  remplirPreInscription(page, { prenom: "Léa", nom: "Martin", email: "lea@exemple.fr", tel: "06 11 22 33 44", image: "oui", whatsapp: "oui" });
const envoyer = (page: import("@playwright/test").Page) => page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

test("pré-inscription : le compte Instagram (facultatif) est vérifié et enregistré « @compte »", async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await remplir(page);
  const champ = page.getByRole("textbox", { name: "Instagram (facultatif)" });
  await expect(champ).toHaveAttribute("placeholder", "@moncompte");
  await champ.fill("mon compte");
  await envoyer(page);
  await expect(page.getByText("Identifiant Instagram invalide (exemple : @moncompte).")).toBeVisible();
  expect(mock.inserts.inscriptions).toBeUndefined();

  await champ.fill("https://www.instagram.com/Lea.Martin/");
  await envoyer(page);
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  expect(mock.inserts.inscriptions).toEqual([expect.objectContaining({ instagram: "@lea.martin" })]);
});

test("pré-inscription sans Instagram : rien n'est envoyé pour la colonne", async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await remplir(page);
  await envoyer(page);
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  expect(mock.inserts.inscriptions?.[0]).not.toHaveProperty("instagram");
});

test("Pré-inscriptions : le compte Instagram est affiché avec le lien du profil", async ({ page }) => {
  const admin = profilTest();
  await mockSupabase(page, {
    profil: admin,
    inscriptions: [{
      id: "dddddddd-0000-4000-8000-000000000002", atelier_id: ATELIER_TEST.id, utilisateur_id: null,
      prenom_invite: "Sophie", nom_invite: "Allain", email_invite: "sophie@x.fr", telephone_invite: null, date_naissance: null, instagram: "@sophie.allain",
      statut: "en_attente", statut_paiement: "non_requis", present: false, inscrit_le: "2026-11-01T10:00:00Z", ateliers: { ...ATELIER_TEST },
    }],
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await connecterEn(page, admin);
  await page.goto(`/admin/pre-inscriptions?atelier=${ATELIER_TEST.id}`);
  await expect(page.getByText("Instagram : @sophie.allain")).toBeVisible();
  await page.getByText("Sophie Allain").first().click();
  await expect(page.getByRole("link", { name: "@sophie.allain" })).toHaveAttribute("href", "https://www.instagram.com/sophie.allain/");
});

test("bloc « Paiement » : affiché pour un atelier payant, masqué pour un atelier sans prix", async ({ page }) => {
  await mockSupabase(page);
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await expect(page.getByRole("region", { name: "Paiement" })).toBeVisible();

  const gratuit = { ...ATELIER_TEST, tarif_standard: 0, tarif_affichage: null };
  await mockSupabase(page, { ateliers: [gratuit] });
  await page.goto(`/inscription/${gratuit.id}`);
  await expect(page.getByRole("textbox", { name: "Instagram (facultatif)" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Paiement" })).toHaveCount(0);
});
