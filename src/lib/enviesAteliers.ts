// Boîte à envies (17/11) : formulaire caché /envies-ateliers et écran Admin → Envies d'ateliers.
// Logique pure (testée) + enregistrement avec file d'attente du navigateur : comme pour les pré-inscriptions,
// une envie n'est jamais perdue (serveur indisponible, table pas encore créée…) : elle est gardée dans le
// navigateur et renvoyée au chargement suivant du site ou au retour du réseau.
import { supabase } from "@/integrations/supabase/client";

export const ESPACES_ENVIE = [
  { valeur: "papotages", libelle: "Papotages", definition: "Une idée, une activité simple à faire tout en discutant." },
  { valeur: "creatifs", libelle: "Créatif", definition: "Un atelier posé, en salle, où l'on se concentre pour vraiment profiter du moment." },
  { valeur: "je_ne_sais_pas", libelle: "Je ne sais pas", definition: null },
] as const;
export type EspaceEnvie = (typeof ESPACES_ENVIE)[number]["valeur"];

export const SOUHAITS = [
  { valeur: "participer", libelle: "Y participer" },
  { valeur: "animer", libelle: "L'animer moi-même, bénévolement" },
  { valeur: "animer_ensemble", libelle: "L'animer avec une autre membre" },
] as const;
export type Souhait = (typeof SOUHAITS)[number]["valeur"];

export const MOMENTS = [
  { valeur: "semaine", libelle: "En semaine" },
  { valeur: "week_end", libelle: "Le week-end" },
  { valeur: "matin", libelle: "Le matin" },
  { valeur: "apres_midi", libelle: "L'après-midi" },
  { valeur: "soir", libelle: "Le soir" },
] as const;
export type Moment = (typeof MOMENTS)[number]["valeur"];

export const STATUTS_ENVIE = [
  { valeur: "nouvelle", libelle: "Nouvelle", pluriel: "Nouvelles" },
  { valeur: "a_etudier", libelle: "À étudier", pluriel: "À étudier" },
  { valeur: "retenue", libelle: "Retenue", pluriel: "Retenues" },
  { valeur: "programmee", libelle: "Programmée", pluriel: "Programmées" },
  { valeur: "classee", libelle: "Classée sans suite", pluriel: "Classées" },
] as const;
export type StatutEnvie = (typeof STATUTS_ENVIE)[number]["valeur"];

export interface NouvelleEnvie {
  prenom: string;
  nom?: string;
  contact?: string;
  espace: EspaceEnvie;
  idee: string;
  details?: string;
  souhait: Souhait;
  materiel?: string;
  budget?: string;
  moments: Moment[];
}

export interface Envie extends NouvelleEnvie {
  id: string;
  cree_le: string;
  statut: StatutEnvie;
}

export const libelle = <T extends { valeur: string; libelle: string }>(liste: readonly T[], v: string | null | undefined) =>
  liste.find(e => e.valeur === v)?.libelle ?? "";

/** Le bloc « Matériel » ne concerne que Papotages et Créatif (et « Je ne sais pas », par prudence). */
export const demandeMateriel = (espace: EspaceEnvie | "" | null | undefined) => !!espace;

/** « 50 € », « 37,50 € » ; vide si aucun plafond n'est réglé. */
export const montantPlafond = (plafond: number | null | undefined): string => {
  if (plafond === null || plafond === undefined || Number.isNaN(plafond)) return "";
  const n = Number(plafond);
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")}\u00a0€`;
};

/** Phrase du « Bon à savoir ». */
export const phraseMateriel = (plafond: number | null | undefined): string => {
  const m = montantPlafond(plafond);
  return m
    ? `le matériel peut être fourni par l'association, dans la limite de ${m} par atelier.`
    : "le matériel peut être fourni par l'association, dans la limite d'un budget fixé par l'équipe.";
};

/** Erreurs du formulaire (clé = champ). */
export const validerEnvie = (e: Partial<NouvelleEnvie> & { consentement?: boolean }): Record<string, string> => {
  const erreurs: Record<string, string> = {};
  if (!e.prenom?.trim()) erreurs.prenom = "Ton prénom est obligatoire";
  else if (e.prenom.trim().length > 100) erreurs.prenom = "100 caractères au maximum";
  if (!e.espace) erreurs.espace = "Choisis un espace";
  if (!e.idee?.trim()) erreurs.idee = "Décris ton idée en quelques mots";
  else if (e.idee.trim().length > 300) erreurs.idee = "300 caractères au maximum";
  if (!e.souhait) erreurs.souhait = "Choisis une réponse";
  if (!e.consentement) erreurs.consentement = "Merci de cocher cette case";
  return erreurs;
};

/** Ligne envoyée à la base (champs vides retirés). */
export const ligneEnvie = (e: NouvelleEnvie) => {
  const t = (v?: string) => v?.trim() || null;
  return {
    prenom: e.prenom.trim(),
    nom: t(e.nom),
    contact: t(e.contact),
    espace: e.espace,
    idee: e.idee.trim(),
    details: t(e.details),
    souhait: e.souhait,
    materiel: t(e.materiel),
    budget: t(e.budget),
    moments: e.moments,
    consentement_le: new Date().toISOString(),
  };
};

// ─── Contact : e-mail ou téléphone ────────────────────────────────────────────

export const estEmail = (contact: string | null | undefined) => !!contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());

