/** Places encore libres : capacité de l'atelier moins les inscriptions confirmées (jamais négatif). */
export const placesRestantes = (placesMax: number, inscriptionsConfirmees: number): number =>
  Math.max(0, placesMax - inscriptionsConfirmees);
