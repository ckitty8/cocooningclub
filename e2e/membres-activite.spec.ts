import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

test("Membres : l'activité principale et le hobby s'affichent, se cherchent et se corrigent", async ({ page }) => {
  const admin = profilTest({ activite: "Illustratrice", hobby: "Randonnée" });
  const mock = await mockSupabase(page, { profil: admin });
  await connecterEn(page, admin);
  await page.goto("/admin/membres");

  const ligne = page.getByRole("row", { name: /Christelle/ });
  await expect(ligne.getByText("Activité : Illustratrice")).toBeVisible();
  await expect(ligne.getByText("Hobby : Randonnée")).toBeVisible();

  await page.getByPlaceholder("Rechercher...").fill("randon");
  await expect(ligne).toBeVisible();
  await page.getByPlaceholder("Rechercher...").fill("");

  await ligne.getByTitle("Modifier").click();
  await expect(page.getByLabel("Activité principale")).toHaveValue("Illustratrice");
  await page.getByLabel("Hobby").fill("Peinture");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect.poll(() => mock.updates.utilisateurs?.[0]).toMatchObject({ hobby: "Peinture" });
  expect(mock.updates.utilisateurs?.[0]).not.toHaveProperty("activite");
});
