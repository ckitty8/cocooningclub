import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const dans = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

test("Membres : le numéro d'adhérente s'affiche et se cherche", async ({ page }) => {
  const admin = profilTest({ prenom: "Lucie", nom: "Durand", email: "lucie@exemple.fr" });
  await mockSupabase(page, {
    profil: admin,
    adhesions: [{
      utilisateur_id: admin.id, numero: 7, statut: "active", valable_jusqu_au: dans(200),
      formules: { id: "f1", nom: "L'Espace Chill", couleur: "rose", formule_espaces: [] },
    }],
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await connecterEn(page, admin);
  await page.goto("/admin/membres");
  await expect(page.getByRole("columnheader", { name: "N° d'adhérente" })).toBeVisible();
  const ligne = page.getByRole("row", { name: /Lucie Durand/ });
  await expect(ligne.getByText("N° 0007")).toBeVisible();
  await page.getByPlaceholder("Rechercher...").fill("0007");
  await expect(ligne).toBeVisible();
  await page.getByPlaceholder("Rechercher...").fill("12");
  await expect(ligne).toHaveCount(0);
});
