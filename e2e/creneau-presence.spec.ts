import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";
import { remplirPreInscription, TITRE_MERCI } from "./formulaire";

const BUSINESS = { ...ATELIER_TEST, titre: "Journée Création Instagram", espaces: { slug: "business" } };
const remplir = (page: import("@playwright/test").Page) =>
  remplirPreInscription(page, { prenom: "Léa", nom: "Martin", email: "lea@exemple.fr", tel: "06 11 22 33 44", image: "oui", whatsapp: "oui" });
const envoyer = (page: import("@playwright/test").Page) => page.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();

test("atelier Business : la question journée / matin / après-midi est obligatoire et enregistrée", async ({ page }) => {
  const mock = await mockSupabase(page, { ateliers: [BUSINESS] });
  await page.goto(`/inscription/${BUSINESS.id}`);
  await expect(page.getByRole("group", { name: "Je serai présente" })).toBeVisible();
  await remplir(page);
  await envoyer(page);
  await expect(page.getByText("Merci de choisir une réponse.")).toBeVisible();
  expect(mock.inserts.inscriptions).toBeUndefined();

  await page.getByRole("checkbox", { name: "Le matin", exact: true }).check();
  await page.getByRole("checkbox", { name: "L'après-midi", exact: true }).check(); // une seule réponse possible
  await expect(page.getByRole("checkbox", { name: "Le matin", exact: true })).not.toBeChecked();
  await envoyer(page);
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  expect(mock.inserts.inscriptions).toEqual([expect.objectContaining({ atelier_id: BUSINESS.id, creneau: "apres_midi" })]);
});

test("atelier d'un autre espace : pas de question, rien d'envoyé pour le créneau", async ({ page }) => {
  const mock = await mockSupabase(page);
  await page.goto(`/inscription/${ATELIER_TEST.id}`);
  await expect(page.getByRole("group", { name: "Je serai présente" })).toHaveCount(0);
  await remplir(page);
  await envoyer(page);
  await expect(page.getByRole("heading", { name: TITRE_MERCI })).toBeVisible();
  expect(mock.inserts.inscriptions?.[0]).not.toHaveProperty("creneau");
});

test("Pré-inscriptions : la case « Présente » d'une inscription validée s'enregistre", async ({ page }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, {
    profil: admin,
    inscriptions: [{
      id: "dddddddd-0000-4000-8000-000000000001", atelier_id: ATELIER_TEST.id, utilisateur_id: null,
      prenom_invite: "Sophie", nom_invite: "Allain", email_invite: "sophie@x.fr", telephone_invite: null, date_naissance: null,
      statut: "confirme", statut_paiement: "non_requis", present: false, inscrit_le: "2026-11-01T10:00:00Z", ateliers: { ...ATELIER_TEST },
    }],
  });
  await connecterEn(page, admin);
  await page.goto(`/admin/pre-inscriptions?atelier=${ATELIER_TEST.id}`);
  const caseP = page.getByRole("checkbox", { name: "Sophie Allain présente" });
  await caseP.check();
  await expect.poll(() => mock.updates.inscriptions?.[0]).toEqual({ present: true });
  await expect(caseP).toBeChecked();
});
