// Regroupement des pré-inscriptions par atelier (page admin « Pré-inscriptions »).

export type FiltreStatut = "en_attente" | "confirme" | "annule" | "tous";
export type Periode = "avenir" | "passes";

export interface AtelierGroupable {
  id: string;
  date_atelier: string;
}

export interface InscriptionGroupable {
  atelier_id: string;
  statut: string;
}

export interface GroupeAtelier<A, I> {
  atelier: A;
  /** Lignes visibles (après filtre de statut et recherche). */
  items: I[];
  /** Pré-inscriptions « en attente » de l'atelier, quels que soient les filtres. */
  aTraiter: number;
  /** Toutes les pré-inscriptions de l'atelier. */
  total: number;
}

export const periodeDe = (dateAtelier: string, aujourdhui: string): Periode => (dateAtelier >= aujourdhui ? "avenir" : "passes");

interface Options<I> {
  filtre: FiltreStatut;
  periode: Periode;
  /** AAAA-MM-JJ. */
  aujourdhui: string;
  recherche: string;
  /** Texte interrogé par la recherche (nom, e-mail, titre de l'atelier…). */
  texte: (inscription: I) => string;
  /** Atelier toujours affiché, même sans pré-inscription visible (arrivée depuis « Inscrits »). */
  cible?: string | null;
}

/** Groupes d'ateliers à afficher : à venir par date croissante, passés par date décroissante. */
export const grouperParAtelier = <A extends AtelierGroupable, I extends InscriptionGroupable>(
  inscriptions: I[],
  ateliers: A[],
  { filtre, periode, aujourdhui, recherche, texte, cible }: Options<I>,
): GroupeAtelier<A, I>[] => {
  const q = recherche.trim().toLowerCase();
  const groupes = ateliers
    .filter(a => periodeDe(a.date_atelier, aujourdhui) === periode || a.id === cible)
    .map(atelier => {
      const toutes = inscriptions.filter(i => i.atelier_id === atelier.id);
      const items = toutes.filter(i => (filtre === "tous" || i.statut === filtre) && (!q || texte(i).toLowerCase().includes(q)));
      return { atelier, items, aTraiter: toutes.filter(i => i.statut === "en_attente").length, total: toutes.length };
    })
    .filter(g => g.items.length > 0 || g.atelier.id === cible);
  const sens = periode === "avenir" ? 1 : -1;
  return groupes.sort((a, b) => sens * a.atelier.date_atelier.localeCompare(b.atelier.date_atelier));
};
