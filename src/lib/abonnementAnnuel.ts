// Simulateur « abonnement à l'année ou ateliers à l'unité ? » (espace créateur, 17/11), un réglage par espace.
// Côté participante : ce que coûte l'année avec l'abonnement (plus la consommation obligatoire sur place) ou en payant
// chaque atelier à l'unité. Côté association : abonnements et ateliers payés à l'unité, contre la location de la salle.
// La consommation est réglée par la participante au lieu d'accueil : ce n'est pas une recette de l'association.
// Tout se calcule dans le navigateur ; rien n'est enregistré en base.

export type EspaceSimule = "papotages" | "creatifs" | "business";

export const ESPACES_SIMULES: { valeur: EspaceSimule; libelle: string }[] = [
  { valeur: "papotages", libelle: "Papotages" },
  { valeur: "creatifs", libelle: "Créatifs" },
  { valeur: "business", libelle: "Business" },
];

export interface ParametresAbonnement {
  /** Prix de l'abonnement (adhésion) à l'année. */
  abonnement: number;
  /** Prix d'un atelier payé à l'unité (non-adhérente). */
  prixAtelier: number;
  /** Nombre d'ateliers de l'espace dans l'année. */
  ateliersParAn: number;
  /** Consommation obligatoire sur place, par venue (atelier ou coworking). */
  consommation: number;
  /** Séances de coworking gratuites pour les adhérentes (Business), dans l'année. */
  coworkingParAn: number;
  /** Location de la salle, par atelier (à la charge de l'association). */
  salleParAtelier: number;
  /** Location de la salle par séance de coworking (0 si le lieu ne fait rien payer). */
  salleParCoworking: number;
  /** Nombre d'adhérentes de l'espace (abonnements vendus). */
  adherentes: number;
  /** Non-adhérentes par atelier, en moyenne (elles paient l'atelier à l'unité). */
  nonAdherentesParAtelier: number;
}

/** Valeurs d'exemple (dont l'exemple donné le 17/11 : abonnement 80 €, atelier Business 15 €, salle 40 €). */
export const EXEMPLES_ABONNEMENT: Record<EspaceSimule, ParametresAbonnement> = {
  papotages: { abonnement: 80, prixAtelier: 10, ateliersParAn: 12, consommation: 5, coworkingParAn: 0, salleParAtelier: 40, salleParCoworking: 0, adherentes: 10, nonAdherentesParAtelier: 3 },
  creatifs: { abonnement: 80, prixAtelier: 15, ateliersParAn: 12, consommation: 5, coworkingParAn: 0, salleParAtelier: 40, salleParCoworking: 0, adherentes: 10, nonAdherentesParAtelier: 3 },
  business: { abonnement: 80, prixAtelier: 15, ateliersParAn: 12, consommation: 5, coworkingParAn: 12, salleParAtelier: 40, salleParCoworking: 0, adherentes: 10, nonAdherentesParAtelier: 3 },
};

export interface ResultatAbonnement {
  /** Année d'une adhérente : abonnement + consommations des ateliers et du coworking. */
  adherenteTotal: number;
  adherenteConsommations: number;
  /** Année d'une non-adhérente qui vient aux mêmes ateliers : ateliers à l'unité + consommations (pas de coworking). */
  nonAdherenteTotal: number;
  nonAdherenteAteliers: number;
  nonAdherenteConsommations: number;
  /** Ce que l'adhérente économise sur les mêmes ateliers (consommation comprise des deux côtés), coworking offert en plus. */
  economie: number;
  /** Nombre d'ateliers à partir duquel l'abonnement revient moins cher que l'unité (null si l'atelier est gratuit). */
  seuilAteliers: number | null;
  /** Côté association, sur l'année. */
  recettesAbonnements: number;
  recettesUnite: number;
  recettesTotal: number;
  coutSalle: number;
  solde: number;
}

const arrondi = (n: number) => Math.round(n * 100) / 100;

export const calculerAbonnement = (p: ParametresAbonnement): ResultatAbonnement => {
  const adherenteConsommations = (p.ateliersParAn + p.coworkingParAn) * p.consommation;
  const adherenteTotal = p.abonnement + adherenteConsommations;
  const nonAdherenteAteliers = p.ateliersParAn * p.prixAtelier;
  const nonAdherenteConsommations = p.ateliersParAn * p.consommation;
  const nonAdherenteTotal = nonAdherenteAteliers + nonAdherenteConsommations;
  // Même nombre d'ateliers des deux côtés : la consommation s'annule, il reste abonnement contre ateliers à l'unité.
  const economie = nonAdherenteAteliers - p.abonnement;
  const seuilAteliers = p.prixAtelier > 0 ? Math.floor(p.abonnement / p.prixAtelier) + 1 : null;

  const recettesAbonnements = p.adherentes * p.abonnement;
  const recettesUnite = p.nonAdherentesParAtelier * p.prixAtelier * p.ateliersParAn;
  const recettesTotal = recettesAbonnements + recettesUnite;
  const coutSalle = p.salleParAtelier * p.ateliersParAn + p.salleParCoworking * p.coworkingParAn;

  return {
    adherenteTotal: arrondi(adherenteTotal),
    adherenteConsommations: arrondi(adherenteConsommations),
    nonAdherenteTotal: arrondi(nonAdherenteTotal),
    nonAdherenteAteliers: arrondi(nonAdherenteAteliers),
    nonAdherenteConsommations: arrondi(nonAdherenteConsommations),
    economie: arrondi(economie),
    seuilAteliers,
    recettesAbonnements: arrondi(recettesAbonnements),
    recettesUnite: arrondi(recettesUnite),
    recettesTotal: arrondi(recettesTotal),
    coutSalle: arrondi(coutSalle),
    solde: arrondi(recettesTotal - coutSalle),
  };
};
