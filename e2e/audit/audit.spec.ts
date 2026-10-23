import { expect, test } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { mockSupabase } from "../supabaseMock";
import { connecterEn, profilTest } from "../session";
import { ciblesTropPetites, contrastesInsuffisants, debordements } from "./mesures";
import { PAGES } from "./pages";

// Audit de contraste (WCAG AA) et de mise en page de toutes les pages, de 360 à 1280 px.
// Écrit un rapport JSON dans test-results/audit-visuel.json ; ne vérifie rien tout seul :
// les contrôles qui doivent rester à zéro sont dans verifications.spec.ts.
const LARGEURS = [360, 390, 768, 1024, 1280];
// Écrans de détail ouverts (fenêtres modales), mesurés aux deux extrêmes.
const MEMBRE = profilTest({ id: "cccccccc-0000-4000-8000-000000000001", email: "marie@exemple.fr", prenom: "Marie", nom: "Dupont", role: "membre" });
const ADMIN = profilTest({ email: "admin@exemple.fr" });
const CREATEUR = profilTest(); // christellelab@gmail.com : seul compte qui voit les pages du créateur

test.beforeEach(({ browserName }, info) => {
  test.skip(info.project.name !== "desktop", `un seul projet : les largeurs sont fixées par l'audit (${browserName})`);
});
test.setTimeout(240_000);

test("audit contraste et mise en page", async ({ page }) => {
  const rapport: Record<string, unknown>[] = [];
  for (const { chemin, profil } of PAGES) {
    const utilisateur = profil === "membre" ? MEMBRE : profil === "createur" ? CREATEUR : profil === "admin" ? ADMIN : undefined;
    await page.unrouteAll();
    await mockSupabase(page, { profil: utilisateur });
    if (utilisateur) await connecterEn(page, utilisateur);
    for (const largeur of LARGEURS) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.goto(chemin);
      await page.waitForLoadState("networkidle");
      const [contrastes, debord, cibles] = await Promise.all([
        contrastesInsuffisants(page),
        debordements(page),
        largeur <= 390 ? ciblesTropPetites(page) : Promise.resolve([]),
      ]);
      rapport.push({ chemin, largeur, profil, url: page.url().replace(/^https?:\/\/[^/]+/, ""), contrastes, debord, cibles });
    }
  }
  mkdirSync("test-results", { recursive: true });
  writeFileSync("test-results/audit-visuel.json", JSON.stringify(rapport, null, 2));

  // Ces trois contrôles doivent rester à zéro : un écart casse l'audit.
  const ecarts = (cle: "contrastes" | "cibles") =>
    rapport.flatMap(m => (m[cle] as unknown[]).map(d => `${m.chemin} ${m.largeur}px : ${JSON.stringify(d)}`));
  const debordes = rapport.filter(m => (m.debord as { pageLarge: boolean }).pageLarge)
    .map(m => `${m.chemin} ${m.largeur}px : ${JSON.stringify(m.debord)}`);
  expect(ecarts("contrastes"), "contrastes sous le niveau AA").toEqual([]);
  expect(debordes, "pages plus larges que l'écran (défilement horizontal)").toEqual([]);
  expect(ecarts("cibles"), "boutons ou liens de moins de 24 px").toEqual([]);
});
