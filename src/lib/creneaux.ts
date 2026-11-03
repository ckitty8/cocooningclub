// Créneaux d'inscription des ateliers Business : la matinée, l'après-midi ou la journée entière.
//
// Stockés sur l'atelier (colonne JSON `ateliers.creneaux`, migration 20261103000001) ; seuls les
// créneaux présents sont proposés à l'inscription. Le choix de la personne est gardé sur la
// pré-inscription (`inscriptions.creneau`).
// Décisions de l'association (03/11) : prix facultatif par créneau ; places séparées le matin et
// l'après-midi (la journée entière prend une place de chaque, vide = illimitées) ; une adhérente
// dont l'adhésion couvre Business a l'atelier inclus pour les trois créneaux (rien ne change dans
// la règle des droits, qui ne dépend que de l'espace).
import { heureDeFin } from "./dureeAtelier";

export type CleCreneau = "matin" | "apres_midi" | "journee";
export const CLES_CRENEAU: CleCreneau[] = ["matin", "apres_midi", "journee"];

export interface DemiJournee {
  /** « HH:MM » */
  debut?: string | null;
  fin?: string | null;
  /** Null ou absent = places illimitées. */
  places?: number | null;
  tarif?: number | null;
  tarif_adherent?: number | null;
}

export interface Journee {
  tarif?: number | null;
  tarif_adherent?: number | null;
}

/** Créneaux proposés : une clé présente = créneau proposé. */
export interface CreneauxAtelier {
  matin?: DemiJournee;
  apres_midi?: DemiJournee;
  journee?: Journee;
}

export const LIBELLE_CRENEAU: Record<CleCreneau, string> = {
  matin: "La matinée",
  apres_midi: "L'après-midi",
  journee: "La journée entière",
};

/** Libellé court (pastilles, compteurs, messages). */
export const LIBELLE_COURT_CRENEAU: Record<CleCreneau, string> = {
  matin: "Matinée",
  apres_midi: "Après-midi",
  journee: "Journée entière",
};

export const estCleCreneau = (v: unknown): v is CleCreneau => v === "matin" || v === "apres_midi" || v === "journee";

const nombreOuNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const heureOuNull = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
};

