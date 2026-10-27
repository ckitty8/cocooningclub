import { expect, test } from "@playwright/test";
import { mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

const MEMBRE = profilTest({
  id: "cccccccc-0000-4000-8000-000000000001", prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr", role: "membre",
});
const ADMIN = profilTest({ email: "admin@exemple.fr" });

const ANOMALIE = {
  id: "11111111-0000-4000-8000-000000000001", utilisateur_id: MEMBRE.id, categorie: "anomalie_site",
  titre: "Le calendrier ne s'ouvre pas", description: "Page blanche.\n\n—\nOù : Ateliers", cree_le: "2026-10-27T09:00:00Z",
};

test("une membre signale un problème : il part dans la boîte à idées, catégorie anomalie, avec l'endroit et l'appareil", async ({ page }) => {
  const mock = await mockSupabase(page, { profil: MEMBRE });
  await connecterEn(page, MEMBRE);
  await page.goto("/espace-membre/signaler");
  await expect(page.getByRole("heading", { level: 1, name: "Signaler un problème" })).toBeVisible();

  await page.getByLabel("Ce qui ne marche pas *").fill("Impossible de m'inscrire");
  await page.getByLabel("Où ça se passe ?").selectOption("Ateliers");
  await page.getByLabel("Que s'est-il passé ? *").fill("Le bouton S'inscrire ne fait rien quand je clique dessus.");
  await page.getByRole("button", { name: "Envoyer le signalement" }).click();

  await expect(page.getByText("ton signalement est bien arrivé")).toBeVisible();
  expect(mock.inserts.idees).toHaveLength(1);
  expect(mock.inserts.idees?.[0]).toMatchObject({
    utilisateur_id: MEMBRE.id, categorie: "anomalie_site", titre: "Impossible de m'inscrire",
  });
  const description = (mock.inserts.idees?.[0] as { description: string }).description;
  expect(description).toContain("Le bouton S'inscrire ne fait rien");
  expect(description).toContain("Où : Ateliers");
  expect(description).toContain("Appareil : ");
});

test("sans la case « Joindre mon navigateur », l'appareil n'est pas envoyé ; un texte trop court est refusé", async ({ page }) => {
  const mock = await mockSupabase(page, { profil: MEMBRE });
  await connecterEn(page, MEMBRE);
  await page.goto("/espace-membre/signaler");

  await page.getByLabel("Ce qui ne marche pas *").fill("Page blanche");
  await page.getByLabel("Que s'est-il passé ? *").fill("court");
  await page.getByRole("button", { name: "Envoyer le signalement" }).click();
  await expect(page.getByText("Décris ce qui s'est passé")).toBeVisible();
  expect(mock.inserts.idees).toBeUndefined();

  await page.getByLabel("Que s'est-il passé ? *").fill("La page reste blanche après la connexion.");
  await page.getByLabel("Joindre mon navigateur et la taille de mon écran").uncheck();
  await page.getByRole("button", { name: "Envoyer le signalement" }).click();
  await expect.poll(() => mock.inserts.idees?.length).toBe(1);
  expect((mock.inserts.idees?.[0] as { description: string }).description).not.toContain("Appareil");
});

test("« Mes signalements » montre la suite donnée par l'équipe", async ({ page }) => {
  await mockSupabase(page, {
    profil: MEMBRE, idees: [ANOMALIE],
    reactionsIdees: [{ idee_id: ANOMALIE.id, reaction: "a_discuter" }],
  });
  await connecterEn(page, MEMBRE);
  await page.goto("/espace-membre/signaler");
  const ligne = page.getByRole("listitem").filter({ hasText: "Le calendrier ne s'ouvre pas" });
  await expect(ligne).toContainText("En discussion");
});

test("la boîte à idées de la membre n'offre plus la catégorie anomalie et renvoie vers « Signaler un problème »", async ({ page }) => {
  const filtres: string[] = [];
  page.on("request", req => {
    const url = new URL(req.url());
    if (url.pathname.endsWith("/rest/v1/idees")) filtres.push(url.searchParams.get("categorie") ?? "(aucun)");
  });
  await mockSupabase(page, { profil: MEMBRE });
  await connecterEn(page, MEMBRE);
  await page.goto("/espace-membre/boite-a-idees");
  await expect(page.getByRole("link", { name: "ici" })).toHaveAttribute("href", "/espace-membre/signaler");
  await page.getByRole("button", { name: /Nouvelle idée/ }).first().click();
  await expect(page.getByRole("option", { name: /Anomalie/ })).toHaveCount(0);
  expect(filtres).toContain("neq.anomalie_site");
});

test("les administratrices retrouvent les anomalies dans la boîte à idées et les filtrent d'un clic", async ({ page }) => {
  const IDEE = { ...ANOMALIE, id: "11111111-0000-4000-8000-000000000002", titre: "Une idée sympa", categorie: "evolution_site", description: null };
  await mockSupabase(page, { profil: ADMIN, idees: [ANOMALIE, IDEE] });
  await connecterEn(page, ADMIN);
  await page.goto("/admin/boite-a-idees");
  await expect(page.getByText("Une idée sympa")).toBeVisible();
  await expect(page.getByText("Le calendrier ne s'ouvre pas")).toBeVisible();

  await page.getByRole("button", { name: /Anomalies à traiter \(1\)/ }).click();
  await expect(page.getByText("Le calendrier ne s'ouvre pas")).toBeVisible();
  await expect(page.getByText("Une idée sympa")).toHaveCount(0);
});
