// Génération des pages HTML statiques au déploiement : une copie de index.html par page publique, avec
// son propre titre, sa description, son adresse canonique et ses balises de partage (Open Graph, X).
// Le site reste une application à page unique : le JavaScript prend le relais au chargement.
import { PAGES_PUBLIQUES, SITE_URL } from "./pages";

const echapper = (valeur: string): string =>
  valeur.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Remplace UNE balise, et une seule : si le modèle change et que la balise n'est plus trouvée, le
// déploiement échoue plutôt que de publier des pages avec le titre de l'accueil.
const remplacer = (html: string, motif: RegExp, nouveau: string, nom: string): string => {
  if (!motif.test(html)) throw new Error(`Génération SEO : balise « ${nom} » introuvable dans index.html`);
  return html.replace(motif, () => nouveau);
};

export interface PageStatique {
  chemin: string;
  title: string;
  description: string;
}

/** Pages publiques à indexer, hors accueil (index.html lui-même). */
export const pagesAGenerer = (): PageStatique[] =>
  Object.entries(PAGES_PUBLIQUES)
    .filter(([chemin, page]) => chemin !== "/" && page.index && page.description)
    .map(([chemin, page]) => ({ chemin, title: page.title, description: page.description as string }));

/** HTML d'une page, à partir du modèle (index.html construit par Vite). */
export const pageHtml = (modele: string, page: PageStatique): string => {
  const url = `${SITE_URL}${page.chemin}`;
  const titre = echapper(page.title);
  const description = echapper(page.description);
  let html = modele;
  html = remplacer(html, /<title>[^<]*<\/title>/, `<title>${titre}</title>`, "title");
  html = remplacer(html, /<meta name="description" content="[^"]*" ?\/?>/, `<meta name="description" content="${description}" />`, "description");
  html = remplacer(html, /<link rel="canonical" href="[^"]*" ?\/?>/, `<link rel="canonical" href="${url}" />`, "canonical");
  html = remplacer(html, /<meta property="og:url" content="[^"]*" ?\/?>/, `<meta property="og:url" content="${url}" />`, "og:url");
  html = remplacer(html, /<meta property="og:title" content="[^"]*" ?\/?>/, `<meta property="og:title" content="${titre}" />`, "og:title");
  html = remplacer(html, /<meta property="og:description" content="[^"]*" ?\/?>/, `<meta property="og:description" content="${description}" />`, "og:description");
  html = remplacer(html, /<meta name="twitter:title" content="[^"]*" ?\/?>/, `<meta name="twitter:title" content="${titre}" />`, "twitter:title");
  html = remplacer(html, /<meta name="twitter:description" content="[^"]*" ?\/?>/, `<meta name="twitter:description" content="${description}" />`, "twitter:description");
  return html;
};
