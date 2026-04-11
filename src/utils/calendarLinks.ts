import type { Workshop } from "@/data/workshops";

/**
 * Parse a duration string (e.g. "02:00:00", "1h30", "2h") into minutes.
 */
function parseDurationMinutes(duree: string): number {
  // HH:MM:SS format
  const hms = duree.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hms) return parseInt(hms[1]) * 60 + parseInt(hms[2]);

  // "2h", "1h30" format
  const fr = duree.match(/^(\d{1,2})h(\d{0,2})$/i);
  if (fr) return parseInt(fr[1]) * 60 + (fr[2] ? parseInt(fr[2]) : 0);

  return 120; // default 2h
}

/**
 * Build a Date from a workshop's date_atelier + heure_debut.
 */
function workshopStart(ws: Workshop): Date {
  const [h, m] = ws.heure_debut.split(":").map(Number);
  const d = new Date(ws.date_atelier + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Format a Date into the compact format used by Google Calendar (YYYYMMDDTHHmmss).
 */
function toCalendarFormat(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

/**
 * Generate a Google Calendar "add event" URL.
 */
export function googleCalendarUrl(ws: Workshop): string {
  const start = workshopStart(ws);
  const end = new Date(start.getTime() + parseDurationMinutes(ws.duree) * 60_000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ws.titre,
    dates: `${toCalendarFormat(start)}/${toCalendarFormat(end)}`,
    location: ws.lieu,
    details: ws.description,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate an .ics file content string and trigger a download.
 */
export function downloadIcsFile(ws: Workshop): void {
  const start = workshopStart(ws);
  const end = new Date(start.getTime() + parseDurationMinutes(ws.duree) * 60_000);

  const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CocooningClub//Atelier//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `DTSTART:${toCalendarFormat(start)}`,
    `DTEND:${toCalendarFormat(end)}`,
    `SUMMARY:${esc(ws.titre)}`,
    `LOCATION:${esc(ws.lieu)}`,
    `DESCRIPTION:${esc(ws.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ws.titre.replace(/[^a-zA-Z0-9À-ÿ ]/g, "").replace(/\s+/g, "-")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
