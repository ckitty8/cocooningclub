import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const ESPACES = [
  { id: "e0000000-0000-4000-8000-000000000001", nom: "Papotages", slug: "papotages" },
  { id: "e0000000-0000-4000-8000-000000000003", nom: "Business", slug: "business" },
  { id: "e0000000-0000-4000-8000-000000000004", nom: "Coworking", slug: "coworking" },
];
const atelier = (n: number, espace: number, date: string, statut = "publie") => ({
  ...ATELIER_TEST, id: `aaaaaaaa-0000-4000-8000-00000000002${n}`, titre: `Atelier ${n}`, date_atelier: date, statut,
  espace_id: ESPACES[espace].id, places_max: 10, places_disponibles: 6,
});

test("menu Ateliers : se plie et se déplie, avec « Création des ateliers » et « Tableau de bord »", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "menu latéral visible sur ordinateur");
  const admin = profilTest();
  await mockSupabase(page, { profil: admin, espaces: ESPACES, ateliers: [atelier(1, 0, "2030-01-10")] });
  await connecterEn(page, admin);
  await page.goto("/admin/dashboard");
  const menu = page.getByRole("navigation");
  const groupe = menu.getByRole("button", { name: "Ateliers" });
  await expect(groupe).toHaveAttribute("aria-expanded", "true");
  await expect(menu.getByRole("link", { name: "Création des ateliers" })).toBeVisible();
  await groupe.click();
  await expect(groupe).toHaveAttribute("aria-expanded", "false");
  await expect(menu.getByRole("link", { name: "Création des ateliers" })).toBeHidden();
  await groupe.click();
  await menu.getByRole("link", { name: "Tableau de bord", exact: true }).last().click();
  await expect(page).toHaveURL(/\/admin\/ateliers\/tableau-de-bord$/);
  await expect(page.getByRole("heading", { name: "Tableau de bord des ateliers" })).toBeVisible();
  await menu.getByRole("link", { name: "Création des ateliers" }).click();
  await expect(page).toHaveURL(/\/admin\/ateliers$/);
});

test("tableau de bord des ateliers : chiffres clés et nombre d'ateliers par espace, Coworking compris", async ({ page }) => {
  const admin = profilTest();
  await mockSupabase(page, {
    profil: admin, espaces: ESPACES,
    ateliers: [atelier(1, 0, "2030-01-10"), atelier(2, 0, "2030-02-10"), atelier(3, 0, "2020-01-10", "termine"), atelier(4, 1, "2030-03-01", "brouillon")],
  });
  await connecterEn(page, admin);
  await page.goto("/admin/ateliers/tableau-de-bord");
  await expect(page.getByText("ateliers à venir", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("places encore libres")).toBeVisible();
  await expect(page.getByText("brouillons à publier")).toBeVisible();
  const papotages = page.getByRole("region", { name: "Espace Papotages" });
  await expect(papotages.getByText("2", { exact: true }).first()).toBeVisible();
  await expect(papotages.getByRole("definition").nth(0)).toHaveText("1"); // passés
  await expect(papotages.getByRole("definition").nth(2)).toHaveText("3"); // total
  await expect(page.getByRole("region", { name: "Espace Business" }).getByRole("definition").nth(1)).toHaveText("1"); // brouillon
  await expect(page.getByRole("region", { name: "Espace Coworking" })).toBeVisible();
});
