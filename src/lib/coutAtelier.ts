// Simulateur de coût d'atelier (espace créateur) : coûts du lieu, du matériel, de l'animation…, recettes selon le
// public (non-adhérentes, adhérentes qui règlent, adhérentes dont l'atelier est inclus), résultat et seuil de rentabilité.
// Tout se calcule dans le navigateur ; rien n'est enregistré en base.

export type ModeCout = "atelier" | "participante";

export interface LigneCout {
  id: string;
  libelle: string;
  /** Montant en euros. */
  montant: number;
  /** « atelier » : une fois par atelier (lieu, animation) ; « participante » : multiplié par le nombre de participantes (matériel, collation). */
  mode: ModeCout;
}

export interface ParametresCout {
  lignes: LigneCout[];
  /** Tarif non-adhérente. */
  tarifStandard: number;
  /** Tarif adhérente (adhérente dont l'espace n'est pas inclus). */
  tarifAdherente: number;
  nonAdherentes: number;
  adherentesPayantes: number;
  /** Adhérentes dont l'atelier est inclus dans la formule : elles ne règlent rien pour cet atelier. */
  adherentesIncluses: number;
  /** Frais prélevés sur les recettes (moyen de paiement), en %. */
  fraisPaiementPct: number;
  /** Marge visée au-dessus des coûts, en % (0 = juste couvrir les coûts). */
  margeCiblePct: number;
  /** Places de l'atelier : sert aux scénarios de remplissage. */
  capacite: number;
}

export interface ResultatCout {
  participantes: number;
  payantes: number;
  coutsFixes: number;
  coutVariableParParticipante: number;
  coutsVariables: number;
  coutTotal: number;
  recettesBrutes: number;
  fraisPaiement: number;
  recettesNettes: number;
  /** Recettes nettes − coûts. */
  resultat: number;
  /** Coût de revient d'une participante ; null sans participante. */
  coutParParticipante: number | null;
  /** Nombre de participantes à partir duquel l'atelier couvre ses coûts (même répartition du public) ; null s'il ne les couvre jamais. */
  seuilParticipantes: number | null;
  /** Prix moyen à demander à chaque participante qui règle pour atteindre la marge visée ; null si personne ne règle. */
  prixMoyenConseille: number | null;
}

/** Nombre positif et fini, sinon 0 (saisies vides ou absurdes). */
export const positif = (valeur: unknown): number => {
  const n = typeof valeur === "number" ? valeur : Number(valeur);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const arrondi2 = (n: number) => Math.round(n * 100) / 100;

export const calculerCout = (p: ParametresCout): ResultatCout => {
  const nonAdherentes = Math.floor(positif(p.nonAdherentes));
  const adherentesPayantes = Math.floor(positif(p.adherentesPayantes));
  const adherentesIncluses = Math.floor(positif(p.adherentesIncluses));
  const participantes = nonAdherentes + adherentesPayantes + adherentesIncluses;
  const payantes = nonAdherentes + adherentesPayantes;

  const coutsFixes = p.lignes.filter(l => l.mode === "atelier").reduce((s, l) => s + positif(l.montant), 0);
  const coutVariableParParticipante = p.lignes.filter(l => l.mode === "participante").reduce((s, l) => s + positif(l.montant), 0);
  const coutsVariables = coutVariableParParticipante * participantes;
  const coutTotal = coutsFixes + coutsVariables;

  const frais = Math.min(positif(p.fraisPaiementPct), 100) / 100;
  const recettesBrutes = nonAdherentes * positif(p.tarifStandard) + adherentesPayantes * positif(p.tarifAdherente);
  const fraisPaiement = recettesBrutes * frais;
  const recettesNettes = recettesBrutes - fraisPaiement;

  // Seuil : recette nette moyenne par participante (public de même composition) − coût variable = contribution aux coûts fixes.
  let seuilParticipantes: number | null = null;
  if (participantes > 0) {
    const contribution = recettesNettes / participantes - coutVariableParParticipante;
    if (coutsFixes === 0) seuilParticipantes = contribution >= 0 ? 0 : null;
    else if (contribution > 0) seuilParticipantes = Math.ceil(coutsFixes / contribution - 1e-9);
  }

  const marge = positif(p.margeCiblePct) / 100;
  const prixMoyenConseille = payantes > 0 && frais < 1
    ? arrondi2((coutTotal * (1 + marge)) / (1 - frais) / payantes)
    : null;

  return {
    participantes, payantes, coutsFixes, coutVariableParParticipante, coutsVariables, coutTotal,
    recettesBrutes, fraisPaiement, recettesNettes,
    resultat: recettesNettes - coutTotal,
    coutParParticipante: participantes > 0 ? coutTotal / participantes : null,
    seuilParticipantes,
    prixMoyenConseille,
  };
};

export interface LigneScenario {
  participantes: number;
  coutTotal: number;
  recettesNettes: number;
  resultat: number;
}

/** Remplissages à comparer : le minimum de l'atelier (5), la moitié, les trois quarts et le complet. */
export const niveauxDeRemplissage = (capacite: number): number[] => {
  const cap = Math.floor(positif(capacite));
  if (cap < 1) return [];
  const niveaux = new Set<number>([5, Math.round(cap / 2), Math.round((cap * 3) / 4), cap].filter(n => n >= 1 && n <= cap));
  return [...niveaux].sort((a, b) => a - b);
};

/** Résultat pour d'autres niveaux de remplissage, en gardant la répartition du public saisie. */
export const scenariosDeRemplissage = (p: ParametresCout, niveaux: number[]): LigneScenario[] => {
  const base = calculerCout(p);
  if (base.participantes === 0) return [];
  const partNon = Math.floor(positif(p.nonAdherentes)) / base.participantes;
  const partPayantes = Math.floor(positif(p.adherentesPayantes)) / base.participantes;
  return niveaux.map(n => {
    const non = Math.round(n * partNon);
    const payantes = Math.min(Math.round(n * partPayantes), n - non);
    const r = calculerCout({ ...p, nonAdherentes: non, adherentesPayantes: payantes, adherentesIncluses: n - non - payantes });
    return { participantes: n, coutTotal: r.coutTotal, recettesNettes: r.recettesNettes, resultat: r.resultat };
  });
};
