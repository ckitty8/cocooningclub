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
  /** N° d'adhérente de l'adhésion en cours (« 0003 »), vide sans adhésion. */
  numeroAdherente: string;
  offres: string;
  actif: boolean;
  naissance: string;
  activite: string | null;
  hobby: string | null;
  consentementPhotos: string;
  creeLe: string | null;
}

export type Tableau = string[][];

export const COLONNES_COMPTES = ["Prénom", "Nom", "E-mail", "Téléphone", "Rôle", "N° d'adhérente", "Offre en cours", "Statut", "Naissance", "Activité principale", "Hobby", "Consentement photo", "Compte créé le"];
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
    c.prenom, c.nom, c.email, c.telephone ?? "", c.role, c.numeroAdherente, c.offres, c.actif ? "Actif" : "Inactif",
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

/** Feuille déjà mise en forme (cellules, largeurs, orientation) : par ex. une feuille d'émargement. */
export interface FeuilleMiseEnForme {
  nom: string;
  cellules: (Record<string, unknown> | null)[][];
  largeurs: number[];
  orientation?: "portrait" | "landscape";
  /**
   * Réglages d'impression (ajoutés au fichier après coup, la bibliothèque ne les gère pas) :
   * tenir sur une page en largeur, marges réduites, tableau centré, et répéter en haut de chaque page
   * la ligne n° `ligneRepetee` (en-tête du tableau).
   */
  impression?: { ligneRepetee: number };
}
type Feuille = { nom: string; tableau: Tableau } | FeuilleMiseEnForme;

/** Fabrique le fichier .xlsx (tableaux vides omis, au moins une feuille). */
export const fichierExcel = async (feuilles: Feuille[]): Promise<Blob> => {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const utiles = feuilles.filter((f, i) => !("tableau" in f) || f.tableau.length > 1 || i === 0);
  const sheets = utiles.map(f => ("tableau" in f
    ? {
      sheet: f.nom,
      data: f.tableau.map((ligne, n) => ligne.map(v => (n === 0 ? { value: v, fontWeight: "bold" as const } : { value: v }))),
      columns: largeurs(f.tableau),
      stickyRowsCount: 1,
    }
    : { sheet: f.nom, data: f.cellules, columns: f.largeurs.map(width => ({ width })), orientation: f.orientation ?? "portrait" }));
  // Les cellules mises en forme suivent le format de write-excel-file (value, fontWeight, borderStyle…).
  const blob = await writeXlsxFile(sheets as Parameters<typeof writeXlsxFile>[0]).toBlob();
  const aImprimer = utiles.map((f, i) => ({ i, nom: f.nom, impression: "tableau" in f ? undefined : f.impression }));
  if (!aImprimer.some(f => f.impression)) return blob;
  return reglerImpression(blob, aImprimer);
};

/** Ajoute à un .xlsx les réglages d'impression des feuilles qui en demandent (voir FeuilleMiseEnForme.impression). */
export const reglerImpression = async (
  blob: Blob,
  feuilles: { i: number; nom: string; impression?: { ligneRepetee: number } }[],
): Promise<Blob> => {
  const { unzipSync, zipSync, strFromU8, strToU8 } = await import("fflate");
  const fichiers = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const titres: string[] = [];
  for (const f of feuilles) {
    if (!f.impression) continue;
    const chemin = `xl/worksheets/sheet${f.i + 1}.xml`;
    if (!fichiers[chemin]) continue;
    const xml = strFromU8(fichiers[chemin])
      // <sheetPr> doit être le premier élément de <worksheet>.
      .replace(/(<worksheet[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>')
      .replace(/<pageMargins[^>]*\/>/, '<printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>')
      .replace(/<pageSetup /, '<pageSetup fitToWidth="1" fitToHeight="0" ');
    fichiers[chemin] = strToU8(xml);
    const n = f.impression.ligneRepetee;
    titres.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${f.i}">'${f.nom.replace(/'/g, "''")}'!$${n}:$${n}</definedName>`);
  }
  if (titres.length && fichiers["xl/workbook.xml"]) {
    const wb = strFromU8(fichiers["xl/workbook.xml"]);
    fichiers["xl/workbook.xml"] = strToU8(
      wb.includes("<definedNames/>") ? wb.replace("<definedNames/>", `<definedNames>${titres.join("")}</definedNames>`)
        : wb.replace("</definedNames>", `${titres.join("")}</definedNames>`),
    );
  }
  return new Blob([zipSync(fichiers)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
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
