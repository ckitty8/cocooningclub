// Export Excel des inscrites d'un atelier, avec tout ce qu'elles ont renseigné dans le formulaire.
// Utilisé par Pré-inscriptions (un bouton par atelier) et par la fiche d'un atelier.
import type { FeuilleMiseEnForme, Tableau } from "./exportMembres";

export interface InscriteExport {
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  /** « Membre », « Admin », « Inscrit » ou « Sans compte ». */
  compte: string;
  /** « Gratuit », « Inclus », « À payer · 25 € » ; vide si inconnu. */
  tarif?: string;
  statut: "en_attente" | "confirme" | "annule";
  statutPaiement: "en_attente" | "paye" | "non_requis";
  autorisationImage: boolean | null | undefined;
  accordWhatsapp: boolean | null | undefined;
  dateNaissance: string | null;
  recueLe: string;
  /** Présence (fiche d'atelier) : undefined = colonne absente. */
  presente?: boolean | null;
  /** Consentement photo du bulletin d'adhésion (fiche d'atelier) : undefined = colonne absente. */
  consentementBulletin?: string;
}

const STATUTS = { en_attente: "En attente", confirme: "Validée", annule: "Refusée" } as const;
const PAIEMENTS = { en_attente: "Non payé", paye: "Payé", non_requis: "Gratuit" } as const;

const jjmmaaaa = (iso: string | null | undefined) => {
  if (!iso) return "";
  const [a, m, j] = iso.slice(0, 10).split("-");
  return a && m && j ? `${j}/${m}/${a}` : "";
};
const dateHeure = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const reponse = (v: boolean | null | undefined, oui: string, non: string) => (v == null ? "Pas de réponse" : v ? oui : non);

/**
 * Une ligne d'en-tête puis une ligne par inscrite. Colonnes facultatives (tarif, date de naissance, présence)
 * ajoutées seulement si au moins une ligne les renseigne.
 */
export const tableauInscrites = (lignes: InscriteExport[]): Tableau => {
  const avecTarif = lignes.some(l => l.tarif);
  const avecNaissance = lignes.some(l => l.dateNaissance);
  const avecPresence = lignes.some(l => l.presente !== undefined);
  const avecBulletin = lignes.some(l => l.consentementBulletin !== undefined);
  const entete = [
    "Prénom", "Nom", "E-mail", "Téléphone", "Compte", ...(avecTarif ? ["Tarif"] : []), "Statut", "Paiement",
    ...(avecPresence ? ["Présente"] : []), "Droit à l'image", "Groupe WhatsApp", ...(avecBulletin ? ["Consentement photo (bulletin)"] : []),
    ...(avecNaissance ? ["Date de naissance"] : []), "Reçue le",
  ];
  return [
    entete,
    ...lignes.map(l => [
      l.prenom, l.nom, l.email ?? "", l.telephone ?? "", l.compte, ...(avecTarif ? [l.tarif ?? ""] : []),
      STATUTS[l.statut], PAIEMENTS[l.statutPaiement],
      ...(avecPresence ? [l.presente ? "Oui" : "Non"] : []),
      reponse(l.autorisationImage, "Autorise", "N'autorise pas"), reponse(l.accordWhatsapp, "Accepte", "N'accepte pas"),
      ...(avecBulletin ? [l.consentementBulletin ?? ""] : []),
      ...(avecNaissance ? [jjmmaaaa(l.dateNaissance)] : []),
      dateHeure(l.recueLe),
    ]),
  ];
};

/** « inscrites-journee-creation-instagram-2026-11-05.xlsx » (titre sans accents ni signes). */
export const nomFichierInscrites = (titre: string, dateAtelier: string | null) => {
  const slug = titre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "atelier";
  return `inscrites-${slug}${dateAtelier ? `-${dateAtelier.slice(0, 10)}` : ""}.xlsx`;
};

/** Nom de feuille Excel : 31 caractères au plus, sans : \ / ? * [ ]. */
export const nomFeuille = (titre: string) => (titre.replace(/[:\\/?*[\]]/g, " ").trim().slice(0, 31) || "Inscrites");

// ── Feuille d'émargement ─────────────────────────────────────────────────────

export interface AtelierEmargement {
  titre: string;
  /** « Jeudi 5 novembre 2026 · 10:00 – 17:00 · La Picorette » */
  sousTitre: string;
}

export interface LigneEmargement {
  prenom: string;
  nom: string;
  telephone: string | null;
  autorisationImage: boolean | null | undefined;
  /** « Payé », « À régler · 15 € »… ; vide si rien à régler. */
  paiement: string;
}

