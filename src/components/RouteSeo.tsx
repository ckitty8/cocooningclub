import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Domaine canonique : toujours la prod, même sur les previews Vercel.
const SITE_URL = "https://www.lecocooningclub.fr";

interface PageMeta {
  title: string;
  description?: string;
  /** true = page publique à indexer par Google ; false = noindex. */
  index: boolean;
}

const DEFAULT_DESCRIPTION =
  "Cocooning Club propose des ateliers Papotages, Créatifs et Business à Gagny, Chelles et Le Raincy, dans une ambiance douce et bienveillante. Découvrez les prochains ateliers et pré-inscrivez-vous.";

const PUBLIC_PAGES: Record<string, PageMeta> = {
  "/": {
    title: "Cocooning Club · Ateliers à Gagny, Chelles et Le Raincy",
    description: DEFAULT_DESCRIPTION,
    index: true,
  },
  "/calendrier": {
    title: "Calendrier des ateliers · Cocooning Club",
    description:
      "Tous les prochains ateliers Papotages, Créatifs et Business du Cocooning Club à Gagny, Chelles et Le Raincy : dates, lieux, places restantes et pré-inscription en ligne.",
    index: true,
  },
  "/confidentialite": {
    title: "Politique de confidentialité · Cocooning Club",
    description:
      "Comment le Cocooning Club collecte, utilise et protège vos données personnelles, et comment exercer vos droits.",
    index: true,
  },
  "/cgu": {
    title: "Conditions générales d'utilisation · Cocooning Club",
    description:
      "Conditions d'utilisation du site du Cocooning Club : pré-inscription aux ateliers, paiement, annulation, espace membre, avis et propriété intellectuelle.",
    index: true,
  },
  "/login": { title: "Connexion à l'espace membre · Cocooning Club", index: false },
  "/forgot-password": { title: "Mot de passe oublié · Cocooning Club", index: false },
  "/reset-password": { title: "Nouveau mot de passe · Cocooning Club", index: false },
};

const NOT_FOUND: PageMeta = { title: "Page introuvable · Cocooning Club", index: false };

const metaFor = (pathname: string): PageMeta => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (PUBLIC_PAGES[path]) return PUBLIC_PAGES[path];
  if (path.startsWith("/espace-membre")) return { title: "Espace membre · Cocooning Club", index: false };
  if (path.startsWith("/admin")) return { title: "Administration · Cocooning Club", index: false };
  return NOT_FOUND;
};

const setMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const setCanonical = (href: string | null) => {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
};

// Met à jour <title>, description, canonical, Open Graph et robots à chaque
// changement de page (le site est une SPA : index.html ne contient que les
// valeurs de la page d'accueil).
const RouteSeo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = metaFor(pathname);
    const description = meta.description ?? DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${pathname === "/" ? "/" : pathname.replace(/\/+$/, "")}`;

    document.title = meta.title;
    setMeta("name", "description", description);
    setMeta("name", "robots", meta.index ? "index, follow" : "noindex, nofollow");
    setMeta("property", "og:title", meta.title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("name", "twitter:title", meta.title);
    setMeta("name", "twitter:description", description);
    setCanonical(meta.index ? url : null);
  }, [pathname]);

  return null;
};

export default RouteSeo;
