// Statistiques du tableau de bord des ateliers, recalculées à chaque changement de filtre.
// « Participantes » = deux colonnes, comme demandé le 06/11 : inscrites VALIDÉES et PRÉSENTES (case cochée).
import type { Creneau } from "./creneau";

export interface AtelierStat {
  id: string;
  titre: string;
  date_atelier: string;
  statut: string;
  places_max: number | null;
  places_disponibles: number | null;
  espace_id: string | null;
}

export interface InscriptionStat {
  atelier_id: string;
  statut: string;
  present: boolean | null;
  creneau?: string | null;
}

export type Periode = "a_venir" | "passes" | "mois" | "30_jours" | "annee" | "tout" | "personnalisee";

export const PERIODES: { valeur: Periode; libelle: string }[] = [
  { valeur: "a_venir", libelle: "À venir" },
  { valeur: "passes", libelle: "Passés" },
  { valeur: "30_jours", libelle: "30 derniers jours" },
  { valeur: "mois", libelle: "Ce mois-ci" },
  { valeur: "annee", libelle: "Cette année" },
  { valeur: "tout", libelle: "Tout" },
  { valeur: "personnalisee", libelle: "Dates choisies" },
];

export interface Filtres {
  periode: Periode;
  /** Pour « Dates choisies » : AAAA-MM-JJ, bornes incluses, vides = pas de borne. */
  du?: string;
  au?: string;
  /** Identifiants des espaces retenus ; vide = tous. */
  espaces: string[];
  brouillons: boolean;
  annules: boolean;
}

const decaler = (iso: string, jours: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + jours);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Bornes [du, au] (incluses, AAAA-MM-JJ ; null = pas de borne) de la période choisie. */
export const bornesPeriode = (f: Pick<Filtres, "periode" | "du" | "au">, aujourdhui: string): [string | null, string | null] => {
  switch (f.periode) {
    case "a_venir": return [aujourdhui, null];
    case "passes": return [null, decaler(aujourdhui, -1)];
    case "30_jours": return [decaler(aujourdhui, -30), decaler(aujourdhui, -1)];
    case "mois": return [`${aujourdhui.slice(0, 7)}-01`, decaler(`${decaler(`${aujourdhui.slice(0, 7)}-01`, 32).slice(0, 7)}-01`, -1)];
    case "annee": return [`${aujourdhui.slice(0, 4)}-01-01`, `${aujourdhui.slice(0, 4)}-12-31`];
    case "personnalisee": return [f.du || null, f.au || null];
    default: return [null, null];
  }
};

/** Ateliers retenus par les filtres (période, espaces, brouillons, annulés). */
export const filtrerAteliers = (ateliers: AtelierStat[], f: Filtres, aujourdhui: string): AtelierStat[] => {
  const [du, au] = bornesPeriode(f, aujourdhui);
  return ateliers.filter(a =>
    (!du || a.date_atelier >= du) && (!au || a.date_atelier <= au)
    && (f.espaces.length === 0 || (a.espace_id !== null && f.espaces.includes(a.espace_id)))
    && (f.brouillons || a.statut !== "brouillon")
    && (f.annules || a.statut !== "annule"),
  );
};

const arrondi = (n: number) => Math.round(n * 10) / 10;
const moyenne = (total: number, nb: number) => (nb > 0 ? arrondi(total / nb) : null);
const taux = (part: number, tout: number) => (tout > 0 ? Math.round((part / tout) * 100) : null);

export interface Totaux {
  ateliers: number;
  ateliersPasses: number;
  validees: number;
  presentes: number;
  aTraiter: number;
  /** Validées par atelier. */
  moyenneValidees: number | null;
  /** Présentes par atelier PASSÉ (la présence ne se coche qu'une fois l'atelier fait). */
  moyennePresentes: number | null;
  /** Validées / places, sur les ateliers à nombre de places limité (en %). */
  tauxRemplissage: number | null;
  /** Présentes / validées, sur les ateliers passés (en %). */
  tauxPresence: number | null;
  /** Places libres des ateliers retenus à venir (limités). */
  placesLibres: number;
}

