// Référencement des pages : source unique, lue par le site (RouteSeo, titre et description à chaque
// changement de page) ET par la génération des pages statiques au déploiement (pluginVite.ts), pour que
// Bing, WhatsApp et les robots sans JavaScript voient le bon titre sur chaque adresse.
// Ce fichier ne doit rien importer d'autre (ni image, ni composant) : il est aussi chargé par Vite.

// Domaine canonique : toujours la prod, même sur les previews Vercel.
export const SITE_URL = "https://www.lecocooningclub.fr";

export interface PageSeo {
  title: string;
  description?: string;
  /** true = page publique à indexer par Google ; false = noindex. */
  index: boolean;
}

export const DESCRIPTION_PAR_DEFAUT =
  "Le Cocooning Club, association de femmes en Seine-Saint-Denis : ateliers Papotages, Créatifs et Business à Gagny, Chelles et Le Raincy. Inscription en ligne.";

export const PAGES_PUBLIQUES: Record<string, PageSeo> = {
  "/": {
    title: "Le Cocooning Club · Ateliers entre femmes à Gagny et Chelles",
    description: DESCRIPTION_PAR_DEFAUT,
    index: true,
  },
  "/calendrier": {
    title: "Calendrier des ateliers · Le Cocooning Club",
    description:
      "Prochains ateliers Papotages, Créatifs et Business du Cocooning Club à Gagny, Chelles et Le Raincy : dates, lieux et pré-inscription en ligne.",
    index: true,
  },
  "/notre-histoire": {
    title: "Notre histoire · Le Cocooning Club",
    description:
      "Comment Le Cocooning Club est né d'une envie simple : créer du lien entre femmes. Découvrez notre histoire, les cinq fondatrices et ce qui nous unit.",
    index: true,
  },
  "/papotages": {
    title: "Papotages : rencontres entre femmes · Le Cocooning Club",
    description:
      "Les Papotages du Cocooning Club : des rencontres entre femmes autour d'un café pour échanger, se confier et créer du lien, à Gagny, Chelles et Le Raincy.",
    index: true,
  },
  "/creatifs": {
    title: "Ateliers créatifs pour femmes · Le Cocooning Club",
    description:
      "Peinture, bougie, macramé, poterie… les ateliers créatifs du Cocooning Club à Gagny, Chelles et Le Raincy, pour se reconnecter à soi entre femmes.",
    index: true,
  },
  "/business": {
    title: "Ateliers business pour femmes · Le Cocooning Club",
    description:
      "Entrepreneuriat, développement professionnel et personnel : les ateliers Business du Cocooning Club pour avancer entourée, à Gagny, Chelles et Le Raincy.",
    index: true,
  },
  "/confidentialite": {
    title: "Politique de confidentialité · Le Cocooning Club",
    description:
      "Comment Le Cocooning Club collecte, utilise et protège vos données personnelles, et comment exercer vos droits.",
    index: true,
  },
  "/cgu": {
    title: "Conditions générales d'utilisation · Le Cocooning Club",
    description:
      "Conditions d'utilisation du site du Cocooning Club : pré-inscription aux ateliers, paiement, annulation, espace membre, avis et propriété intellectuelle.",
    index: true,
  },
  "/mentions-legales": {
    title: "Mentions légales · Le Cocooning Club",
    description:
      "Mentions légales du site Le Cocooning Club : éditeur, directrice de la publication, hébergement et propriété intellectuelle.",
    index: true,
  },
  "/login": { title: "Connexion à l'espace membre · Le Cocooning Club", index: false },
  "/forgot-password": { title: "Mot de passe oublié · Le Cocooning Club", index: false },
  "/reset-password": { title: "Nouveau mot de passe · Le Cocooning Club", index: false },
};

export const PAGE_INTROUVABLE: PageSeo = { title: "Page introuvable · Le Cocooning Club", index: false };
