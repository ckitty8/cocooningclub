// Places d'un atelier. `places_max` vide (null) = places illimitées : `places_disponibles` est alors aussi null,
// l'atelier n'est jamais « complet » à cause des places et le public ne voit aucun nombre de places.

/** Places encore libres : capacité de l'atelier moins les inscriptions confirmées (jamais négatif) ; null si illimitées. */
export const placesRestantes = (placesMax: number | null, inscriptionsConfirmees: number): number | null =>
  placesMax === null ? null : Math.max(0, placesMax - inscriptionsConfirmees);

/** Places prises d'après le compteur de la base ; null si l'atelier est illimité (le compteur ne suit pas les inscrites). */
export const placesPrises = (placesMax: number | null, placesDisponibles: number | null): number | null =>
  placesMax === null || placesDisponibles === null ? null : placesMax - placesDisponibles;

/** Atelier complet : statut « complet », ou plus aucune place libre (jamais pour un atelier illimité). */
export const estComplet = (a: { statut: string; places_disponibles: number | null }): boolean =>
  a.statut === "complet" || (a.places_disponibles !== null && a.places_disponibles <= 0);

/** « 3/10 » pour un atelier limité, « illimitées » sinon (écrans d'administration). */
export const libellePlacesPrises = (placesMax: number | null, placesDisponibles: number | null): string => {
  const prises = placesPrises(placesMax, placesDisponibles);
  return prises === null ? "illimitées" : `${prises}/${placesMax}`;
};

/** Taux de remplissage en pourcentage (0 pour un atelier illimité). */
export const tauxRemplissage = (placesMax: number | null, placesDisponibles: number | null): number => {
  const prises = placesPrises(placesMax, placesDisponibles);
  return prises === null || !placesMax || placesMax <= 0 ? 0 : Math.min(100, (prises / placesMax) * 100);
};
