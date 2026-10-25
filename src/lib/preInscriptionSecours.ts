import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/contexts/auth";
import { envoyerPreInscription, type PreInscriptionData } from "@/lib/preInscription";

// Une pré-inscription ne doit jamais être perdue, même si le site ou la base a un problème.
// Enregistrement en trois temps :
//   1. la table `inscriptions` (cas normal) ;
//   2. à défaut (panne, limite d'envois, atelier retiré, bug…), la table `pre_inscriptions_secours`,
//      que les administrateurs relisent dans « Pré-inscriptions » ;
//   3. à défaut encore (plus de réseau…), la file du navigateur, renvoyée toute seule au prochain
//      chargement du site ou au retour de la connexion.
// Seul un doublon (déjà pré-inscrite à cet atelier) n'est pas repris : rien n'est perdu.

export interface DemandePreInscription {
  data: PreInscriptionData;
  /** null si l'atelier choisi n'a pas été retrouvé (liste périmée, atelier retiré). */
  atelierId: string | null;
  atelierTitre: string;
  /** Compte du membre connecté, sinon null (visiteuse). */
  profil: Pick<Profile, "id" | "prenom" | "nom" | "email"> | null;
}

export type IssuePreInscription =
  | { issue: "enregistree" }
  | { issue: "doublon"; message: string }
  /** Enregistrée dans les demandes de secours : l'équipe la traite à la main. */
  | { issue: "secours" }
  /** Gardée dans le navigateur, renvoyée automatiquement plus tard. */
  | { issue: "locale" };

const CLE_FILE = "cc_preinscriptions_en_attente";
const MAX_EN_FILE = 20;

type ErreurServeur = { code?: string; message?: string } | null;

/** « Une pré-inscription existe déjà… » (trigger inscription_active_existe) : la personne est déjà notée. */
export const estDoublon = (error: ErreurServeur): boolean =>
  error?.code === "P0001" && /existe déjà/i.test(error.message ?? "");

const texteErreur = (e: unknown): string => {
  if (e && typeof e === "object" && "message" in e) {
    const { code, message } = e as { code?: string; message?: string };
    return [code, message].filter(Boolean).join(" : ");
  }
  return e instanceof Error ? e.message : String(e);
};

// ─── File locale (navigateur) ───────────────────────────────────────────

interface EntreeFile {
  id: string;
  demande: DemandePreInscription;
  erreur: string;
  ajouteeLe: string;
}

const lireFile = (): EntreeFile[] => {
  try {
    const brut = window.localStorage.getItem(CLE_FILE);
    const liste = brut ? JSON.parse(brut) : [];
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];
  }
};

const ecrireFile = (liste: EntreeFile[]) => {
  try {
    if (liste.length === 0) window.localStorage.removeItem(CLE_FILE);
    else window.localStorage.setItem(CLE_FILE, JSON.stringify(liste.slice(-MAX_EN_FILE)));
  } catch {
    // Stockage indisponible (navigation privée stricte) : rien de plus à faire.
  }
};

/** Nombre de demandes gardées dans le navigateur, en attente d'envoi. */
export const nombreEnFile = () => lireFile().length;

const mettreEnFile = (demande: DemandePreInscription, erreur: string): boolean => {
  const liste = lireFile();
  liste.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, demande, erreur, ajouteeLe: new Date().toISOString() });
  ecrireFile(liste);
  return lireFile().length > 0;
};

// ─── Enregistrement ─────────────────────────────────────────────────────

const identite = (d: DemandePreInscription) => {
  const nom = d.profil ? [d.profil.prenom, d.profil.nom].filter(Boolean).join(" ") : d.data.name;
  return { nom, email: d.profil?.email ?? d.data.email };
};

const deposerEnSecours = async (d: DemandePreInscription, erreur: string) => {
  const { nom, email } = identite(d);
  return supabase.from("pre_inscriptions_secours").insert({
    nom,
    email: email || null,
    telephone: d.data.phone || null,
    date_naissance: d.data.birthdate || null,
    atelier_id: d.atelierId,
    atelier_titre: d.atelierTitre || null,
    utilisateur_id: d.profil?.id ?? null,
    erreur,
  });
};

/**
 * Tente les deux enregistrements en base. Renvoie null si les deux ont échoué
 * (la demande doit alors être gardée dans le navigateur).
 */
const tenter = async (d: DemandePreInscription): Promise<IssuePreInscription | null> => {
  let erreur = "";
  try {
    if (d.atelierId) {
      const { error } = await envoyerPreInscription(d.data, d.atelierId, d.profil);
      if (!error) return { issue: "enregistree" };
      if (estDoublon(error)) return { issue: "doublon", message: error.message ?? "" };
      erreur = texteErreur(error);
    } else {
      erreur = "Atelier introuvable au moment de l'envoi";
    }
  } catch (e) {
    erreur = texteErreur(e);
  }

  try {
    const { error } = await deposerEnSecours(d, erreur);
    if (!error) return { issue: "secours" };
  } catch {
    // Passe à la file locale.
  }
  return null;
};

/** Enregistre une pré-inscription sans jamais la perdre (voir le commentaire en tête de fichier). */
export const enregistrerPreInscription = async (d: DemandePreInscription): Promise<IssuePreInscription> => {
  const issue = await tenter(d);
  if (issue) return issue;
  mettreEnFile(d, "Aucun enregistrement possible (réseau ou serveur indisponible)");
  return { issue: "locale" };
};

let rejeuEnCours = false;

/**
 * Renvoie les demandes gardées dans le navigateur. Appelée au chargement du site et au retour
 * de la connexion ; une demande n'est retirée de la file qu'une fois enregistrée en base.
 * Renvoie le nombre de demandes envoyées.
 */
export const rejouerFile = async (): Promise<number> => {
  if (rejeuEnCours) return 0;
  rejeuEnCours = true;
  let envoyees = 0;
  try {
    for (const entree of lireFile()) {
      const issue = await tenter(entree.demande);
      if (!issue) continue;
      ecrireFile(lireFile().filter(e => e.id !== entree.id));
      envoyees += 1;
    }
  } finally {
    rejeuEnCours = false;
  }
  return envoyees;
};
