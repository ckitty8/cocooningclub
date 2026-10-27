import { expect, test } from "@playwright/test";
import { ATELIER_TEST, mockSupabase } from "./supabaseMock";
import { PAGES_PUBLIQUES, SITE_URL } from "../src/seo/pages";

// Référencement : ce que voient les robots qui n'exécutent pas le JavaScript (Bing, aperçus WhatsApp),
// et ce que le site affiche une fois chargé (pages des espaces, données structurées des ateliers).

const PAGES_INDEXEES = Object.entries(PAGES_PUBLIQUES).filter(([, p]) => p.index);

test.describe("HTML reçu avant l'exécution du JavaScript", () => {
  for (const [chemin, page] of PAGES_INDEXEES) {
    test(`${chemin} : titre, description et adresse canonique propres à la page`, async ({ request }) => {
      // Avec la barre finale, le serveur de test sert le dossier de la page (sur Vercel, vercel.json le fait sans).
      const reponse = await request.get(chemin === "/" ? "/" : `${chemin}/`);
      expect(reponse.status()).toBe(200);
      const html = await reponse.text();
      const echappe = (t: string) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      expect(html).toContain(`<title>${echappe(page.title)}</title>`);
      expect(html).toContain(`content="${echappe(page.description ?? "")}"`);
      expect(html).toContain(`<link rel="canonical" href="${SITE_URL}${chemin === "/" ? "/" : chemin}" />`);
      expect(html).toContain(`<meta property="og:title" content="${echappe(page.title)}" />`);
    });
  }

  test("une page privée garde le modèle de l'accueil (le site la marque en noindex une fois chargé)", async ({ request }) => {
    const html = await (await request.get("/inscription/aaaaaaaa-0000-4000-8000-000000000001")).text();
    expect(html).toContain('<div id="root"></div>');
  });
});

test.describe("pages des espaces", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page);
  });

  test("Papotages : titre principal, atelier à venir du bon espace et lien vers le calendrier", async ({ page }) => {
    await page.goto("/papotages");
    await expect(page).toHaveTitle(PAGES_PUBLIQUES["/papotages"].title);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Papotages");
    await expect(page.getByRole("heading", { level: 2, name: "Prochains ateliers Papotages" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: ATELIER_TEST.titre })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir l'atelier et me pré-inscrire" })).toHaveAttribute(
      "href",
      `/calendrier?atelier=${ATELIER_TEST.id}`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
  });

  test("Créatifs : sans atelier de cet espace, un message renvoie vers le calendrier", async ({ page }) => {
    await page.goto("/creatifs");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("créatifs");
    await expect(page.getByText("Aucun atelier n'est programmé pour le moment.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: ATELIER_TEST.titre })).toHaveCount(0);
  });

  test("Business : une seule page, deux liens vers les autres espaces", async ({ page }) => {
    await page.goto("/business");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const autres = page.getByRole("main").getByRole("link", { name: /^(Papotages|Créatifs)$/ });
    await expect(autres).toHaveCount(2);
  });

  test("l'accueil et le pied de page mènent aux trois pages des espaces", async ({ page }) => {
    await page.goto("/");
    for (const [slug, nom] of [["papotages", "Papotages"], ["creatifs", "Créatifs"], ["business", "Business"]]) {
      await expect(page.locator(`footer a[href="/${slug}"]`)).toHaveText(nom);
      await expect(page.locator(`#espaces a[href="/${slug}"]`)).toHaveCount(1);
    }
  });
});

test.describe("données structurées des ateliers", () => {
  test("le calendrier décrit chaque atelier à venir comme un événement", async ({ page }) => {
    await mockSupabase(page);
    await page.goto("/calendrier");
    const json = await page.locator('script[data-evenements="true"]').first().textContent();
    const doc = JSON.parse(json ?? "{}");
    expect(doc["@context"]).toBe("https://schema.org");
    const evenement = doc["@graph"][0];
    expect(evenement["@type"]).toBe("Event");
    expect(evenement.name).toBe(ATELIER_TEST.titre);
    expect(evenement.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T14:00:00\+0[12]:00$/);
    expect(evenement.location.name).toBe("Gagny");
    expect(evenement.offers.price).toBe("15");
  });

  test("en quittant la page, les données de l'atelier ne restent pas dans la suivante", async ({ page }) => {
    await mockSupabase(page);
    await page.goto("/calendrier");
    await expect(page.locator('script[data-evenements="true"]')).toHaveCount(1);
    await page.getByRole("link", { name: "Notre histoire" }).first().click();
    await expect(page.locator('script[data-evenements="true"]')).toHaveCount(0);
  });
});
