// Formules d'adhésion et adhésions : couleurs, dates de validité et statuts affichés.

export type CouleurFormule = "mauve" | "sauge" | "terracotta" | "rose" | "bleu" | "ocre";
export type ModeReglement = "en_ligne" | "virement" | "especes";

export const COULEURS_FORMULE: Record<CouleurFormule, { libelle: string; fond: string }> = {
  mauve:      { libelle: "Mauve",       fond: "#9e6678" },
  sauge:      { libelle: "Vert sauge",  fond: "#6f8567" },
  terracotta: { libelle: "Terracotta",  fond: "#b95b43" },
  rose:       { libelle: "Rose",        fond: "#b9657f" },
  bleu:       { libelle: "Bleu ardoise", fond: "#51708f" },
  ocre:       { libelle: "Ocre",        fond: "#9a7424" },
};

export const MODES_REGLEMENT: Record<ModeReglement, string> = {
  en_ligne: "En ligne (HelloAsso)",
  virement: "Virement",
  especes: "Espèces",
};

export const fondFormule = (couleur: string): string =>
  COULEURS_FORMULE[couleur as CouleurFormule]?.fond ?? COULEURS_FORMULE.terracotta.fond;

/** « 43 » → « 0043 » : numéro d'adhérente tel qu'il figure sur le bulletin. */
export const formaterNumero = (numero: number): string => String(numero).padStart(4, "0");

const pad = (n: number) => String(n).padStart(2, "0");

/** Date AAAA-MM-JJ + n mois ; le jour est ramené à la fin du mois si besoin (31/01 + 1 mois = 28/02). */
export const ajouterMois = (iso: string, mois: number): string => {
  const [annee, m, jour] = iso.split("-").map(Number);
  const total = annee * 12 + (m - 1) + mois;
  const a = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  const dernierJour = new Date(Date.UTC(a, mm, 0)).getUTCDate();
  return `${a}-${pad(mm)}-${pad(Math.min(jour, dernierJour))}`;
};

/** Date de fin d'une adhésion : validation + durée de la formule. Même calcul que `valider_adhesion` en base. */
export const finDeValidite = (dateValidation: string, dureeMois: number): string =>
  ajouterMois(dateValidation, dureeMois);

/** Date du jour au format AAAA-MM-JJ (heure locale). */
export const aujourdhuiIso = (maintenant = new Date()): string =>
  `${maintenant.getFullYear()}-${pad(maintenant.getMonth() + 1)}-${pad(maintenant.getDate())}`;

const enJours = (iso: string): number => {
  const [a, m, j] = iso.split("-").map(Number);
  return Math.round(Date.UTC(a, m - 1, j) / 86_400_000);
};

export const joursEntre = (debut: string, fin: string): number => enJours(fin) - enJours(debut);

export type StatutAffiche = "a_valider" | "active" | "expire_bientot" | "expiree" | "refusee";

export const LIBELLES_STATUT: Record<StatutAffiche, string> = {
  a_valider: "À valider",
  active: "Active",
  expire_bientot: "Expire bientôt",
  expiree: "Expirée",
  refusee: "Refusée",
};

export const SEUIL_EXPIRATION_JOURS = 30;

/** Statut montré à l'écran, déduit du statut en base et de la date de fin. */
export const statutAdhesion = (
  adhesion: { statut: string; valable_jusqu_au: string | null },
  aujourdhui: string,
): StatutAffiche => {
  if (adhesion.statut === "refusee") return "refusee";
  if (adhesion.statut !== "active" || !adhesion.valable_jusqu_au) return "a_valider";
  const reste = joursEntre(aujourdhui, adhesion.valable_jusqu_au);
  if (reste < 0) return "expiree";
  return reste <= SEUIL_EXPIRATION_JOURS ? "expire_bientot" : "active";
};

/** Une adhésion en cours (active ou sur le point d'expirer) compte comme adhérente. */
export const estEnCours = (statut: StatutAffiche): boolean => statut === "active" || statut === "expire_bientot";
