import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const MEMBRE = profilTest({ id: "cccccccc-0000-4000-8000-000000000001", prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr", role: "membre" });
const ADMIN = profilTest();

// Lit les filtres d'accès envoyés à la base pour la table documents.
const filtresAcces = (page: import("@playwright/test").Page) => {
  const vus: string[] = [];
  page.on("request", req => {
    const url = new URL(req.url());
    if (url.pathname.endsWith("/rest/v1/documents")) vus.push(url.searchParams.get("acces") ?? "(aucun)");
  });
  return vus;
};

test("une membre ne demande que les documents « membres » et « tous » (jamais « admins »)", async ({ page }) => {
  const vus = filtresAcces(page);
  await mockSupabase(page, { profil: MEMBRE });
  await connecterEn(page, MEMBRE);
  await page.goto("/espace-membre/magazine");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => vus.length).toBeGreaterThan(0);
  expect(vus.every(f => f === "in.(membres,tous)")).toBe(true);
});

test("une administratrice qui consulte l'espace membre voit tous les documents", async ({ page }) => {
  const vus = filtresAcces(page);
  await mockSupabase(page, { profil: ADMIN });
  await connecterEn(page, ADMIN);
  await page.goto("/espace-membre/magazine");
  await expect.poll(() => vus.length).toBeGreaterThan(0);
  expect(vus.every(f => f === "(aucun)")).toBe(true);
});

test("Admin → Documents propose les trois niveaux d'accès, administrateurs en premier", async ({ page }) => {
  await mockSupabase(page, { profil: ADMIN });
  await connecterEn(page, ADMIN);
  await page.goto("/admin/documents");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  const acces = page.locator("div.fixed").filter({ hasText: "Ajouter un document" }).locator("select").nth(1);
  await expect(acces.locator("option")).toHaveText([
    "Administrateurs uniquement", "Membres uniquement", "Tous les utilisateurs (administrateurs + membres)",
  ]);
});
