// Durée et horaires d'un atelier : la durée est une saisie libre
// (« 3h », « 2h30 », « 90 min », « 2 hours »…) ; ces fonctions la convertissent
// pour calculer l'heure de fin à partir du début, et inversement.

const MINUTES_PAR_JOUR = 24 * 60;

/** Durée saisie → minutes, ou null si elle n'est pas reconnue (ou nulle). */
export const dureeEnMinutes = (saisie: string): number | null => {
  const texte = saisie.trim().toLowerCase().replace(",", ".");
  if (!texte) return null;

  let minutes: number | null = null;

  // 02:30 ou 02:30:00 (format de la base)
  const hms = texte.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hms) minutes = Number(hms[1]) * 60 + Number(hms[2]);

  // 3h, 2h30, 2 h 30, 1 heure 15, 2 hours 30 minutes
  const heuresMinutes = texte.match(/^(\d+)\s*(?:h|heures?|hours?)\s*(?:(\d{1,2})\s*(?:m|min|minutes?)?)?$/);
  if (minutes === null && heuresMinutes) minutes = Number(heuresMinutes[1]) * 60 + Number(heuresMinutes[2] ?? 0);

  // 1.5h (heures décimales)
  const heuresDecimales = texte.match(/^(\d+\.\d+)\s*(?:h|heures?|hours?)$/);
  if (minutes === null && heuresDecimales) minutes = Math.round(Number(heuresDecimales[1]) * 60);

  // 90 min
  const enMinutes = texte.match(/^(\d+)\s*(?:m|min|minutes?)$/);
  if (minutes === null && enMinutes) minutes = Number(enMinutes[1]);

  return minutes !== null && minutes > 0 && minutes < MINUTES_PAR_JOUR ? minutes : null;
};

/** 150 → « 2h30 », 120 → « 2h ». */
export const formaterDuree = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
};

const enMinutesDuJour = (heure: string): number | null => {
  const m = heure.match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const enHeure = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Heure de fin « HH:MM » = début + durée, ou null si elle dépasserait minuit ou si une valeur est invalide. */
export const heureDeFin = (debut: string, duree: string): string | null => {
  const d = enMinutesDuJour(debut);
  const minutes = dureeEnMinutes(duree);
  if (d === null || minutes === null || d + minutes >= MINUTES_PAR_JOUR) return null;
  return enHeure(d + minutes);
};

/** Durée formatée entre deux horaires « HH:MM », ou null si la fin n'est pas après le début. */
export const dureeEntre = (debut: string, fin: string): string | null => {
  const d = enMinutesDuJour(debut);
  const f = enMinutesDuJour(fin);
  return d !== null && f !== null && f > d ? formaterDuree(f - d) : null;
};
