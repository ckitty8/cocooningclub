// Places d'un atelier. `places_max` vide (null) = places illimitées : `places_disponibles` est alors aussi null,
// l'atelier n'est jamais « complet » à cause des places et le public ne voit aucun nombre de places.

/** Places encore libres : capacité de l'atelier moins les inscriptions confirmées (jamais négatif) ; null si illimitées. */
export const placesRestantes = (placesMax: number | null, inscriptionsConfirmees: number): number | null =>
  placesMax === null ? null : Math.max(0, placesMax - inscriptionsConfirmees);

/**
 * Places prises d'après le compteur de la base. Pour un atelier illimité, le compteur ne suit pas les inscrites :
 * on prend alors le nombre d'inscriptions confirmées s'il est connu (`confirmees`), sinon null.
 */
export const placesPrises = (placesMax: number | null, placesDisponibles: number | null, confirmees?: number | null): number | null =>
  placesMax === null || placesDisponibles === null ? (placesMax === null ? confirmees ?? null : null) : placesMax - placesDisponibles;

/** Atelier complet : statut « complet », ou plus aucune place libre (jamais pour un atelier illimité). */
export const estComplet = (a: { statut: string; places_disponibles: number | null }): boolean =>
  a.statut === "complet" || (a.places_disponibles !== null && a.places_disponibles <= 0);

/** « 3/10 » pour un atelier limité ; « 3/illimitées » (ou « illimitées » si le nombre d'inscrites n'est pas connu) sinon. */
export const libellePlacesPrises = (placesMax: number | null, placesDisponibles: number | null, confirmees?: number | null): string => {
  const prises = placesPrises(placesMax, placesDisponibles, confirmees);
  if (prises === null) return "illimitées";
  return `${prises}/${placesMax ?? "illimitées"}`;
};

/** Phrase des écrans d'administration : « 3/10 places prises » ou « 3 inscrites · places illimitées ». */
export const phrasePlacesPrises = (placesMax: number | null, placesDisponibles: number | null, confirmees?: number | null): string => {
  if (placesMax !== null) return `${libellePlacesPrises(placesMax, placesDisponibles)} places prises`;
  if (confirmees == null) return "places illimitées";
  return `${confirmees} inscrite${confirmees > 1 ? "s" : ""} · places illimitées`;
};

/** Nombre d'inscriptions confirmées par atelier, à partir d'une liste de lignes `{ atelier_id }`. */
export const compterParAtelier = (lignes: { atelier_id: string | null }[]): Record<string, number> => {
  const compte: Record<string, number> = {};
  for (const l of lignes) if (l.atelier_id) compte[l.atelier_id] = (compte[l.atelier_id] ?? 0) + 1;
  return compte;
};

/** Taux de remplissage en pourcentage (0 pour un atelier illimité). */
export const tauxRemplissage = (placesMax: number | null, placesDisponibles: number | null): number => {
  const prises = placesPrises(placesMax, placesDisponibles);
  return prises === null || !placesMax || placesMax <= 0 ? 0 : Math.min(100, (prises / placesMax) * 100);
};
