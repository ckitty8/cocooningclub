// Google Analytics 4 avec Google Consent Mode v2 : par défaut tout est refusé et rien de Google n'est
// chargé ; le script n'est ajouté qu'après acceptation de la mesure d'audience (voir lib/consentement.ts).
// Identifiant de mesure du club : G-X361LVXTDW, écrit ici pour que toute version du site (Vercel, IONOS…)
// l'emporte avec elle. La variable VITE_GA_MEASUREMENT_ID peut le remplacer (tests, autre propriété).
// C'est le SEUL endroit qui charge Google Analytics : aucune balise gtag dans index.html (pas de doublon).
import { audienceAutorisee } from "@/lib/consentement";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export const ID_MESURE_CLUB = "G-X361LVXTDW";
const ID_MESURE = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || ID_MESURE_CLUB;
let scriptAjoute = false;

// Pages d'espace connecté : jamais envoyées à Google Analytics.
const PAGES_PRIVEES = ["/admin", "/espace-membre", "/login", "/forgot-password", "/reset-password"];
export const pagePrivee = (chemin: string): boolean => PAGES_PRIVEES.some(p => chemin.startsWith(p));

// Durée du cookie _ga : 13 mois (396 jours), comme annoncé dans la politique de confidentialité
// (Google Analytics garde 2 ans par défaut).
const DUREE_COOKIE_SECONDES = 396 * 24 * 60 * 60;

/** Interrupteur officiel de Google : coupe l'envoi d'événements, même pour ceux de la mesure améliorée. */
const couperMesure = (coupee: boolean): void => {
  if (ID_MESURE) (window as unknown as Record<string, unknown>)[`ga-disable-${ID_MESURE}`] = coupee;
};

/** À appeler une fois au démarrage, avant tout chargement de Google : consentement refusé par défaut. */
export const preparerConsentement = (): void => {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
};

/** Supprime les cookies _ga* posés par Google (domaine courant et domaine parent). */
export const supprimerCookiesGoogle = (): void => {
  const parties = window.location.hostname.split(".");
  const domaines = ["", window.location.hostname, parties.length > 2 ? parties.slice(-2).join(".") : ""];
  for (const nom of document.cookie.split(";").map(c => c.split("=")[0].trim())) {
    if (!nom.startsWith("_ga")) continue;
    for (const domaine of domaines) {
      document.cookie = `${nom}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domaine ? `; domain=${domaine}` : ""}`;
    }
  }
};

/** Applique le choix : accepté → charge Google Analytics ; refusé → coupe la mesure et efface les cookies. */
export const appliquerChoix = (audience: boolean): void => {
  if (!window.gtag) preparerConsentement();
  if (audience) {
    if (!ID_MESURE) return;
    couperMesure(false);
    window.gtag("consent", "update", { analytics_storage: "granted" });
    if (!scriptAjoute) {
      scriptAjoute = true;
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID_MESURE)}`;
      document.head.appendChild(script);
      window.gtag("js", new Date());
      // Les pages vues sont envoyées à la main (application à page unique) : voir suivrePage.
      window.gtag("config", ID_MESURE, { send_page_view: false, cookie_expires: DUREE_COOKIE_SECONDES });
    }
  } else {
    // Si Google a été chargé plus tôt dans la session, il reste en mémoire jusqu'au rechargement : on le coupe.
    couperMesure(true);
    window.gtag("consent", "update", { analytics_storage: "denied" });
    supprimerCookiesGoogle();
  }
};

/** Une seule page « /inscription » dans les rapports, quel que soit l'atelier (comme le comptage interne). */
const cheminPourGoogle = (chemin: string): string => chemin.replace(/^\/inscription\/[^/]+/, "/inscription");

/** Pages vues envoyées à Google Analytics, seulement après acceptation et jamais depuis une page privée. */
export const suivrePage = (chemin: string): void => {
  if (!ID_MESURE || !audienceAutorisee() || !window.gtag || pagePrivee(chemin)) return;
  const page = cheminPourGoogle(chemin);
  window.gtag("event", "page_view", {
    page_path: page,
    page_location: window.location.origin + page,
    page_title: document.title,
  });
};

/**
 * Événement « pre_inscription » : à appeler UNIQUEMENT quand une pré-inscription vient d'être enregistrée
 * (jamais au clic, jamais en cas d'erreur ou de doublon). Mêmes règles que les pages vues : rien sans
 * consentement aux cookies statistiques, rien depuis une page privée (espace membre). Aucune donnée
 * personnelle : ni nom, ni e-mail, ni téléphone, ni identifiant d'atelier (adresse ramenée à « /inscription »).
 */
export const suivrePreInscription = (): void => {
  const chemin = window.location.pathname;
  if (!ID_MESURE || !audienceAutorisee() || !window.gtag || pagePrivee(chemin)) return;
  const page = cheminPourGoogle(chemin);
  window.gtag("event", "pre_inscription", {
    page_path: page,
    page_location: window.location.origin + page,
  });
};

export const analyticsConfigure = ID_MESURE !== "";
