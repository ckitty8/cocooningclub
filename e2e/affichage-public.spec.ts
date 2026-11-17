import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

test("Affichage public : l'administratrice choisit les informations de l'accueil et du calendrier", async ({ page }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, { profil: admin });
  await page.setViewportSize({ width: 1280, height: 900 });
  await connecterEn(page, admin);
  await page.goto("/admin/ateliers");
  await page.getByRole("button", { name: "Affichage public" }).click();
  const fenetre = page.getByRole("dialog", { name: "Affichage public" });
  const accueil = fenetre.getByRole("group", { name: "Accueil" });
  const calendrier = fenetre.getByRole("group", { name: "Calendrier" });
  // Réglage de départ : pas de places sur l'accueil, tout sur le calendrier.
  await expect(accueil.getByRole("checkbox", { name: "Nombre de places" })).not.toBeChecked();
  await expect(calendrier.getByRole("checkbox", { name: "Nombre de places" })).toBeChecked();
  await accueil.getByRole("checkbox", { name: "Lieu" }).uncheck();
  await calendrier.getByRole("checkbox", { name: "Nombre de places" }).uncheck();
  await fenetre.getByRole("button", { name: "Enregistrer" }).click();
  await expect.poll(() => mock.updates.parametres_affichage_ateliers?.[0]).toMatchObject({
    accueil: ["logo", "description", "date", "matin_apres_midi", "tarif", "date_limite", "agenda", "partage"],
    calendrier: ["logo", "description", "heure", "lieu", "tarif", "date_limite", "agenda", "partage"],
  });
});

test("Affichage public : l'accueil et le calendrier n'affichent que les informations choisies", async ({ page }) => {
  await mockSupabase(page, { affichage: { accueil: ["date", "lieu"], calendrier: ["heure", "places"] } });
  await page.goto("/");
  const tuiles = page.locator("#ateliers");
  await expect(tuiles.getByText(ATELIER_TEST.titre).first()).toBeVisible();
  await expect(tuiles.getByText(ATELIER_TEST.lieu!).first()).toBeVisible();
  await expect(tuiles.getByText(/Payant pour les non-adhérentes/)).toHaveCount(0);
  await expect(tuiles.getByRole("button", { name: /Partager le lien d'inscription/ })).toHaveCount(0);

  await page.goto("/calendrier");
  await expect(page.getByText(ATELIER_TEST.titre).first()).toBeVisible();
  await expect(page.getByText(`${ATELIER_TEST.places_max} places`).first()).toBeVisible();
  await expect(page.getByText(/Payant pour les non-adhérentes/)).toHaveCount(0);
  await expect(page.getByText(ATELIER_TEST.lieu!, { exact: true })).toHaveCount(0);
});
