import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const ADMIN = profilTest();
const INSCRITE = {
  id: "dddddddd-0000-4000-8000-000000000001", atelier_id: ATELIER_TEST.id, utilisateur_id: "cccccccc-0000-4000-8000-000000000001",
  prenom_invite: null, nom_invite: null, email_invite: null, telephone_invite: null, date_naissance: null,
  statut: "confirme", statut_paiement: "en_attente", present: false, inscrit_le: new Date().toISOString(),
  utilisateurs: { prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr", telephone: "0601020304", role: "membre" },
};

test("« Inscrits » mène aux pré-inscriptions de l'atelier, et le titre à sa fiche", async ({ page }) => {
  await mockSupabase(page, { profil: ADMIN });
  await connecterEn(page, ADMIN);
  await page.goto("/admin/ateliers");
  await expect(page.getByRole("link", { name: /^Inscrits \(/ })).toHaveAttribute("href", `/admin/pre-inscriptions?atelier=${ATELIER_TEST.id}`);
  await expect(page.getByRole("link", { name: ATELIER_TEST.titre })).toHaveAttribute("href", `/admin/ateliers/${ATELIER_TEST.id}`);
  // Chiffres clés
  await expect(page.getByText("ateliers à venir")).toBeVisible();
  await expect(page.getByText("pré-inscriptions à traiter")).toBeVisible();
});

test("la vue calendrier place l'atelier à sa date", async ({ page }) => {
  await mockSupabase(page, { profil: ADMIN });
  await connecterEn(page, ADMIN);
  await page.goto("/admin/ateliers");
  await page.getByRole("group", { name: "Affichage des ateliers" }).getByRole("button", { name: "Calendrier" }).click();
  const date = new Date();
  date.setDate(date.getDate() + 14);
  if (date.getMonth() !== new Date().getMonth()) await page.getByRole("button", { name: "Mois suivant" }).click();
  await expect(page.getByRole("link", { name: new RegExp(ATELIER_TEST.titre) })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(ATELIER_TEST.titre) }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/ateliers/${ATELIER_TEST.id}$`));
});

test("la fiche d'un atelier : chiffres, paiement, présence et export", async ({ page }) => {
  const mock = await mockSupabase(page, { profil: ADMIN, inscriptions: [INSCRITE] });
  await connecterEn(page, ADMIN);
  await page.goto(`/admin/ateliers/${ATELIER_TEST.id}`);

  await expect(page.getByRole("heading", { name: ATELIER_TEST.titre })).toBeVisible();
  await expect(page.getByText("places prises")).toBeVisible();
  await expect(page.getByText("Marie Dupont").locator("visible=true")).toBeVisible();

  await page.getByRole("button", { name: "Non payé" }).click();
  await expect.poll(() => mock.updates.inscriptions?.[0]).toMatchObject({ statut_paiement: "paye" });
  await page.getByRole("button", { name: "Absente" }).click();
  await expect.poll(() => mock.updates.inscriptions?.[1]).toMatchObject({ present: true });

  const [telechargement] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  expect(telechargement.suggestedFilename()).toBe("inscrites-atelier.csv");

  await expect(page.getByRole("main").getByRole("link", { name: "Pré-inscriptions" })).toHaveAttribute("href", `/admin/pre-inscriptions?atelier=${ATELIER_TEST.id}`);
  await expect(page.getByRole("main").getByRole("link", { name: "Modifier" })).toHaveAttribute("href", `/admin/ateliers?modifier=${ATELIER_TEST.id}`);
});

test("« Modifier » depuis la fiche ouvre le formulaire de l'atelier", async ({ page }) => {
  await mockSupabase(page, { profil: ADMIN });
  await connecterEn(page, ADMIN);
  await page.goto(`/admin/ateliers?modifier=${ATELIER_TEST.id}`);
  await expect(page.getByRole("heading", { name: "Modifier l'atelier" })).toBeVisible();
});
