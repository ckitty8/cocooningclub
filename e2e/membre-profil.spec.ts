import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const MEMBRE = profilTest({
  id: "cccccccc-0000-4000-8000-000000000001", prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr",
  telephone: "0601020304", role: "membre", activite: "Graphiste",
});

test("« Mon compte » : la membre renseigne son activité principale et son hobby", async ({ page }) => {
  const mock = await mockSupabase(page, { profil: MEMBRE });
  await connecterEn(page, MEMBRE);
  await page.goto("/espace-membre/mon-compte");

  await expect(page.getByLabel("Activité principale")).toHaveValue("Graphiste");
  await expect(page.getByLabel("Hobby")).toHaveValue("");
  await page.getByLabel("Activité principale").fill("Illustratrice");
  await page.getByLabel("Hobby").fill("Peinture et randonnée");
  await page.getByRole("button", { name: /Enregistrer/ }).first().click();

  await expect.poll(() => mock.updates.utilisateurs?.[0]).toMatchObject({ activite: "Illustratrice", hobby: "Peinture et randonnée" });
});

test("« Mon compte » : le hobby n'est envoyé que s'il a changé", async ({ page }) => {
  const mock = await mockSupabase(page, { profil: MEMBRE });
  await connecterEn(page, MEMBRE);
  await page.goto("/espace-membre/mon-compte");
  await page.locator('input[type="tel"]').fill("0611223344");
  await page.getByRole("button", { name: /Enregistrer/ }).first().click();
  await expect.poll(() => mock.updates.utilisateurs?.[0]).toMatchObject({ telephone: "0611223344", activite: "Graphiste" });
  expect(mock.updates.utilisateurs?.[0]).not.toHaveProperty("hobby");
});
