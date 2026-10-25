import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

test("l'administratrice bascule entre cartes et liste, et son choix est retenu", async ({ page }) => {
  const admin = profilTest();
  await mockSupabase(page, { profil: admin });
  await connecterEn(page, admin);
  await page.goto("/admin/ateliers");

  const groupe = page.getByRole("group", { name: "Affichage des ateliers" });
  await expect(groupe.getByRole("button", { name: "Cartes" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("table")).toHaveCount(0);

  await groupe.getByRole("button", { name: "Liste" }).click();
  await expect(page.getByRole("table")).toBeVisible();

  await page.reload();
  await expect(groupe.getByRole("button", { name: "Liste" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("table")).toBeVisible();
});
