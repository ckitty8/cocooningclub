import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const ADMIN = profilTest();

test("un document peut être réservé aux administrateurs (ex. bulletin d'adhésion vierge)", async ({ page }) => {
  const mock = await mockSupabase(page, { profil: ADMIN });
  await connecterEn(page, ADMIN);
  await page.goto("/admin/documents");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();

  const fenetre = page.locator("div.fixed").filter({ hasText: "Ajouter un document" });
  await fenetre.locator("label", { hasText: "Titre" }).locator("xpath=following-sibling::input").fill("Bulletin d'adhésion vierge");
  await fenetre.locator("select").nth(0).selectOption("lien_externe");
  await fenetre.locator("select").nth(1).selectOption("admins");
  await expect(fenetre.getByText("uniquement par les administrateurs")).toBeVisible();
  await fenetre.getByPlaceholder("https://drive.google.com/...").fill("https://exemple.fr/bulletin.pdf");
  await fenetre.getByRole("button", { name: "Enregistrer" }).click();

  await expect.poll(() => mock.inserts.documents?.[0]).toMatchObject({
    titre: "Bulletin d'adhésion vierge", type: "lien_externe", acces: "admins", lien_externe: "https://exemple.fr/bulletin.pdf",
  });
});

test("le menu « Type » propose documents internes, documents administratifs et autres", async ({ page }) => {
  const mock = await mockSupabase(page, { profil: ADMIN });
  await connecterEn(page, ADMIN);
  await page.goto("/admin/documents");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();

  const fenetre = page.locator("div.fixed").filter({ hasText: "Ajouter un document" });
  await expect(fenetre.locator("select").nth(0).locator("option")).toHaveText([
    "Magazine", "Guide", "Lien externe", "Documents internes", "Documents administratifs", "Autres",
  ]);
  await fenetre.locator("label", { hasText: "Titre" }).locator("xpath=following-sibling::input").fill("Statuts de l'association");
  await fenetre.locator("select").nth(0).selectOption("administratif");
  await fenetre.locator("select").nth(1).selectOption("admins");
  await fenetre.getByRole("button", { name: "Enregistrer" }).click();

  await expect.poll(() => mock.inserts.documents?.[0]).toMatchObject({
    titre: "Statuts de l'association", type: "administratif", acces: "admins",
  });
});
