import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { DESCRIPTION_PAR_DEFAUT, PAGES_PUBLIQUES, PAGE_INTROUVABLE, SITE_URL, type PageSeo } from "@/seo/pages";

const metaFor = (pathname: string): PageSeo => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (PAGES_PUBLIQUES[path]) return PAGES_PUBLIQUES[path];
  if (path.startsWith("/inscription/")) return { title: "Pré-inscription · Le Cocooning Club", index: false };
  if (path.startsWith("/espace-membre")) return { title: "Espace membre · Le Cocooning Club", index: false };
  if (path.startsWith("/admin")) return { title: "Administration · Le Cocooning Club", index: false };
  return PAGE_INTROUVABLE;
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
    const description = meta.description ?? DESCRIPTION_PAR_DEFAUT;
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
