// Export de l'écran Membres au format Excel (.xlsx) : une feuille « Comptes » (ce que montre la liste des comptes,
// filtres compris) et une feuille « Participantes ateliers » (pré-inscrites sans compte). Les fonctions qui
// préparent les lignes sont pures (testées) ; l'écriture du fichier charge `write-excel-file` à la demande.
import type { Participante } from "./participantes";

export interface CompteExport {
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  role: string;
  offres: string;
  actif: boolean;
  naissance: string;
  activite: string | null;
  hobby: string | null;
  consentementPhotos: string;
  creeLe: string | null;
}

export type Tableau = string[][];

export const COLONNES_COMPTES = ["Prénom", "Nom", "E-mail", "Téléphone", "Rôle", "Offre en cours", "Statut", "Naissance", "Activité principale", "Hobby", "Consentement photo", "Compte créé le"];
export const COLONNES_PARTICIPANTES = ["Prénom", "Nom", "E-mail", "Téléphone", "Dernier atelier", "Date de l'atelier", "Pré-inscriptions", "Validées", "Droit à l'image", "Groupe WhatsApp", "Dernière demande le"];

const dateCourte = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const [a, m, j] = iso.slice(0, 10).split("-");
  return a && m && j ? `${j}/${m}/${a}` : "";
};
const ouiNon = (v: boolean | null, oui: string, non: string) => (v === null ? "" : v ? oui : non);

export const tableauComptes = (comptes: CompteExport[]): Tableau => [
  COLONNES_COMPTES,
  ...comptes.map(c => [
    c.prenom, c.nom, c.email, c.telephone ?? "", c.role, c.offres, c.actif ? "Actif" : "Inactif",
    c.naissance, c.activite ?? "", c.hobby ?? "", c.consentementPhotos, dateCourte(c.creeLe),
  ]),
];

export const tableauParticipantes = (participantes: Participante[]): Tableau => [
  COLONNES_PARTICIPANTES,
  ...participantes.map(p => [
    p.prenom, p.nom, p.email ?? "", p.telephone ?? "", p.dernierAtelier?.titre ?? "", dateCourte(p.dernierAtelier?.date),
    String(p.demandes), String(p.validees),
    ouiNon(p.autorisationImage, "Autorise", "N'autorise pas"), ouiNon(p.accordWhatsapp, "Accepte", "N'accepte pas"),
    dateCourte(p.derniereDemande),
  ]),
];

/** Nom du fichier : « membres-cocooning-club-2026-11-04.xlsx ». */
export const nomFichierMembres = (aujourdhui: Date = new Date()): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `membres-cocooning-club-${aujourdhui.getFullYear()}-${p(aujourdhui.getMonth() + 1)}-${p(aujourdhui.getDate())}.xlsx`;
};

/** Largeur des colonnes d'après le texte le plus long (bornée). */
const largeurs = (t: Tableau) => t[0].map((_, i) => ({ width: Math.min(45, Math.max(10, ...t.map(l => (l[i] ?? "").length + 2))) }));

/** Fabrique le fichier .xlsx (feuilles vides omises, au moins une feuille). */
export const fichierExcel = async (feuilles: { nom: string; tableau: Tableau }[]): Promise<Blob> => {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const utiles = feuilles.filter((f, i) => f.tableau.length > 1 || i === 0);
  const sheets = utiles.map(f => ({
    sheet: f.nom,
    data: f.tableau.map((ligne, n) => ligne.map(v => (n === 0 ? { value: v, fontWeight: "bold" as const } : { value: v }))),
    columns: largeurs(f.tableau),
    stickyRowsCount: 1,
  }));
  return writeXlsxFile(sheets).toBlob();
};

/** Propose le fichier au téléchargement. */
export const telecharger = (blob: Blob, nom: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
