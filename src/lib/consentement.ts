// Choix de l'internaute sur la mesure d'audience (comptage interne + Google Analytics).
// Conservé 6 mois dans le navigateur (durée recommandée par la CNIL), puis redemandé.
// Tant qu'il n'y a pas de choix valide, rien n'est mesuré.

export interface ChoixCookies {
  /** true : mesure d'audience acceptée ; false : refusée. */
  audience: boolean;
  /** Date du choix (ISO). */
  date: string;
}

const CLE = "cc_consentement";
const DUREE_MOIS = 6;
const EVENEMENT_CHANGEMENT = "cc-consentement";
const EVENEMENT_OUVRIR = "cc-ouvrir-cookies";

const stockage = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Choix enregistré, ou null s'il n'y en a pas, s'il est illisible ou s'il date de plus de 6 mois. */
export const lireChoix = (maintenant: Date = new Date()): ChoixCookies | null => {
  try {
    const brut = stockage()?.getItem(CLE);
    if (!brut) return null;
    const choix = JSON.parse(brut) as Partial<ChoixCookies>;
    if (typeof choix.audience !== "boolean" || typeof choix.date !== "string") return null;
    const limite = new Date(choix.date);
    if (Number.isNaN(limite.getTime())) return null;
    limite.setMonth(limite.getMonth() + DUREE_MOIS);
    return limite.getTime() > maintenant.getTime() ? { audience: choix.audience, date: choix.date } : null;
  } catch {
    return null;
  }
};

export const audienceAutorisee = (): boolean => lireChoix()?.audience === true;

export const enregistrerChoix = (audience: boolean, maintenant: Date = new Date()): ChoixCookies => {
  const choix = { audience, date: maintenant.toISOString() };
  try {
    stockage()?.setItem(CLE, JSON.stringify(choix));
  } catch {
    // stockage indisponible (navigation privée) : le choix vaut pour la page en cours seulement
  }
  window.dispatchEvent(new CustomEvent<ChoixCookies>(EVENEMENT_CHANGEMENT, { detail: choix }));
  return choix;
};

/** Appelle `rappel` à chaque nouveau choix ; renvoie la fonction qui arrête l'écoute. */
export const surChangementDeChoix = (rappel: (choix: ChoixCookies) => void): (() => void) => {
  const ecouteur = (e: Event) => rappel((e as CustomEvent<ChoixCookies>).detail);
  window.addEventListener(EVENEMENT_CHANGEMENT, ecouteur);
  return () => window.removeEventListener(EVENEMENT_CHANGEMENT, ecouteur);
};

/** Rouvre la bannière (lien « Gérer mes cookies » du pied de page). */
export const ouvrirChoixCookies = (): void => {
  window.dispatchEvent(new Event(EVENEMENT_OUVRIR));
};

export const surDemandeOuverture = (rappel: () => void): (() => void) => {
  window.addEventListener(EVENEMENT_OUVRIR, rappel);
  return () => window.removeEventListener(EVENEMENT_OUVRIR, rappel);
};
