// Données structurées « Event » (schema.org) des ateliers à venir : Google peut ainsi les présenter
// comme événements (date, lieu, tarif) dans ses résultats. Rien n'est inventé : seuls les champs publics
// de l'atelier sont repris, et un atelier sans lieu est ignoré (le lieu est obligatoire pour Google).
import type { Workshop } from "@/data/workshops";
import { SITE_URL } from "./pages";

const dernierDimanche = (annee: number, mois: number): number => {
  // mois : 0 = janvier. Jour du mois du dernier dimanche.
  const dernierJour = new Date(Date.UTC(annee, mois + 1, 0));
  return dernierJour.getUTCDate() - dernierJour.getUTCDay();
};

/** Décalage horaire de la France (+01:00 en hiver, +02:00 du dernier dimanche de mars à celui d'octobre). */
export const decalageFrance = (dateIso: string): string => {
  const [annee, mois, jour] = dateIso.split("-").map(Number);
  const debutEte = dernierDimanche(annee, 2);
  const finEte = dernierDimanche(annee, 9);
  const dansEte =
    (mois > 3 && mois < 10) || (mois === 3 && jour >= debutEte) || (mois === 10 && jour < finEte);
  return dansEte ? "+02:00" : "+01:00";
};

/** Durée en minutes d'après un texte du type « 2h », « 1h30 », « 90 min » ; null si illisible. */
export const dureeEnMinutes = (duree: string | null | undefined): number | null => {
  if (!duree) return null;
  const texte = duree.toLowerCase().trim();
  const heures = texte.match(/^(\d{1,2})\s*h\s*(\d{1,2})?$/);
  if (heures) return Number(heures[1]) * 60 + Number(heures[2] ?? 0);
  const minutes = texte.match(/^(\d{1,3})\s*min/);
  return minutes ? Number(minutes[1]) : null;
};

const ajouterMinutes = (heure: string, minutes: number): { heure: string; jours: number } => {
  const [h, m] = heure.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const jours = Math.floor(total / 1440);
  const reste = total % 1440;
  return { heure: `${String(Math.floor(reste / 60)).padStart(2, "0")}:${String(reste % 60).padStart(2, "0")}`, jours };
};

const ajouterJours = (dateIso: string, jours: number): string => {
  if (jours === 0) return dateIso;
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
};

type Atelier = Pick<
  Workshop,
  "id" | "titre" | "date_atelier" | "heure_debut" | "duree" | "description" | "lieu" | "adresse" | "tarif_standard" | "statut"
>;

/** Événement schema.org d'un atelier, ou null s'il manque la date ou le lieu. */
export const evenementJsonLd = (atelier: Atelier): Record<string, unknown> | null => {
  if (!atelier.date_atelier || !atelier.heure_debut || !atelier.lieu?.trim()) return null;
  const decalage = decalageFrance(atelier.date_atelier);
  const debut = atelier.heure_debut.slice(0, 5);
  const minutes = dureeEnMinutes(atelier.duree);
  const fin = minutes ? ajouterMinutes(debut, minutes) : null;
  const url = `${SITE_URL}/calendrier`;
  const evenement: Record<string, unknown> = {
    "@type": "Event",
    name: atelier.titre,
    startDate: `${atelier.date_atelier}T${debut}:00${decalage}`,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: atelier.lieu.trim(),
      address: atelier.adresse?.trim()
        ? { "@type": "PostalAddress", streetAddress: atelier.adresse.trim(), addressCountry: "FR" }
        : atelier.lieu.trim(),
    },
    image: `${SITE_URL}/og-image.jpg`,
    organizer: { "@id": `${SITE_URL}/#organisation` },
    url,
  };
  if (fin) evenement.endDate = `${ajouterJours(atelier.date_atelier, fin.jours)}T${fin.heure}:00${decalage}`;
  const description = atelier.description?.trim();
  if (description) evenement.description = description;
  if (Number.isFinite(atelier.tarif_standard)) {
    evenement.offers = {
      "@type": "Offer",
      price: String(atelier.tarif_standard),
      priceCurrency: "EUR",
      url,
      availability: atelier.statut === "complet" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    };
  }
  return evenement;
};

/** Document JSON-LD de plusieurs ateliers, ou null s'il n'y a aucun atelier exploitable. */
export const evenementsJsonLd = (ateliers: Atelier[]): Record<string, unknown> | null => {
  const evenements = ateliers.map(evenementJsonLd).filter((e): e is Record<string, unknown> => e !== null);
  return evenements.length ? { "@context": "https://schema.org", "@graph": evenements } : null;
};
