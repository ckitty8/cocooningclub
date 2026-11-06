// Export « réseaux sociaux » de l'écran Ateliers : nom, date, heure, lieu et lien d'inscription de chaque
// atelier à venir publié (ou complet), pour préparer les publications Instagram / Facebook / WhatsApp.
// Le lien est toujours celui du site en ligne (jamais celui de la preview ou de l'ordinateur).
import type { FeuilleMiseEnForme } from "./exportMembres";

export const SITE_PUBLIC = "https://www.lecocooningclub.fr";

export interface AtelierReseaux {
  id: string;
  titre: string;
  date_atelier: string;
  heure_debut: string | null;
  heure_fin?: string | null;
  lieu: string | null;
  statut: string;
}

/** Ateliers à mettre en avant : date d'aujourd'hui ou plus tard, publiés ou complets ; triés par date puis heure. */
export const ateliersPourReseaux = <A extends AtelierReseaux>(ateliers: A[], aujourdhui: string): A[] =>
  ateliers
    .filter(a => a.date_atelier >= aujourdhui && (a.statut === "publie" || a.statut === "complet"))
    .sort((a, b) => a.date_atelier.localeCompare(b.date_atelier) || (a.heure_debut ?? "").localeCompare(b.heure_debut ?? ""));

export const lienPublicInscription = (id: string) => `${SITE_PUBLIC}/inscription/${id}`;

/** « Jeudi 5 novembre 2026 » */
export const dateLongueReseaux = (iso: string) => {
  const t = new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** « 14h30 – 16h30 », « 14h30 », ou vide. */
export const heureReseaux = (debut: string | null, fin?: string | null) => {
  const h = (v: string) => v.slice(0, 5).replace(":", "h");
  return debut ? `${h(debut)}${fin ? ` – ${h(fin)}` : ""}` : "";
};

/** Feuille Excel : en-tête en gras, une ligne par atelier, lien cliquable. */
export const feuilleReseaux = (ateliers: AtelierReseaux[]): FeuilleMiseEnForme => ({
  nom: "Réseaux sociaux",
  orientation: "landscape",
  impression: { ligneRepetee: 1 }, // imprimable : une page en largeur, en-tête répété
  largeurs: [38, 28, 16, 24, 62],
  cellules: [
    ["Atelier", "Date", "Heure", "Lieu", "Lien d'inscription"].map(value => ({ value, fontWeight: "bold", backgroundColor: "#f6dfd2" })),
    ...ateliers.map(a => {
      const lien = lienPublicInscription(a.id);
      return [
        { value: a.titre },
        { value: dateLongueReseaux(a.date_atelier) },
        { value: heureReseaux(a.heure_debut, a.heure_fin) },
        { value: a.lieu ?? "" },
        { type: "Formula", value: `HYPERLINK("${lien}","${lien}")`, textColor: "#1d4ed8" },
      ];
    }),
  ],
});

/** « ateliers-reseaux-sociaux-2026-11-06.xlsx » */
export const nomFichierReseaux = (aujourdhui: string) => `ateliers-reseaux-sociaux-${aujourdhui}.xlsx`;
