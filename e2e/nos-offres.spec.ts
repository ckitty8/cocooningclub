import { expect, test } from "@playwright/test";
import { OFFRES_TEST as FORMULES, QUESTION_TEST as QUESTION, mockSupabase } from "./supabaseMock";
import { connecterEn, profilTest } from "./session";

test("la page Nos offres liste les trois offres dans l'ordre, avec leur contenu", async ({ page }) => {
  await mockSupabase(page, { formules: FORMULES, bonASavoir: [QUESTION] });
  await page.goto("/");
  // Sous 1024 px, les liens sont dans le menu ☰.
  const burger = page.getByRole("button", { name: "Ouvrir le menu" });
  if (await burger.isVisible()) await burger.click();
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: "Nos offres" }).click();
  await expect(page).toHaveURL(/\/nos-offres$/);
  await expect(page.getByRole("heading", { level: 1, name: "Nos offres" })).toBeVisible();

  const titres = page.locator("article h3");
  await expect(titres).toHaveText(["L'Espace Chill", "L'Espace Business", "Chill + Business"]);

  const duo = page.getByRole("article", { name: "Chill + Business" });
  await expect(duo.getByText("150 €")).toBeVisible();
  await expect(duo.getByText("au lieu de")).toContainText("180 €");
  await expect(duo.getByText("30 € d'économie")).toBeVisible();
  await expect(duo.getByText("Le plus complet")).toBeVisible();

  const chill = page.getByRole("article", { name: "L'Espace Chill" });
  await expect(chill.getByText("1 café et 1 atelier par mois")).toBeVisible();
  await expect(chill.getByRole("link", { name: "Le Flow bien-être, Gagny" })).toHaveAttribute("href", /google\.com\/maps/);
  await expect(chill.getByRole("link", { name: "Gagny, lieu à définir" })).toHaveCount(0);
  await expect(chill.getByText("Le matériel nécessaire pour chaque atelier.")).toBeVisible();
  await expect(chill.getByRole("link", { name: "J'adhère en ligne" })).toHaveAttribute("href", /helloasso/);
  // Sans lien HelloAsso, le bouton mène au formulaire de contact.
  await expect(page.getByRole("article", { name: "L'Espace Business" }).getByRole("link", { name: "J'adhère" })).toHaveAttribute("href", "/#contact");

  await expect(page.getByText("*Consommation sur place obligatoire.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "En trois étapes" })).toBeVisible();
  await page.getByText(QUESTION.question).click();
  await expect(page.getByText(QUESTION.reponse)).toBeVisible();
});

