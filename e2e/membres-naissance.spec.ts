import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const ADMIN = profilTest();
const ADHESION = {
  id: "d0000000-0000-4000-8000-000000000001", utilisateur_id: ADMIN.id, date_naissance: "1988-04-12", cree_le: "2026-10-21T10:00:00Z",
};

test("Membres : la date de naissance de l'adhésion s'affiche et se corrige depuis la fiche", async ({ page }, testInfo) => {
  const mock = await mockSupabase(page, { profil: ADMIN, adhesions: [ADHESION] });
  await connecterEn(page, ADMIN);
  await page.goto("/admin/membres");
  // La colonne est masquée sur petit écran (comme « Consentement ») : la date reste visible dans la fiche.
  if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("columnheader", { name: "Naissance" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "12/04/1988" })).toBeVisible();
  }

  await page.getByRole("row", { name: /Christelle/ }).getByTitle("Modifier").click();
  const fiche = page.getByLabel("Date de naissance");
  await expect(fiche).toHaveValue("12/04/1988");
  await fiche.fill("");
  await fiche.pressSequentially("13051989");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect.poll(() => mock.updates.adhesions?.[0]).toEqual({ date_naissance: "1989-05-13" });
});

test("Membres : sans adhésion, le champ est grisé et renvoie vers l'adhésion", async ({ page }) => {
  await mockSupabase(page, { profil: ADMIN, adhesions: [] });
  await connecterEn(page, ADMIN);
  await page.goto("/admin/membres");
  await page.getByRole("row", { name: /Christelle/ }).getByTitle("Modifier").click();
  await expect(page.getByLabel("Date de naissance")).toBeDisabled();
  await expect(page.getByText("Pas encore d'adhésion")).toBeVisible();
});
