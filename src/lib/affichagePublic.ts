// Informations des ateliers affichées au public (17/11) : un réglage pour tous les ateliers, choisi dans
// Admin → Ateliers → « Affichage public », séparément pour l'accueil et pour le calendrier (carte et fenêtre).
// Enregistré dans la table `parametres_affichage_ateliers` (une ligne ; NULL = réglage par défaut).

export type ChampAffiche =
  | "logo" | "description" | "date" | "heure" | "matin_apres_midi" | "lieu" | "places" | "tarif" | "date_limite" | "agenda" | "partage";

export type PageAffichage = "accueil" | "calendrier";

export const LIBELLES_CHAMPS: Record<ChampAffiche, string> = {
  logo: "Logo de l'espace",
  description: "Description",
  date: "Date et heure",
  heure: "Heure et durée",
  matin_apres_midi: "Matin / Après-midi (ateliers Business)",
  lieu: "Lieu",
  places: "Nombre de places",
  tarif: "Tarif (Gratuit / Payant pour les non-adhérentes)",
  date_limite: "Date limite d'inscription",
  agenda: "Bouton « Ajouter à mon agenda »",
  partage: "Liens de partage",
};

/** Informations que chaque page sait afficher, dans l'ordre de la page. */
export const CHAMPS_PAR_PAGE: Record<PageAffichage, ChampAffiche[]> = {
  accueil: ["logo", "description", "date", "matin_apres_midi", "lieu", "places", "tarif", "date_limite", "agenda", "partage"],
  calendrier: ["logo", "description", "heure", "lieu", "places", "tarif", "date_limite", "agenda", "partage"],
};

/** Réglage par défaut = l'affichage d'avant le 17/11 (plus de places sur l'accueil depuis le 17/11). */
export const AFFICHAGE_PAR_DEFAUT: Record<PageAffichage, ChampAffiche[]> = {
  accueil: CHAMPS_PAR_PAGE.accueil.filter(c => c !== "places"),
  calendrier: [...CHAMPS_PAR_PAGE.calendrier],
};

/** Garde les seules informations connues de la page, dans l'ordre de la page ; NULL ou illisible = défaut. */
export const normaliserAffichage = (page: PageAffichage, valeur: unknown): ChampAffiche[] =>
  Array.isArray(valeur)
    ? CHAMPS_PAR_PAGE[page].filter(c => valeur.includes(c))
    : AFFICHAGE_PAR_DEFAUT[page];

export type ReglageAffichage = Record<PageAffichage, ReadonlySet<ChampAffiche>>;

export const reglageDepuis = (ligne: { accueil?: unknown; calendrier?: unknown } | null | undefined): ReglageAffichage => ({
  accueil: new Set(normaliserAffichage("accueil", ligne?.accueil)),
  calendrier: new Set(normaliserAffichage("calendrier", ligne?.calendrier)),
});