test("sans question publiée, la section Bon à savoir n'apparaît pas", async ({ page }) => {
  await mockSupabase(page, { formules: FORMULES });
  await page.goto("/nos-offres");
  await expect(page.locator("article h3").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bon à savoir" })).toHaveCount(0);
});

test("l'accueil affiche les offres et mène à la page", async ({ page }) => {
  await mockSupabase(page, { formules: FORMULES });
  await page.goto("/");
  const section = page.locator("#offres");
  await expect(section.locator("article h3")).toHaveText(["L'Espace Chill", "L'Espace Business", "Chill + Business"]);
  // Sur l'accueil, les cartes s'arrêtent au prix et aux lieux : le détail est sur la page « Nos offres ».
  const chill = section.getByRole("article", { name: "L'Espace Chill" });
  await expect(chill.getByText("80 €")).toBeVisible();
  await expect(chill.getByRole("link", { name: "Le Flow bien-être, Gagny" })).toBeVisible();
  await expect(section.getByText("Ce qui est compris")).toHaveCount(0);
  await expect(section.getByRole("link", { name: /J'adhère/ })).toHaveCount(0);
  await section.getByRole("link", { name: "Tout savoir sur nos offres" }).click();
  await expect(page).toHaveURL(/\/nos-offres$/);
});

test("admin : le contenu d'une carte se modifie, se prévisualise puis s'enregistre", async ({ page }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, { profil: admin, formules: FORMULES, adhesions: [], espaces: [] });
  await connecterEn(page, admin);
  await page.goto("/admin/offre");
  await page.locator("div.bg-card", { has: page.getByRole("heading", { name: "L'Espace Business" }) })
    .getByRole("button", { name: "Modifier" }).click();

  const fenetre = page.getByRole("dialog", { name: "Modifier la formule" });
  await expect(fenetre.getByLabel("Rythme")).toHaveValue("2 jeudis par mois");
  await fenetre.getByLabel("Rythme").fill("Deux jeudis par mois");
  await fenetre.getByLabel("Ce qui est compris").fill("La location de la salle.\n\nLe magazine du club.");
  await fenetre.getByRole("button", { name: "Ajouter une activité" }).click();
  await fenetre.getByLabel("Activité 2", { exact: true }).fill("Café Papotages*");
  await fenetre.getByLabel("Lieu de l'activité 2").fill("Le Flow bien-être, Gagny");

  await fenetre.getByRole("button", { name: "Prévisualiser" }).click();
  const apercu = page.getByRole("dialog", { name: "Aperçu de la page Nos offres" });
  await expect(apercu.locator("article h3")).toHaveText(["L'Espace Chill", "L'Espace Business", "Chill + Business"]);
  await expect(apercu.getByText("Deux jeudis par mois")).toBeVisible();
  await apercu.getByRole("button", { name: "Mobile" }).click();
  await expect(apercu.getByRole("button", { name: "Mobile" })).toHaveAttribute("aria-pressed", "true");
  await apercu.getByRole("button", { name: "Fermer l'aperçu" }).click();
  // Rien n'est enregistré par l'aperçu.
  expect(mock.updates.formules).toBeUndefined();

  await fenetre.getByRole("button", { name: "Enregistrer" }).click();
  await expect.poll(() => mock.updates.formules?.[0]).toMatchObject({
    rythme: "Deux jeudis par mois",
    compris: ["La location de la salle.", "Le magazine du club."],
    activites: [
      { nom: "Création de contenu", lieu: "La Picorette, Le Raincy", espace: "business" },
      { nom: "Café Papotages*", lieu: "Le Flow bien-être, Gagny", espace: "papotages" },
    ],
  });
});

test("admin : onglet Bon à savoir, ajout d'une question", async ({ page }) => {
  const admin = profilTest();
  const mock = await mockSupabase(page, { profil: admin, formules: FORMULES, adhesions: [], espaces: [], bonASavoir: [QUESTION] });
  await connecterEn(page, admin);
  await page.goto("/admin/offre");
  await page.getByRole("tab", { name: "Bon à savoir" }).click();
  await expect(page.getByText(QUESTION.question)).toBeVisible();
  await expect(page.getByRole("button", { name: `Dépublier « ${QUESTION.question} »` })).toHaveText("Publiée");

  await page.getByRole("button", { name: "Nouvelle question" }).click();
  const fenetre = page.getByRole("dialog", { name: "Nouvelle question" });
  await fenetre.getByLabel("Question (obligatoire)").fill("Puis-je changer d'offre ?");
  await fenetre.getByLabel("Réponse").fill("Au renouvellement.");
  await fenetre.getByRole("button", { name: "Prévisualiser" }).click();
  const apercu = page.getByRole("dialog", { name: "Aperçu de la page Nos offres" });
  await expect(apercu.getByText("Puis-je changer d'offre ?")).toBeVisible();
  await apercu.getByRole("button", { name: "Fermer l'aperçu" }).click();

  await fenetre.getByRole("button", { name: "Enregistrer" }).click();
  await expect.poll(() => mock.inserts.bon_a_savoir?.[0]).toMatchObject({
    question: "Puis-je changer d'offre ?", reponse: "Au renouvellement.", est_publiee: true, ordre: 2,
  });
});
