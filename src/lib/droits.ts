// Droits liés aux offres (Business, Créatif, Complet) : un atelier est gratuit, inclus dans l'adhésion ou à payer.
//
// Source de vérité : adhésion en cours → formule → espaces couverts → espace de l'atelier.
// Le rôle (inscrit / membre / administrateur) ne décide que de l'accès aux pages.
// Cette règle est aussi imposée par la base (fonction atelier_inclus et déclencheur sur les inscriptions) :
// ce fichier ne sert qu'à l'affichage et doit rester identique à la fonction SQL.

export interface EspaceDroit {
  id: string;
  nom: string;
  slug: string;
  /** Colonne ajoutée par la migration « droits par offre » ; absente avant. */
  gratuit_pour_tous?: boolean | null;
}

export interface OffreEnCours {
  formule_id: string;
  nom: string;
  couleur: string;
  /** Identifiants des espaces couverts par la formule. */
  espaces: string[];
  valable_jusqu_au: string;
}

/** Avant la migration, seul Papotages est gratuit pour tous (règle du club). */
export const estGratuitPourTous = (espace: EspaceDroit | undefined): boolean =>
  espace ? espace.gratuit_pour_tous ?? espace.slug === "papotages" : false;

export const espacesCouverts = (offres: OffreEnCours[]): Set<string> => new Set(offres.flatMap(o => o.espaces));

export type EtatDroit = "gratuit" | "inclus" | "a_payer";

export interface DroitAtelier {
  etat: EtatDroit;
  /** Tarif de l'atelier, en euros (0 si gratuit ou inclus). */
  montant: number;
}

/**
 * Prix à régler par la personne : une adhérente (au moins une adhésion en cours) paie le tarif adhérente
 * lorsqu'il est renseigné, même pour un espace que sa formule ne couvre pas ; sinon le tarif standard
 * (non-adhérente). Tarif adhérente absent : même prix pour tout le monde.
 */
export const tarifPour = (
  atelier: { tarif_standard: number | null; tarif_adherent?: number | null },
  offres: OffreEnCours[],
): number | null => (offres.length > 0 && atelier.tarif_adherent != null ? atelier.tarif_adherent : atelier.tarif_standard);

export const droitAtelier = (
  atelier: { espace_id: string | null; tarif_standard: number | null; tarif_adherent?: number | null },
  espaces: EspaceDroit[],
  offres: OffreEnCours[],
): DroitAtelier => {
  const tarif = tarifPour(atelier, offres);
  if (tarif !== null && tarif <= 0) return { etat: "gratuit", montant: 0 };
  const espace = espaces.find(e => e.id === atelier.espace_id);
  if (estGratuitPourTous(espace)) return { etat: "gratuit", montant: 0 };
  if (atelier.espace_id && espacesCouverts(offres).has(atelier.espace_id)) return { etat: "inclus", montant: 0 };
  return { etat: "a_payer", montant: tarif ?? 0 };
};

export const LIBELLES_DROIT: Record<EtatDroit, string> = {
  gratuit: "Gratuit pour tous",
  inclus: "Inclus dans votre adhésion",
  a_payer: "À régler",
};

export const euros = (montant: number) => `${Number.isInteger(montant) ? montant : montant.toLocaleString("fr-FR")} €`;

/** « Cocooning Créatif » → « Créatif ». */
export const nomCourtOffre = (nom: string) => nom.replace(/^Cocooning\s+/i, "");

/** Adhésions actives non échues → offres en cours (les adhésions cumulées donnent la réunion de leurs espaces). */
export const offresEnCours = (
  lignes: {
    statut: string;
    valable_jusqu_au: string | null;
    formules: { id: string; nom: string; couleur: string; formule_espaces: { espace_id: string }[] } | null;
  }[],
  aujourdhui: string,
): OffreEnCours[] =>
  lignes
    .filter(l => l.statut === "active" && l.valable_jusqu_au !== null && l.valable_jusqu_au >= aujourdhui && l.formules)
    .map(l => ({
      formule_id: l.formules!.id,
      nom: l.formules!.nom,
      couleur: l.formules!.couleur,
      espaces: l.formules!.formule_espaces.map(fe => fe.espace_id),
      valable_jusqu_au: l.valable_jusqu_au as string,
    }));

// ── Offres simulées (espace créateur) : les formules du bulletin d'adhésion ──

export type OffreSimulee = "aucune" | "business" | "creatif" | "complet";

export const OFFRES_SIMULABLES: { code: OffreSimulee; libelle: string; formule: string; couleur: string; slugs: string[] }[] = [
  { code: "business", libelle: "Adhérente Business", formule: "Cocooning Business", couleur: "mauve", slugs: ["business"] },
  { code: "creatif", libelle: "Adhérente Créatif", formule: "Cocooning Créatif", couleur: "sauge", slugs: ["creatifs"] },
  { code: "complet", libelle: "Adhérente Complet", formule: "Cocooning Complet", couleur: "terracotta", slugs: ["business", "creatifs"] },
];

export const estOffreSimulee = (valeur: unknown): valeur is OffreSimulee =>
  valeur === "aucune" || OFFRES_SIMULABLES.some(o => o.code === valeur);

/** Offre en cours fictive pour la simulation (un an de validité). */
export const offreSimulee = (code: OffreSimulee | null, espaces: EspaceDroit[], fin: string): OffreEnCours[] => {
  const o = OFFRES_SIMULABLES.find(x => x.code === code);
  if (!o) return [];
  return [{
    formule_id: `simulation-${o.code}`,
    nom: o.formule,
    couleur: o.couleur,
    espaces: espaces.filter(e => o.slugs.includes(e.slug)).map(e => e.id),
    valable_jusqu_au: fin,
  }];
};
