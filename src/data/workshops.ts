export interface Workshop {
  id: string;
  titre: string;
  date_atelier: string;
  heure_debut: string;
  duree: string;
  places_disponibles: number;
  places_max: number;
  description: string | null;
  description_courte?: string | null;
  lieu: string | null;
  adresse?: string | null;
  tarif_affichage: string | null;
  tarif_standard: number;
  statut: string;
  date_fin_inscription?: string | null;
  /** Programme libre du matin et de l'après-midi (ateliers Business). */
  matin?: string | null;
  apres_midi?: string | null;
  /** Espace de l'atelier (jointure sur `espaces`), si demandé dans la requête. */
  espaces?: { slug: string } | null;
}

export const FRENCH_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export const FRENCH_DAYS_LONG = [
  "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi",
];

/** Format a date_atelier (YYYY-MM-DD) into "Mardi 30 Mars" */
export function formatDateFr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = FRENCH_DAYS_LONG[d.getDay()];
  const num = d.getDate();
  const month = FRENCH_MONTHS[d.getMonth()];
  return `${day} ${num} ${month}`;
}

/** Format heure_debut (HH:MM:SS) into "14h30" */
export function formatTimeFr(timeStr: string): string {
  if (!timeStr) return "À définir";
  const [h, m] = timeStr.split(":");
  return m === "00" ? `${parseInt(h)}h` : `${parseInt(h)}h${m}`;
}

/** Parse date_atelier string to Date object */
export function parseDateAtelier(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}
