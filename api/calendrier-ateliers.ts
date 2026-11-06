// Calendrier d'abonnement des ateliers publiés (fonction Vercel) :
//   https://www.lecocooningclub.fr/api/calendrier-ateliers
// À coller une fois dans Google Agenda (« À partir de l'URL »), Apple Calendrier ou Outlook : l'agenda relit cette
// adresse régulièrement et suit les nouveaux ateliers, les changements d'horaire et les retraits.
// Contenu : ateliers publiés ou complets, du mois dernier à l'avenir (un atelier dépublié, annulé ou remis en
// brouillon disparaît de l'agenda). Seulement des informations déjà publiques sur le site (aucune inscrite).
// Fichier autonome (aucun import du site) : il est exécuté par Vercel en dehors de Vite.

export interface AtelierIcs {
  id: string;
  titre: string;
  date_atelier: string;
  heure_debut: string | null;
  heure_fin?: string | null;
  duree?: string | null;
  lieu?: string | null;
  adresse?: string | null;
  description?: string | null;
  statut?: string | null;
}

const SITE = "https://www.lecocooningclub.fr";
// Projet Supabase du site (« CocooningClubBDD ») si la variable de Vercel est absente.
const SUPABASE_PAR_DEFAUT = "https://rakqbuxgzuwrnjangqcy.supabase.co";

const pad = (n: number) => String(n).padStart(2, "0");

/** Durée « 02:00:00 », « 1h30 », « 2h » en minutes (2 h par défaut). */
export const dureeMinutes = (duree: string | null | undefined): number => {
  const d = (duree ?? "").trim();
  const hms = d.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hms) return Number(hms[1]) * 60 + Number(hms[2]);
  const fr = d.match(/^(\d{1,2})\s*h\s*(\d{0,2})$/i);
  if (fr) return Number(fr[1]) * 60 + (fr[2] ? Number(fr[2]) : 0);
  return 120;
};

/** « 2026-11-05 » + « 14:30:00 » → « 20261105T143000 » (heure « flottante » : celle de l'agenda, en pratique Paris). */
const horaire = (date: string, heure: string) => {
  const [h, m] = heure.split(":").map(Number);
  return `${date.slice(0, 10).replace(/-/g, "")}T${pad(h)}${pad(m)}00`;
};

/** Fin de l'atelier : heure de fin si renseignée (et après le début), sinon début + durée. */
const fin = (a: AtelierIcs): string => {
  const [h, m] = (a.heure_debut ?? "00:00").split(":").map(Number);
  if (a.heure_fin && a.heure_fin.slice(0, 5) > (a.heure_debut ?? "").slice(0, 5)) return horaire(a.date_atelier, a.heure_fin);
  const total = h * 60 + m + dureeMinutes(a.duree);
  if (total >= 24 * 60) return horaire(a.date_atelier, "23:59");
  return horaire(a.date_atelier, `${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
};

/** HTML de la description (éditeur de texte) → texte simple. */
export const texteSimple = (v: string | null | undefined): string =>
  (v ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const echapper = (s: string) => s.replace(/\\/g, "\\\\").replace(/[;,]/g, c => `\\${c}`).replace(/\r?\n/g, "\\n");

/** Lignes de plus de 75 octets repliées (RFC 5545), sans couper un caractère accentué ou un émoji. */
export const replier = (ligne: string): string => {
  const morceaux: string[] = [];
  let courant = "";
  let octets = 0;
  for (const c of ligne) {
    const n = new TextEncoder().encode(c).length;
    if (octets + n > (morceaux.length === 0 ? 75 : 74)) {
      morceaux.push(courant);
      courant = "";
      octets = 0;
    }
    courant += c;
    octets += n;
  }
  morceaux.push(courant);
  return morceaux.join("\r\n ");
};

/** Lieu de l'agenda : nom du lieu + adresse en clair (un lien Google Maps collé dans « adresse » n'est pas repris ;
 *  si l'adresse commence déjà par le nom du lieu, il n'est pas répété). */
export const lieuIcs = (a: Pick<AtelierIcs, "lieu" | "adresse">): string => {
  const lieu = (a.lieu ?? "").trim();
  const adresse = a.adresse && !/^https?:\/\//i.test(a.adresse) ? a.adresse.trim() : "";
  if (adresse && lieu && adresse.toLowerCase().startsWith(lieu.toLowerCase())) return adresse;
  return [lieu, adresse].filter(Boolean).join(", ");
};

/** Calendrier complet (RFC 5545) des ateliers donnés. */
export const calendrierIcs = (ateliers: AtelierIcs[], maintenant = new Date()): string => {
  const horodatage = maintenant.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Le Cocooning Club//Ateliers//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Ateliers - Le Cocooning Club",
    "X-WR-TIMEZONE:Europe/Paris",
    "X-PUBLISHED-TTL:PT3H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT3H",
  ];
  for (const a of ateliers) {
    if (!a.date_atelier) continue;
    const lien = `${SITE}/inscription/${a.id}`;
    const description = [texteSimple(a.description), a.statut === "complet" ? "Atelier complet." : "", `Inscription : ${lien}`]
      .filter(Boolean).join("\n\n");
    lignes.push(
      "BEGIN:VEVENT",
      `UID:atelier-${a.id}@lecocooningclub.fr`,
      `DTSTAMP:${horodatage}`,
      ...(a.heure_debut
        ? [`DTSTART:${horaire(a.date_atelier, a.heure_debut)}`, `DTEND:${fin(a)}`]
        : [`DTSTART;VALUE=DATE:${a.date_atelier.slice(0, 10).replace(/-/g, "")}`]),
      `SUMMARY:${echapper(a.titre.trim())}`,
      `LOCATION:${echapper(lieuIcs(a))}`,
      `DESCRIPTION:${echapper(description)}`,
      `URL:${lien}`,
      "END:VEVENT",
    );
  }
  lignes.push("END:VCALENDAR");
  return lignes.map(replier).join("\r\n") + "\r\n";
};

/** Premier jour du mois précédent (AAAA-MM-JJ) : les ateliers récents restent visibles dans l'agenda. */
export const debutFenetre = (maintenant = new Date()) => {
  const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

/** Requête GET de l'agenda : lit les ateliers publiés dans Supabase (clé publique, mêmes droits qu'une visiteuse). */
export async function GET(): Promise<Response> {
  const base = (process.env.VITE_SUPABASE_URL || SUPABASE_PAR_DEFAUT).replace(/\/$/, "");
  const cle = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  const url = `${base}/rest/v1/ateliers?select=id,titre,date_atelier,heure_debut,heure_fin,duree,lieu,adresse,description,statut`
    + `&statut=in.(publie,complet)&date_atelier=gte.${debutFenetre()}&order=date_atelier.asc,heure_debut.asc`;
  try {
    const reponse = await fetch(url, { headers: { apikey: cle, Authorization: `Bearer ${cle}` } });
    if (!reponse.ok) throw new Error(`Supabase ${reponse.status}`);
    const ateliers = (await reponse.json()) as AtelierIcs[];
    return new Response(calendrierIcs(ateliers), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="ateliers-cocooning-club.ics"',
        // Un agenda qui relit souvent ne charge pas la base : réponse gardée 15 min par Vercel.
        "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    console.error("[calendrier-ateliers]", err);
    // Erreur passagère : l'agenda garde sa dernière version et réessaiera plus tard.
    return new Response("Calendrier momentanément indisponible", { status: 503, headers: { "Retry-After": "600" } });
  }
}
