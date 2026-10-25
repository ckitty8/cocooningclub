import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const INSCRITE = profilTest({
  id: "dddddddd-0000-4000-8000-000000000001",
  prenom: "Julie",
  nom: "Martin",
  email: "julie@exemple.fr",
  role: "inscrit",
});

test("un simple inscrit n'accède pas à l'espace membre", async ({ page }) => {
  await mockSupabase(page, { profil: INSCRITE });
  await connecterEn(page, INSCRITE);
  await page.goto("/espace-membre");
  await expect(page).toHaveURL(/\/$/);
});

test("un simple inscrit se pré-inscrit à un atelier depuis le site public, rattaché à son compte", async ({ page }) => {
  const mock = await mockSupabase(page, { profil: INSCRITE });
  await connecterEn(page, INSCRITE);
  await page.goto("/");
  await page.getByRole("button", { name: "Pré-inscription" }).first().click();
  const fenetre = page.getByRole("dialog", { name: "Pré-inscription" });
  await expect(fenetre.getByPlaceholder("Marie Dupont")).toHaveValue("Julie Martin");
  await fenetre.getByRole("checkbox").check();
  await fenetre.getByRole("button", { name: /Envoyer ma pré-inscription/ }).click();
  await expect(page.getByRole("heading", { name: "Pré-inscription enregistrée !" })).toBeVisible();
  expect(mock.inserts.inscriptions?.[0]).toMatchObject({ atelier_id: ATELIER_TEST.id, utilisateur_id: INSCRITE.id });
});
