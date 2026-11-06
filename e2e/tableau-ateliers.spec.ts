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
const insc = (n: number, atelierN: number, statut: string, present: boolean, creneau: string | null = null) => ({
  id: `dddddddd-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`, atelier_id: atelier(atelierN, 0, "").id,
  utilisateur_id: null, prenom_invite: "X", nom_invite: `Y${n}`, email_invite: `x${n}@x.fr`, statut, statut_paiement: "non_requis",
  present, creneau, inscrit_le: "2020-01-01T10:00:00Z",
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
  await groupe.click();
  await expect(menu.getByRole("link", { name: "Création des ateliers" })).toBeHidden();
  await groupe.click();
  await menu.getByRole("link", { name: "Tableau de bord", exact: true }).last().click();
  await expect(page).toHaveURL(/\/admin\/ateliers\/tableau-de-bord$/);
  await menu.getByRole("link", { name: "Création des ateliers" }).click();
  await expect(page).toHaveURL(/\/admin\/ateliers$/);
});

test("tableau de bord : moyennes par espace, répartition Business, et filtres qui changent les chiffres en direct", async ({ page }) => {
  const admin = profilTest();
  await mockSupabase(page, {
    profil: admin, espaces: ESPACES,
    ateliers: [atelier(1, 0, "2020-01-10", "termine"), atelier(2, 0, "2030-02-10"), atelier(3, 1, "2020-03-01", "termine"), atelier(4, 2, "2030-03-01", "brouillon")],
    inscriptions: [
      insc(1, 1, "confirme", true), insc(2, 1, "confirme", false), insc(3, 2, "confirme", false), insc(4, 2, "en_attente", false),
      insc(5, 3, "confirme", true, "journee"), insc(6, 3, "confirme", true, "matin"), insc(7, 3, "confirme", false, "matin"),
    ],
  });
  await connecterEn(page, admin);
  await page.goto("/admin/ateliers/tableau-de-bord");

  const ligne = (nom: string) => page.getByRole("row", { name: new RegExp(`^${nom}`) });
  // Papotages : 2 ateliers, 3 validées (1,5 par atelier), 1 présente sur 1 atelier passé.
  await expect(ligne("Papotages")).toContainText("1,5");
  await expect(page.getByText("Business : journée, matin ou après-midi")).toBeVisible();
  await expect(page.getByText(/2 validées \(67 %\) · 1 présente/)).toBeVisible(); // matin

  // Filtre « Passés » : l'atelier à venir sort du calcul.
  await page.getByRole("button", { name: "Passés", exact: true }).click();
  await expect(ligne("Papotages")).toContainText("2"); // 2 validées sur 1 atelier
  await expect(page.getByRole("row", { name: /Atelier 2/ })).toHaveCount(0);

  // Filtre d'espace : seulement Papotages, plus de bloc Business.
  await page.getByRole("button", { name: "Tous", exact: true }).click();
  await page.getByRole("button", { name: "Papotages" }).click();
  await expect(page.getByText("Business : journée, matin ou après-midi")).toBeHidden();
  await expect(page.getByRole("row", { name: /^Business/ })).toHaveCount(0);

  // Brouillons inclus : l'atelier Coworking en brouillon apparaît.
  await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
  await expect(page.getByRole("row", { name: /Atelier 4/ })).toHaveCount(0);
  await page.getByLabel("les brouillons").check();
  await expect(page.getByRole("row", { name: /Atelier 4/ })).toBeVisible();
});
