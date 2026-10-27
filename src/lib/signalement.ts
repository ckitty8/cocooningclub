// Signalement d'une anomalie par une membre (espace membre → « Signaler un problème »).
// Il est enregistré dans la boîte à idées (table `idees`, catégorie « anomalie_site ») : les administratrices le
// retrouvent dans Admin → Boîte à idées, avec la catégorie « 🐛 Anomalie Site internet ».

export const CATEGORIE_ANOMALIE = "anomalie_site";

export const ZONES_SIGNALEMENT = [
  "Ateliers",
  "Mes inscriptions",
  "Documents",
  "Boîte à idées",
  "Mon adhésion",
  "Mon compte",
  "Connexion ou mot de passe",
  "Site public (accueil, calendrier…)",
  "Autre",
] as const;

export const TITRE_MAX = 120;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 2000;

/** Message d'erreur à afficher, ou null si le signalement peut partir. */
export const validerSignalement = (titre: string, description: string): string | null => {
  if (!titre.trim()) return "Dis-nous en quelques mots ce qui ne marche pas.";
  if (description.trim().length < DESCRIPTION_MIN) return "Décris ce qui s'est passé (quelques mots au moins) pour que l'équipe puisse le reproduire.";
  return null;
};

/** « Chrome sur Android · écran 412×915 », d'après l'identifiant du navigateur et la taille de l'écran. */
export const resumeAppareil = (userAgent: string, largeur: number, hauteur: number): string => {
  const navigateur =
    /Edg\//.test(userAgent) ? "Edge"
    : /OPR\/|Opera/.test(userAgent) ? "Opera"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /Chrome\/|CriOS\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari"
    : "navigateur inconnu";
  const systeme =
    /iPhone|iPad|iPod/.test(userAgent) ? "iOS"
    : /Android/.test(userAgent) ? "Android"
    : /Windows/.test(userAgent) ? "Windows"
    : /Mac OS X|Macintosh/.test(userAgent) ? "macOS"
    : /Linux/.test(userAgent) ? "Linux"
    : "système inconnu";
  return `${navigateur} sur ${systeme} · écran ${Math.round(largeur)}×${Math.round(hauteur)}`;
};

/** Texte enregistré dans la description : ce que la membre a écrit, puis le contexte utile à l'équipe. */
export const composerDescription = (description: string, zone: string, appareil: string | null): string => {
  const lignes = [description.trim()];
  const contexte = [zone ? `Où : ${zone}` : "", appareil ? `Appareil : ${appareil}` : ""].filter(Boolean);
  if (contexte.length > 0) lignes.push("", "—", ...contexte);
  return lignes.join("\n");
};

export type Suite = "recu" | "pris_en_compte" | "en_discussion" | "classe";

export const LIBELLES_SUITE: Record<Suite, string> = {
  recu: "Reçu",
  pris_en_compte: "Pris en compte",
  en_discussion: "En discussion",
  classe: "Classé",
};

/** Suite donnée par l'équipe, d'après les réactions des administratrices (la plus avancée l'emporte). */
export const suiteDuSignalement = (reactions: string[]): Suite =>
  reactions.includes("valide") ? "pris_en_compte"
  : reactions.includes("a_discuter") ? "en_discussion"
  : reactions.includes("non_valide") ? "classe"
  : "recu";
