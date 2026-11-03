// Contenu public des offres d'adhésion (page « Nos offres », section de l'accueil, aperçu de l'administration).
// Les formules sont lues dans la table `formules` ; les colonnes de contenu (rythme, prix barré, activités, ce qui
// est compris, mise en avant) viennent de la migration 20261103000000 : tant qu'elles manquent, la carte s'affiche
// avec le seul nom, le prix et la description.

export type SlugEspaceOffre = "papotages" | "creatifs" | "business";

export const ESPACES_OFFRE: Record<SlugEspaceOffre, string> = {
  papotages: "Papotages",
  creatifs: "Créatifs",
  business: "Business",
};

export interface ActiviteOffre {
  nom: string;
  lieu: string;
  espace: SlugEspaceOffre;
}

export interface OffrePublique {
  id: string;
  nom: string;
  description: string | null;
  couleur: string;
  prix: number;
  duree_mois: number;
  lien_helloasso: string | null;
  ordre: number;
  rythme: string | null;
  prix_barre: number | null;
  mise_en_avant: boolean;
  activites: ActiviteOffre[];
  compris: string[];
}

export interface QuestionBonASavoir {
  id: string;
  question: string;
  reponse: string;
  est_publiee: boolean;
  ordre: number;
}

const estSlug = (v: unknown): v is SlugEspaceOffre => typeof v === "string" && v in ESPACES_OFFRE;

/** Activités lues en base (JSON libre) : on ne garde que les lignes qui ont un nom. */
export const lireActivites = (valeur: unknown): ActiviteOffre[] =>
  Array.isArray(valeur)
    ? valeur
        .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
        .map(a => ({
          nom: typeof a.nom === "string" ? a.nom.trim() : "",
          lieu: typeof a.lieu === "string" ? a.lieu.trim() : "",
          espace: estSlug(a.espace) ? a.espace : "papotages",
        }))
        .filter(a => a.nom)
    : [];

const nombreOuNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Ligne de la table `formules` (colonnes de contenu éventuellement absentes) → offre affichable. */
export const versOffre = (ligne: Record<string, unknown>): OffrePublique => ({
  id: String(ligne.id ?? ""),
  nom: String(ligne.nom ?? ""),
  description: typeof ligne.description === "string" && ligne.description.trim() ? ligne.description : null,
  couleur: String(ligne.couleur ?? "terracotta"),
  prix: nombreOuNull(ligne.prix) ?? 0,
  duree_mois: nombreOuNull(ligne.duree_mois) ?? 12,
  lien_helloasso: typeof ligne.lien_helloasso === "string" && ligne.lien_helloasso.trim() ? ligne.lien_helloasso.trim() : null,
  ordre: nombreOuNull(ligne.ordre) ?? 0,
  rythme: typeof ligne.rythme === "string" && ligne.rythme.trim() ? ligne.rythme.trim() : null,
  prix_barre: nombreOuNull(ligne.prix_barre),
  mise_en_avant: ligne.mise_en_avant === true,
  activites: lireActivites(ligne.activites),
  compris: Array.isArray(ligne.compris) ? ligne.compris.filter((c): c is string => typeof c === "string" && !!c.trim()) : [],
});

/** Prix barré à afficher : seulement s'il est supérieur au prix. */
export const prixBarreAffiche = (offre: Pick<OffrePublique, "prix" | "prix_barre">): number | null =>
  offre.prix_barre !== null && offre.prix_barre > offre.prix ? offre.prix_barre : null;

/** Économie affichée à côté du prix barré (« 30 € d'économie »), ou null. */
export const economie = (offre: Pick<OffrePublique, "prix" | "prix_barre">): number | null => {
  const barre = prixBarreAffiche(offre);
  return barre === null ? null : Math.round((barre - offre.prix) * 100) / 100;
};

/** Montant en euros sans décimales inutiles : 80 → « 80 € », 12,5 → « 12,50 € ». */
export const montant = (n: number): string =>
  Number.isInteger(n) ? `${n} €` : `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** Une ligne par point, lignes vides retirées (champ « Ce qui est compris » de l'administration). */
export const lignesCompris = (texte: string): string[] =>
  texte.split("\n").map(l => l.trim()).filter(Boolean);

/** Un lieu « à définir » n'a pas de lien vers la carte. */
export const lieuSurCarte = (lieu: string): boolean => !!lieu.trim() && !/à définir/i.test(lieu);

/** Ordre d'affichage : colonne `ordre`, puis prix. */
export const trierOffres = <T extends Pick<OffrePublique, "ordre" | "prix">>(offres: T[]): T[] =>
  [...offres].sort((a, b) => a.ordre - b.ordre || a.prix - b.prix);

/** Questions publiées, dans l'ordre choisi par les administratrices. */
export const questionsPubliees = (questions: QuestionBonASavoir[]): QuestionBonASavoir[] =>
  questions.filter(q => q.est_publiee && q.question.trim()).sort((a, b) => a.ordre - b.ordre);

/** Échange la position de deux questions voisines (flèches ▲ ▼ de l'administration) ; renvoie les ordres à écrire. */
export const deplacer = (
  questions: QuestionBonASavoir[],
  id: string,
  sens: -1 | 1,
): { id: string; ordre: number }[] => {
  const liste = [...questions].sort((a, b) => a.ordre - b.ordre);
  const i = liste.findIndex(q => q.id === id);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= liste.length) return [];
  [liste[i], liste[j]] = [liste[j], liste[i]];
  return liste.map((q, k) => ({ id: q.id, ordre: k + 1 })).filter(({ id: qid, ordre }) => questions.find(q => q.id === qid)?.ordre !== ordre);
};