/** Lit la colonne telle qu'elle arrive de la base (objet, texte JSON, null…) sans jamais échouer. */
export const lireCreneaux = (brut: unknown): CreneauxAtelier => {
  let v = brut;
  if (typeof v === "string") {
    try { v = JSON.parse(v); } catch { return {}; }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const o = v as Record<string, Record<string, unknown> | undefined>;
  const resultat: CreneauxAtelier = {};
  for (const cle of ["matin", "apres_midi"] as const) {
    const c = o[cle];
    if (c && typeof c === "object") {
      resultat[cle] = {
        debut: heureOuNull(c.debut), fin: heureOuNull(c.fin),
        places: nombreOuNull(c.places), tarif: nombreOuNull(c.tarif), tarif_adherent: nombreOuNull(c.tarif_adherent),
      };
    }
  }
  if (o.journee && typeof o.journee === "object") {
    resultat.journee = { tarif: nombreOuNull(o.journee.tarif), tarif_adherent: nombreOuNull(o.journee.tarif_adherent) };
  }
  return resultat;
};

/** Vrai si l'atelier propose au moins un créneau. */
export const aDesCreneaux = (brut: unknown): boolean => CLES_CRENEAU.some(c => lireCreneaux(brut)[c]);

export interface CreneauPropose {
  cle: CleCreneau;
  libelle: string;
  /** « HH:MM », ou null si inconnu. */
  debut: string | null;
  fin: string | null;
  /** Programme saisi dans les champs « Matin » / « Après-midi » de l'atelier. */
  programme: string | null;
  tarif: number | null;
  tarif_adherent: number | null;
}

interface AtelierAvecCreneaux {
  creneaux?: unknown;
  heure_debut?: string | null;
  duree?: string | null;
  matin?: string | null;
  apres_midi?: string | null;
}

/** Créneaux proposés, dans l'ordre matin → après-midi → journée. */
export const creneauxProposes = (atelier: AtelierAvecCreneaux): CreneauPropose[] => {
  const c = lireCreneaux(atelier.creneaux);
  const debutAtelier = heureOuNull(atelier.heure_debut ?? null);
  const finAtelier = atelier.heure_debut && atelier.duree ? heureOuNull(heureDeFin(atelier.heure_debut, atelier.duree)) : null;
  const liste: CreneauPropose[] = [];
  if (c.matin) liste.push({
    cle: "matin", libelle: LIBELLE_CRENEAU.matin, debut: c.matin.debut ?? debutAtelier, fin: c.matin.fin ?? null,
    programme: atelier.matin?.trim() || null, tarif: c.matin.tarif ?? null, tarif_adherent: c.matin.tarif_adherent ?? null,
  });
  if (c.apres_midi) liste.push({
    cle: "apres_midi", libelle: LIBELLE_CRENEAU.apres_midi, debut: c.apres_midi.debut ?? null, fin: c.apres_midi.fin ?? finAtelier,
    programme: atelier.apres_midi?.trim() || null, tarif: c.apres_midi.tarif ?? null, tarif_adherent: c.apres_midi.tarif_adherent ?? null,
  });
  if (c.journee) liste.push({
    cle: "journee", libelle: LIBELLE_CRENEAU.journee,
    debut: c.matin?.debut ?? debutAtelier, fin: c.apres_midi?.fin ?? finAtelier,
    programme: atelier.matin?.trim() || atelier.apres_midi?.trim() ? "Le matin et l'après-midi." : null,
    tarif: c.journee.tarif ?? null, tarif_adherent: c.journee.tarif_adherent ?? null,
  });
  return liste;
};

/** « 10:00 – 13:00 », « à partir de 10:00 », ou "". */
export const horairesCreneau = (c: Pick<CreneauPropose, "debut" | "fin">): string =>
  c.debut && c.fin ? `${c.debut} – ${c.fin}` : c.debut ? `à partir de ${c.debut}` : c.fin ? `jusqu'à ${c.fin}` : "";

/** Places prises (pré-inscriptions validées) le matin et l'après-midi : la journée entière compte des deux côtés. */
export const placesPrisesParCreneau = (creneauxChoisis: (string | null | undefined)[]): { matin: number; apres_midi: number; journee: number } => {
  const r = { matin: 0, apres_midi: 0, journee: 0 };
  for (const c of creneauxChoisis) {
    if (c === "matin" || c === "journee") r.matin += 1;
    if (c === "apres_midi" || c === "journee") r.apres_midi += 1;
    if (c === "journee") r.journee += 1;
  }
  return r;
};

/** Vrai si plus aucune place n'est libre pour ce créneau (la journée demande une place matin ET après-midi). */
export const creneauComplet = (cle: CleCreneau, brut: unknown, pris: { matin: number; apres_midi: number }): boolean => {
  const c = lireCreneaux(brut);
  const plein = (demi: "matin" | "apres_midi") => {
    const places = c[demi]?.places;
    return places != null && pris[demi] >= places;
  };
  if (cle === "journee") return plein("matin") || plein("apres_midi");
  return plein(cle);
};

/**
 * Tarifs à appliquer à une pré-inscription : ceux du créneau choisi quand ils sont saisis,
 * sinon ceux de l'atelier (le prix d'un créneau est facultatif).
 */
export const tarifsAvecCreneau = <T extends { tarif_standard: number | null; tarif_adherent?: number | null; creneaux?: unknown }>(
  atelier: T,
  creneau: string | null | undefined,
): T => {
  if (!estCleCreneau(creneau)) return atelier;
  const c = lireCreneaux(atelier.creneaux)[creneau];
  if (!c || c.tarif == null) return atelier;
  return { ...atelier, tarif_standard: c.tarif, tarif_adherent: c.tarif_adherent ?? null };
};

// ─── Formulaire d'administration ────────────────────────────────────────

/** Saisie du tableau « Créneaux proposés » (tout en texte, comme les autres champs du formulaire). */
export interface SaisieCreneaux {
  matin: { actif: boolean; debut: string; fin: string; places: string; tarif: string; tarif_adherent: string };
  apres_midi: { actif: boolean; debut: string; fin: string; places: string; tarif: string; tarif_adherent: string };
  journee: { actif: boolean; tarif: string; tarif_adherent: string };
}

export const saisieCreneauxVide = (): SaisieCreneaux => ({
  matin: { actif: false, debut: "", fin: "", places: "", tarif: "", tarif_adherent: "" },
  apres_midi: { actif: false, debut: "", fin: "", places: "", tarif: "", tarif_adherent: "" },
  journee: { actif: false, tarif: "", tarif_adherent: "" },
});

const texte = (n: number | null | undefined) => (n == null ? "" : String(n));

export const versSaisie = (brut: unknown): SaisieCreneaux => {
  const c = lireCreneaux(brut);
  const s = saisieCreneauxVide();
  for (const cle of ["matin", "apres_midi"] as const) {
    const d = c[cle];
    if (d) s[cle] = { actif: true, debut: d.debut ?? "", fin: d.fin ?? "", places: texte(d.places), tarif: texte(d.tarif), tarif_adherent: texte(d.tarif_adherent) };
  }
  if (c.journee) s.journee = { actif: true, tarif: texte(c.journee.tarif), tarif_adherent: texte(c.journee.tarif_adherent) };
  return s;
};

/** Erreur à afficher, ou null si la saisie est correcte. */
export const verifierSaisie = (s: SaisieCreneaux): string | null => {
  for (const cle of ["matin", "apres_midi"] as const) {
    const d = s[cle];
    if (!d.actif) continue;
    if (d.places.trim() !== "" && !(Number(d.places) >= 1 && Number.isInteger(Number(d.places)))) {
      return `${LIBELLE_COURT_CRENEAU[cle]} : saisis un nombre de places d'au moins 1, ou laisse vide pour des places illimitées`;
    }
  }
  for (const cle of CLES_CRENEAU) {
    const d = s[cle];
    if (!d.actif) continue;
    for (const [nom, v] of [["tarif", d.tarif], ["tarif adhérente", d.tarif_adherent]] as const) {
      const n = nombreOuNull(v);
      if (v.trim() !== "" && (n === null || n < 0)) return `${LIBELLE_COURT_CRENEAU[cle]} : ${nom} invalide (laisse vide s'il n'y a pas de prix)`;
    }
  }
  return null;
};

/** Valeur à écrire dans `ateliers.creneaux` : null quand aucun créneau n'est coché. */
export const depuisSaisie = (s: SaisieCreneaux): CreneauxAtelier | null => {
  const r: CreneauxAtelier = {};
  for (const cle of ["matin", "apres_midi"] as const) {
    const d = s[cle];
    if (d.actif) r[cle] = {
      debut: heureOuNull(d.debut), fin: heureOuNull(d.fin), places: nombreOuNull(d.places),
      tarif: nombreOuNull(d.tarif), tarif_adherent: nombreOuNull(d.tarif_adherent),
    };
  }
  if (s.journee.actif) r.journee = { tarif: nombreOuNull(s.journee.tarif), tarif_adherent: nombreOuNull(s.journee.tarif_adherent) };
  return Object.keys(r).length > 0 ? r : null;
};
