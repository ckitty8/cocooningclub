import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageHtml, pagesAGenerer } from "./genererPages";
import { PAGES_PUBLIQUES, SITE_URL } from "./pages";

const indexHtml = readFileSync("index.html", "utf8");
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { rewrites: { source: string; destination: string }[] };
const indexees = Object.entries(PAGES_PUBLIQUES).filter(([, p]) => p.index);

describe("référencement des pages", () => {
  it("l'accueil de index.html reprend le titre et la description de la source unique", () => {
    const accueil = PAGES_PUBLIQUES["/"];
    expect(indexHtml).toContain(`<title>${accueil.title}</title>`);
    expect(indexHtml).toContain(`<meta name="description" content="${accueil.description}" />`);
  });

  it.each(indexees)("%s : titre court, description lisible dans Google, nom exact du club", (chemin, page) => {
    expect(page.title.length, `titre de ${chemin}`).toBeLessThanOrEqual(65);
    expect(page.description?.length ?? 0, `description de ${chemin}`).toBeGreaterThan(80);
    expect(page.description?.length ?? 0, `description de ${chemin}`).toBeLessThanOrEqual(160);
    expect(page.title).toContain("Le Cocooning Club");
  });

  it("deux pages n'ont jamais le même titre ni la même description", () => {
    const titres = Object.values(PAGES_PUBLIQUES).map(p => p.title);
    const descriptions = indexees.map(([, p]) => p.description);
    expect(new Set(titres).size).toBe(titres.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("génère une page par adresse publique indexée (hors accueil), avec ses propres balises", () => {
    const pages = pagesAGenerer();
    expect(pages.map(p => p.chemin).sort()).toEqual(indexees.map(([c]) => c).filter(c => c !== "/").sort());
    const calendrier = pageHtml(indexHtml, pages.find(p => p.chemin === "/calendrier")!);
    expect(calendrier).toContain(`<title>${PAGES_PUBLIQUES["/calendrier"].title}</title>`);
    expect(calendrier).toContain(`<link rel="canonical" href="${SITE_URL}/calendrier" />`);
    expect(calendrier).toContain(`<meta property="og:url" content="${SITE_URL}/calendrier" />`);
    expect(calendrier).not.toContain("Ateliers entre femmes à Gagny et Chelles");
    // le reste de la page (script, données structurées) est conservé tel quel
    expect(calendrier).toContain('<div id="root"></div>');
    expect(calendrier).toContain("application/ld+json");
  });

  it("échappe les guillemets et les esperluettes des textes", () => {
    const html = pageHtml(indexHtml, { chemin: "/x", title: 'A & "B"', description: "C < D" });
    expect(html).toContain("<title>A &amp; &quot;B&quot;</title>");
    expect(html).toContain('content="C &lt; D"');
  });

  it("échoue clairement si une balise du modèle a disparu", () => {
    const sansTitre = indexHtml.replace(/<title>[^<]*<\/title>/, "");
    expect(() => pageHtml(sansTitre, { chemin: "/x", title: "T", description: "D" })).toThrow(/title/);
  });

  it("vercel.json sert la page statique de chaque adresse générée, avant la redirection générale vers l'accueil", () => {
    const sources = vercel.rewrites.map(r => r.source);
    for (const page of pagesAGenerer()) {
      const regle = vercel.rewrites.find(r => r.source === page.chemin);
      expect(regle, `règle de ${page.chemin}`).toEqual({ source: page.chemin, destination: `${page.chemin}/index.html` });
      expect(sources.indexOf(page.chemin)).toBeLessThan(sources.indexOf("/(.*)"));
    }
  });

  it("le sitemap liste exactement les pages publiques à indexer", () => {
    const sitemap = readFileSync("public/sitemap.xml", "utf8");
    const adresses = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).sort();
    const attendues = indexees.map(([chemin]) => (chemin === "/" ? `${SITE_URL}/` : `${SITE_URL}${chemin}`)).sort();
    expect(adresses).toEqual(attendues);
  });
});
