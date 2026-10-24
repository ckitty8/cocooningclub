// Google Analytics 4 avec Google Consent Mode v2 : par défaut tout est refusé et rien de Google n'est
// chargé ; le script n'est ajouté qu'après acceptation de la mesure d'audience (voir lib/consentement.ts).
// L'identifiant de mesure vient de la variable VITE_GA_MEASUREMENT_ID (réglages de Vercel) ; sans elle,
// seule la mesure interne existe.
import { audienceAutorisee } from "@/lib/consentement";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const ID_MESURE = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || "";
let scriptAjoute = false;

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
    window.gtag("consent", "update", { analytics_storage: "granted" });
    if (!scriptAjoute) {
      scriptAjoute = true;
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID_MESURE)}`;
      document.head.appendChild(script);
      window.gtag("js", new Date());
      // Les pages vues sont envoyées à la main (application à page unique) : voir suivrePage.
      window.gtag("config", ID_MESURE, { send_page_view: false });
    }
  } else {
    window.gtag("consent", "update", { analytics_storage: "denied" });
    supprimerCookiesGoogle();
  }
};

/** Pages vues envoyées à Google Analytics, seulement après acceptation. */
export const suivrePage = (chemin: string): void => {
  if (!ID_MESURE || !audienceAutorisee() || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: chemin,
    page_location: window.location.origin + chemin,
    page_title: document.title,
  });
};

export const analyticsConfigure = ID_MESURE !== "";
