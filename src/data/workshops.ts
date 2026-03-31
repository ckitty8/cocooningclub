export interface Workshop {
  id: string;
  titre: string;
  date_atelier: string;
  heure_debut: string;
  duree: string;
  places_disponibles: number;
  places_max: number;
  description: string;
  lieu: string;
  tarif_affichage: string;
  tarif_standard: number;
  statut: string;
}

export const MONTH_MAP: Record<string, number> = {
  Janvier: 0, Février: 1, Mars: 2, Avril: 3, Mai: 4, Juin: 5,
  Juillet: 6, Août: 7, Septembre: 8, Octobre: 9, Novembre: 10, Décembre: 11,
};

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