const totaux = (ateliers: AtelierStat[], inscriptions: InscriptionStat[], aujourdhui: string): Totaux => {
  const ids = new Set(ateliers.map(a => a.id));
  const siennes = inscriptions.filter(i => ids.has(i.atelier_id));
  const validees = siennes.filter(i => i.statut === "confirme");
  const passes = ateliers.filter(a => a.date_atelier < aujourdhui);
  const idsPasses = new Set(passes.map(a => a.id));
  const valideesPassees = validees.filter(i => idsPasses.has(i.atelier_id));
  const presentes = validees.filter(i => i.present);
  const limites = ateliers.filter(a => a.places_max !== null && a.places_max > 0);
  const idsLimites = new Set(limites.map(a => a.id));
  return {
    ateliers: ateliers.length,
    ateliersPasses: passes.length,
    validees: validees.length,
    presentes: presentes.length,
    aTraiter: siennes.filter(i => i.statut === "en_attente").length,
    moyenneValidees: moyenne(validees.length, ateliers.length),
    moyennePresentes: moyenne(presentes.filter(i => idsPasses.has(i.atelier_id)).length, passes.length),
    tauxRemplissage: taux(validees.filter(i => idsLimites.has(i.atelier_id)).length, limites.reduce((s, a) => s + (a.places_max ?? 0), 0)),
    tauxPresence: taux(valideesPassees.filter(i => i.present).length, valideesPassees.length),
    placesLibres: ateliers
      .filter(a => a.date_atelier >= aujourdhui && (a.statut === "publie" || a.statut === "complet"))
      .reduce((s, a) => s + Math.max(0, a.places_disponibles ?? 0), 0),
  };
};

export interface LigneEspaceStat extends Totaux { id: string; nom: string; slug: string }

export interface RepartitionCreneaux {
  /** Inscrites validées par réponse (ateliers Business retenus). */
  validees: Record<Creneau | "sans_reponse", number>;
  /** Présentes (case cochée) par réponse. */
  presentes: Record<Creneau | "sans_reponse", number>;
  ateliers: number;
}

const repartition = (ateliers: AtelierStat[], inscriptions: InscriptionStat[]): RepartitionCreneaux => {
  const ids = new Set(ateliers.map(a => a.id));
  const vide = () => ({ journee: 0, matin: 0, apres_midi: 0, sans_reponse: 0 });
  const r: RepartitionCreneaux = { validees: vide(), presentes: vide(), ateliers: ateliers.length };
  for (const i of inscriptions) {
    if (!ids.has(i.atelier_id) || i.statut !== "confirme") continue;
    const cle = i.creneau === "journee" || i.creneau === "matin" || i.creneau === "apres_midi" ? i.creneau : "sans_reponse";
    r.validees[cle] += 1;
    if (i.present) r.presentes[cle] += 1;
  }
  return r;
};

export interface LigneAtelierStat {
  atelier: AtelierStat;
  validees: number;
  presentes: number;
  enAttente: number;
  creneaux: Record<Creneau | "sans_reponse", number>;
}

export interface Statistiques {
  totaux: Totaux;
  parEspace: LigneEspaceStat[];
  /** Répartition journée / matin / après-midi des ateliers Business retenus (null si l'espace Business n'existe pas). */
  business: RepartitionCreneaux | null;
  parAtelier: LigneAtelierStat[];
}

/** Toutes les statistiques du tableau de bord pour les filtres donnés. */
export const statistiquesAteliers = (
  ateliers: AtelierStat[],
  inscriptions: InscriptionStat[],
  espaces: { id: string; nom: string; slug: string }[],
  f: Filtres,
  aujourdhui: string,
): Statistiques => {
  const retenus = filtrerAteliers(ateliers, f, aujourdhui);
  const business = espaces.find(e => e.slug === "business");
  const espacesAffiches = f.espaces.length ? espaces.filter(e => f.espaces.includes(e.id)) : espaces;
  return {
    totaux: totaux(retenus, inscriptions, aujourdhui),
    parEspace: espacesAffiches.map(e => ({ ...e, ...totaux(retenus.filter(a => a.espace_id === e.id), inscriptions, aujourdhui) })),
    business: business && (f.espaces.length === 0 || f.espaces.includes(business.id))
      ? repartition(retenus.filter(a => a.espace_id === business.id), inscriptions)
      : null,
    parAtelier: [...retenus]
      .sort((a, b) => a.date_atelier.localeCompare(b.date_atelier))
      .map(a => {
        const siennes = inscriptions.filter(i => i.atelier_id === a.id);
        const validees = siennes.filter(i => i.statut === "confirme");
        return {
          atelier: a,
          validees: validees.length,
          presentes: validees.filter(i => i.present).length,
          enAttente: siennes.filter(i => i.statut === "en_attente").length,
          creneaux: repartition([a], inscriptions).validees,
        };
      }),
  };
};