/** Numéro au format international pour WhatsApp (« 0612345678 » → « 33612345678 »), null si ce n'en est pas un. */
export const numeroWhatsapp = (contact: string | null | undefined): string | null => {
  if (!contact || estEmail(contact)) return null;
  let n = contact.replace(/[\s.\-()]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  else if (n.startsWith("00")) n = n.slice(2);
  else if (/^0\d{9}$/.test(n)) n = `33${n.slice(1)}`;
  return /^\d{8,15}$/.test(n) ? n : null;
};

const messageReponse = (e: Pick<Envie, "prenom" | "idee">) =>
  `Bonjour ${e.prenom},\n\nMerci pour ton envie d'atelier « ${e.idee} » !\n\n\n\nBelle journée,\nL'équipe du Cocooning Club`;

export const lienGmailEnvie = (e: Pick<Envie, "prenom" | "idee" | "contact">): string | null => {
  if (!estEmail(e.contact)) return null;
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e.contact!.trim())}&su=${encodeURIComponent("Ton envie d'atelier au Cocooning Club")}&body=${encodeURIComponent(messageReponse(e))}`;
};

export const lienWhatsappEnvie = (e: Pick<Envie, "prenom" | "idee" | "contact">): string | null => {
  const n = numeroWhatsapp(e.contact);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(messageReponse(e))}` : null;
};

// ─── Adresse du formulaire (toujours le site en ligne, jamais la preview) ─────

export const CHEMIN_ENVIES = "/envies-ateliers";
export const LIEN_ENVIES = `https://www.lecocooningclub.fr${CHEMIN_ENVIES}`;
export const lienWhatsappPartage = () =>
  `https://wa.me/?text=${encodeURIComponent(`💡 Une idée d'atelier ? Dis-la-nous ici : ${LIEN_ENVIES}`)}`;

// ─── Filtres et export (écran admin) ─────────────────────────────────────────

export const filtrerEnvies = (envies: Envie[], f: { statut: StatutEnvie | ""; espace: EspaceEnvie | ""; recherche: string }) => {
  const q = f.recherche.trim().toLowerCase();
  return envies.filter(e =>
    (!f.statut || e.statut === f.statut)
    && (!f.espace || e.espace === f.espace)
    && (!q || [e.prenom, e.nom, e.contact, e.idee, e.details, e.materiel].some(v => v?.toLowerCase().includes(q))));
};

export const compterParStatut = (envies: Envie[]) =>
  Object.fromEntries(STATUTS_ENVIE.map(s => [s.valeur, envies.filter(e => e.statut === s.valeur).length])) as Record<StatutEnvie, number>;

const dateCourte = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-");
  return a && m && j ? `${j}/${m}/${a}` : "";
};

export const COLONNES_ENVIES = ["Reçue le", "Prénom", "Nom", "Contact", "Espace", "Idée", "Détails", "Souhait", "Matériel", "Budget", "Moments", "Statut"];

export const tableauEnvies = (envies: Envie[]): string[][] => [
  COLONNES_ENVIES,
  ...envies.map(e => [
    dateCourte(e.cree_le), e.prenom, e.nom ?? "", e.contact ?? "", libelle(ESPACES_ENVIE, e.espace), e.idee, e.details ?? "",
    libelle(SOUHAITS, e.souhait), e.materiel ?? "", e.budget ?? "", e.moments.map(m => libelle(MOMENTS, m)).join(", "),
    libelle(STATUTS_ENVIE, e.statut),
  ]),
];

export const nomFichierEnvies = (aujourdhui: Date = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `envies-ateliers-${aujourdhui.getFullYear()}-${p(aujourdhui.getMonth() + 1)}-${p(aujourdhui.getDate())}.xlsx`;
};

/** Adresse qui ouvre Admin → Ateliers sur un nouvel atelier prérempli d'après l'envie. */
export const lienCreerAtelier = (e: Pick<Envie, "idee" | "details" | "espace">) => {
  const p = new URLSearchParams({ nouveau: "1", titre: e.idee });
  if (e.details) p.set("description", e.details);
  if (e.espace === "papotages" || e.espace === "creatifs") p.set("espace", e.espace);
  return `/admin/ateliers?${p.toString()}`;
};

// ─── Enregistrement sans perte ───────────────────────────────────────────────

const CLE_FILE = "cc_envies_en_attente";
type LigneEnvie = ReturnType<typeof ligneEnvie>;

const lireFile = (): LigneEnvie[] => {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_FILE) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const ecrireFile = (file: LigneEnvie[]) => {
  try {
    if (file.length) localStorage.setItem(CLE_FILE, JSON.stringify(file.slice(-20)));
    else localStorage.removeItem(CLE_FILE);
  } catch { /* stockage indisponible */ }
};

export const enviesEnAttente = () => lireFile().length;

export type IssueEnvie = "enregistree" | "locale";

const envoyer = async (ligne: LigneEnvie) => {
  // Pas de .select() : une visiteuse n'a pas le droit de relire les envies.
  const { error } = await supabase.from("envies_ateliers").insert(ligne);
  return error;
};

export const enregistrerEnvie = async (e: NouvelleEnvie): Promise<IssueEnvie> => {
  const ligne = ligneEnvie(e);
  try {
    const error = await envoyer(ligne);
    if (!error) return "enregistree";
  } catch { /* réseau coupé */ }
  ecrireFile([...lireFile(), ligne]);
  return "locale";
};

/** Renvoie les envies gardées dans le navigateur ; garde celles qui échouent encore. */
export const rejouerEnvies = async (): Promise<number> => {
  const file = lireFile();
  if (!file.length) return 0;
  const restantes: LigneEnvie[] = [];
  for (const ligne of file) {
    try {
      const error = await envoyer(ligne);
      if (error) restantes.push(ligne);
    } catch {
      restantes.push(ligne);
    }
  }
  ecrireFile(restantes);
  return file.length - restantes.length;
};
