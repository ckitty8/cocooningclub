// Vue calendrier des ateliers (écran admin « Ateliers »).

export const MOIS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
export const JOURS_COURTS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

/** Couleur de chaque espace (charte graphique). */
export const COULEUR_ESPACE: Record<string, string> = {
  papotages: "#ce8f7e",
  creatifs: "#6f8567",
  business: "#9e6678",
};
export const couleurEspace = (slug: string | null | undefined): string => COULEUR_ESPACE[slug ?? ""] ?? "#8a6a62";

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDuJour = (annee: number, mois: number, jour: number) => `${annee}-${pad(mois + 1)}-${pad(jour)}`;

/** Cases d'un mois, semaine commençant le lundi ; `null` pour les cases vides avant et après. mois : 0 à 11. */
export const casesDuMois = (annee: number, mois: number): (string | null)[] => {
  const premier = new Date(annee, mois, 1).getDay(); // 0 = dimanche
  const decalage = premier === 0 ? 6 : premier - 1;
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const cases: (string | null)[] = Array(decalage).fill(null);
  for (let j = 1; j <= nbJours; j++) cases.push(isoDuJour(annee, mois, j));
  while (cases.length % 7 !== 0) cases.push(null);
  return cases;
};

export const moisSuivant = (annee: number, mois: number, pas: 1 | -1): { annee: number; mois: number } => {
  const total = annee * 12 + mois + pas;
  return { annee: Math.floor(total / 12), mois: ((total % 12) + 12) % 12 };
};

/** Indicateurs de la page « Ateliers » : ateliers à venir, places libres, brouillons. */
export const chiffresAteliers = (
  ateliers: { date_atelier: string; statut: string; places_disponibles: number }[],
  aujourdhui: string,
) => {
  const aVenir = ateliers.filter(a => a.date_atelier >= aujourdhui && (a.statut === "publie" || a.statut === "complet"));
  return {
    aVenir: aVenir.length,
    placesLibres: aVenir.reduce((somme, a) => somme + Math.max(0, a.places_disponibles), 0),
    brouillons: ateliers.filter(a => a.statut === "brouillon").length,
  };
};

export interface PeriodeVacances {
  id: string;
  nom: string;
  date_debut: string;
  date_fin: string;
}

/** Période de vacances scolaires qui couvre ce jour (dates incluses), s'il y en a une. */
export const vacancesDuJour = (vacances: PeriodeVacances[], iso: string): PeriodeVacances | undefined =>
  vacances.find(v => iso >= v.date_debut && iso <= v.date_fin);