/** Lignes vides en bas de la feuille, pour les participantes venues sans pré-inscription. */
export const LIGNES_LIBRES = 5;

const tri = (a: LigneEmargement, b: LigneEmargement) =>
  a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }) || a.prenom.localeCompare(b.prenom, "fr", { sensitivity: "base" });

/**
 * Feuille d'émargement prête à imprimer (A4 paysage) : titre, atelier, date / heure / lieu, puis un tableau
 * N° · Nom · Prénom · Téléphone · Droit à l'image · (Paiement) · Signature, trié par nom, avec des lignes
 * libres à la fin. La colonne Paiement n'apparaît que si au moins une participante a quelque chose à régler.
 */
export const feuilleEmargement = (atelier: AtelierEmargement, lignes: LigneEmargement[]): FeuilleMiseEnForme => {
  const avecPaiement = lignes.some(l => l.paiement);
  const entete = ["N°", "Nom", "Prénom", "Téléphone", "Droit à l'image", ...(avecPaiement ? ["Paiement"] : []), "Signature"];
  const largeurs = [5, 22, 17, 15, 14, ...(avecPaiement ? [15] : []), avecPaiement ? 36 : 46];
  const nb = entete.length;
  const bord = { borderStyle: "thin", borderColor: "#7a6a64", alignVertical: "center" } as const;
  const ligneTitre = (value: string, opts: Record<string, unknown>) =>
    [{ value, columnSpan: nb, ...opts }, ...Array<null>(nb - 1).fill(null)];

  const triees = [...lignes].sort(tri);
  const corps = triees.map((l, i) => [
    { value: i + 1, align: "center", height: 27, ...bord },
    { value: l.nom.toUpperCase(), fontWeight: "bold", ...bord },
    { value: l.prenom, ...bord },
    { value: l.telephone ?? "", ...bord },
    l.autorisationImage == null
      ? { value: "—", align: "center", ...bord }
      : l.autorisationImage
        ? { value: "Oui", align: "center", ...bord }
        : { value: "Non", align: "center", fontWeight: "bold", textColor: "#b42318", ...bord },
    ...(avecPaiement ? [{ value: l.paiement, wrap: true, ...bord }] : []),
    { value: "", ...bord },
  ]);
  const libres = Array.from({ length: LIGNES_LIBRES }, (_, i) => [
    { value: triees.length + i + 1, align: "center", height: 27, textColor: "#7a6a64", ...bord },
    ...Array.from({ length: nb - 1 }, () => ({ value: "", ...bord })),
  ]);

  return {
    nom: "Émargement",
    orientation: "landscape",
    impression: { ligneRepetee: 6 }, // en-tête du tableau répété en haut de chaque page imprimée
    largeurs,
    cellules: [
      ligneTitre("Feuille d'émargement", { fontWeight: "bold", fontSize: 16, height: 26 }),
      ligneTitre(atelier.titre, { fontWeight: "bold", fontSize: 13, height: 20 }),
      ligneTitre(atelier.sousTitre, { height: 18 }),
      ligneTitre(`${triees.length} participante${triees.length > 1 ? "s" : ""} validée${triees.length > 1 ? "s" : ""} · Le Cocooning Club`, { textColor: "#7a6a64" }),
      ligneTitre("", {}),
      entete.map(value => ({ value, fontWeight: "bold", backgroundColor: "#f6dfd2", align: "center", height: 22, ...bord })),
      ...corps,
      ...libres,
      ligneTitre("Nombre de présentes : ________        Signature de l'animatrice : ____________________", { height: 22 }),
    ],
  };
};

/** « Jeudi 5 novembre 2026 · 10:00 – 17:00 · La Picorette » (parties absentes omises). */
export const sousTitreAtelier = (a: { date_atelier: string | null; heure_debut?: string | null; heure_fin?: string | null; lieu?: string | null }) => {
  const date = a.date_atelier
    ? new Date(`${a.date_atelier.slice(0, 10)}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "";
  const heure = a.heure_debut ? `${a.heure_debut.slice(0, 5)}${a.heure_fin ? ` – ${a.heure_fin.slice(0, 5)}` : ""}` : "";
  const texte = [date, heure, a.lieu ?? ""].filter(Boolean).join(" · ");
  return texte.charAt(0).toUpperCase() + texte.slice(1);
};

/** « emargement-journee-creation-instagram-2026-11-05.xlsx » */
export const nomFichierEmargement = (titre: string, dateAtelier: string | null) =>
  nomFichierInscrites(titre, dateAtelier).replace(/^inscrites-/, "emargement-");
