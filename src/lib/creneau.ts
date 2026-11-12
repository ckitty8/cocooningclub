// Ateliers Business : la participante vient toute la journée, le matin ou l'après-midi
// (colonne inscriptions.creneau, migration 20261106000001). NULL / vide = pas de réponse.

export type Creneau = "journee" | "matin" | "apres_midi";

export const CRENEAUX: { valeur: Creneau; libelle: string; court: string }[] = [
  { valeur: "journee", libelle: "Toute la journée", court: "Journée" },
  { valeur: "matin", libelle: "Le matin", court: "Matin" },
  { valeur: "apres_midi", libelle: "L'après-midi", court: "Après-midi" },
];

export const estCreneau = (v: unknown): v is Creneau => v === "journee" || v === "matin" || v === "apres_midi";

/** « Toute la journée », « Le matin », « L'après-midi » ; vide si pas de réponse. */
export const libelleCreneau = (v: string | null | undefined): string => CRENEAUX.find(c => c.valeur === v)?.libelle ?? "";

/** L'atelier est-il de l'espace Business (seul espace où la question est posée) ? */
export const atelierAvecCreneau = (slugEspace: string | null | undefined): boolean => slugEspace === "business";

export const TOUS_CRENEAUX: Creneau[] = CRENEAUX.map(c => c.valeur);

/**
 * Choix proposés par le formulaire pour cet atelier (réglage de l'atelier, colonne ateliers.creneaux_proposes,
 * migration 20261112000000) : aucun hors Business ; NULL / absent = les trois ; liste vide = question non posée.
 */
export const creneauxProposes = (slugEspace: string | null | undefined, reglage: readonly string[] | null | undefined): Creneau[] => {
  if (!atelierAvecCreneau(slugEspace)) return [];
  if (reglage == null) return TOUS_CRENEAUX;
  return TOUS_CRENEAUX.filter(c => reglage.includes(c));
};

/** Valeur à enregistrer pour le réglage : null quand les trois sont proposés (comportement par défaut). */
export const reglageCreneaux = (choisis: readonly Creneau[]): Creneau[] | null =>
  TOUS_CRENEAUX.every(c => choisis.includes(c)) ? null : TOUS_CRENEAUX.filter(c => choisis.includes(c));
