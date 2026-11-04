// Export Excel des inscrites d'un atelier, avec tout ce qu'elles ont renseigné dans le formulaire.
// Utilisé par Pré-inscriptions (un bouton par atelier) et par la fiche d'un atelier.
import type { Tableau } from "./exportMembres";

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
