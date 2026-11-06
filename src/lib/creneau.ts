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
