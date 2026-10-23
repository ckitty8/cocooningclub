import type { Workshop } from "@/data/workshops";

// Liens « ajouter à mon agenda » d'un atelier : Google Agenda (URL) et
// fichier .ics (Apple Calendar, Outlook…). Les heures sont « flottantes » :
// l'agenda les interprète dans le fuseau de l'appareil, en pratique Paris.

type AtelierAgenda = Pick<Workshop, "id" | "titre" | "date_atelier" | "heure_debut" | "duree" | "lieu" | "adresse" | "description">;

/** Durée « 02:00:00 », « 1h30 » ou « 2h » en minutes (2 h par défaut). */
function parseDurationMinutes(duree: string): number {
  const hms = duree.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hms) return parseInt(hms[1]) * 60 + parseInt(hms[2]);

  const fr = duree.match(/^(\d{1,2})h(\d{0,2})$/i);
  if (fr) return parseInt(fr[1]) * 60 + (fr[2] ? parseInt(fr[2]) : 0);

  return 120;
}

function debutEtFin(ws: AtelierAgenda): [Date, Date] {
  const [h, m] = ws.heure_debut.split(":").map(Number);
  const debut = new Date(ws.date_atelier + "T00:00:00");
  debut.setHours(h, m, 0, 0);
  return [debut, new Date(debut.getTime() + parseDurationMinutes(ws.duree) * 60_000)];
}

/** Date au format compact des agendas (AAAAMMJJTHHmmss). */
function toCalendarFormat(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/** Adresse complète si connue, sinon le nom du lieu (les deux peuvent manquer). */
const lieuDe = (ws: AtelierAgenda) => ws.adresse || ws.lieu || "";

const descriptionDe = (ws: AtelierAgenda) =>
  [ws.description, `Fiche de l'atelier : https://www.lecocooningclub.fr/calendrier?atelier=${ws.id}`]
    .filter(Boolean)
    .join("\n\n");

/** URL d'ajout de l'atelier dans Google Agenda. */
export function googleCalendarUrl(ws: AtelierAgenda): string {
  const [debut, fin] = debutEtFin(ws);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ws.titre,
    dates: `${toCalendarFormat(debut)}/${toCalendarFormat(fin)}`,
    location: lieuDe(ws),
    details: descriptionDe(ws),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Contenu du fichier .ics de l'atelier (RFC 5545). */
export function contenuIcs(ws: AtelierAgenda, maintenant = new Date()): string {
  const [debut, fin] = debutEtFin(ws);
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const horodatage = maintenant.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CocooningClub//Atelier//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:atelier-${ws.id}@lecocooningclub.fr`,
    `DTSTAMP:${horodatage}`,
    `DTSTART:${toCalendarFormat(debut)}`,
    `DTEND:${toCalendarFormat(fin)}`,
    `SUMMARY:${esc(ws.titre)}`,
    `LOCATION:${esc(lieuDe(ws))}`,
    `DESCRIPTION:${esc(descriptionDe(ws))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** « Café des copines ! » → « Cafe-des-copines » : certains navigateurs
 *  ignorent un nom de fichier accentué et le remplacent par « download ». */
export const nomDeFichier = (titre: string) =>
  titre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "-") || "atelier";

/** Télécharge le fichier .ics de l'atelier. */
export function downloadIcsFile(ws: AtelierAgenda): void {
  const blob = new Blob([contenuIcs(ws)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomDeFichier(ws.titre)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Libérer l'URL tout de suite annule le téléchargement (ou lui fait perdre
  // son nom) dans Chrome : on attend que le navigateur l'ait pris en compte.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
