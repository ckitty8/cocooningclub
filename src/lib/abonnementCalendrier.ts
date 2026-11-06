// Abonnement au calendrier des ateliers publiés (fonction api/calendrier-ateliers.ts, sur le site en ligne).
export const URL_CALENDRIER_ATELIERS = "https://www.lecocooningclub.fr/api/calendrier-ateliers";

/** Même adresse en webcal:// : ouvre l'abonnement dans Apple Calendrier ou Outlook. */
export const webcalCalendrier = (url = URL_CALENDRIER_ATELIERS) => url.replace(/^https?:\/\//, "webcal://");

/** Ouvre Google Agenda sur « Ajouter cet agenda ? » (abonnement par URL). */
export const lienGoogleAgenda = (url = URL_CALENDRIER_ATELIERS) =>
  `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalCalendrier(url))}`;
