// Messages envoyés aux personnes pré-inscrites (mail, WhatsApp) à partir des modèles de « Modèles de messages ».
import { inscIdentite, type InscriptionIdentifiable } from "./inscriptionIdentite";
import { heureDeFin } from "./dureeAtelier";
import { adresseLisible, estLien, googleMapsSearchUrl } from "@/utils/googleMaps";
import { creneauxProposes, estCleCreneau, horairesCreneau, LIBELLE_COURT_CRENEAU, tarifsAvecCreneau } from "./creneaux";

/** Champs de l'atelier repris dans les messages ; seuls titre, date et heure sont toujours présents. */
export interface AtelierPourMessage {
  titre: string;
  date_atelier: string;
  heure_debut: string;
  lieu: string | null;
  adresse?: string | null;
  duree?: string | null;
  heure_fin?: string | null;
  description_courte?: string | null;
  tarif_standard?: number | null;
  tarif_adherent?: number | null;
  tarif_affichage?: string | null;
  matin?: string | null;
  apres_midi?: string | null;
  date_fin_inscription?: string | null;
  espaces?: { nom: string } | null;
  /** Créneaux Business proposés (voir src/lib/creneaux.ts). */
  creneaux?: unknown;
}

export interface InscriptionPourMessage extends InscriptionIdentifiable {
  ateliers?: AtelierPourMessage | null;
  /** Créneau choisi (matin, apres_midi, journee) pour un atelier Business qui en propose. */
  creneau?: string | null;
}

/** Variables utilisables dans les modèles, dans l'ordre où l'écran « Modèles de messages » les propose. */
export const VARIABLES_MESSAGE = [
  { key: "{prenom}", desc: "Prénom de la participante" },
  { key: "{nom}", desc: "Nom de la participante" },
  { key: "{titre}", desc: "Titre de l'atelier" },
  { key: "{espace}", desc: "Espace (Papotages, Créatifs, Business)" },
  { key: "{date}", desc: "Date de l'atelier" },
  { key: "{creneau}", desc: "Créneau choisi et ses horaires (ateliers Business)" },
  { key: "{heure}", desc: "Heure de début" },
  { key: "{heure_fin}", desc: "Heure de fin" },
  { key: "{duree}", desc: "Durée" },
  { key: "{lieu}", desc: "Lieu (nom de l'endroit)" },
  { key: "{adresse}", desc: "Adresse (ou le lien collé dans le champ adresse)" },
  { key: "{carte}", desc: "Lien Google Maps du lieu" },
  { key: "{description}", desc: "Description courte" },
  { key: "{tarif}", desc: "Tarif (non-adhérente)" },
  { key: "{tarif_adherent}", desc: "Tarif adhérente" },
  { key: "{matin}", desc: "Programme du matin (Business)" },
  { key: "{apres_midi}", desc: "Programme de l'après-midi (Business)" },
  { key: "{date_limite}", desc: "Date limite d'inscription" },
] as const;

const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

const heureCourte = (h: string | null | undefined) => (h ? h.substring(0, 5) : "");

const prix = (montant: number | null | undefined): string => {
  if (montant === null || montant === undefined) return "";
  if (montant === 0) return "Gratuit";
  return `${montant.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
};

/** Valeur de chaque variable pour une pré-inscription (texte vide quand l'atelier n'a pas l'information). */
/** « Matinée (10:00 – 13:00) », ou "" si la pré-inscription n'a pas de créneau. */
const libelleCreneau = (insc: InscriptionPourMessage): string => {
  if (!estCleCreneau(insc.creneau)) return "";
  const c = insc.ateliers ? creneauxProposes(insc.ateliers).find(x => x.cle === insc.creneau) : undefined;
  const horaires = c ? horairesCreneau(c) : "";
  return `${LIBELLE_COURT_CRENEAU[insc.creneau]}${horaires ? ` (${horaires})` : ""}`;
};

export const valeursMessage = (insc: InscriptionPourMessage): Record<string, string> => {
  // Le prix du créneau choisi (s'il est saisi) remplace celui de l'atelier.
  const a = insc.ateliers ? tarifsAvecCreneau({ ...insc.ateliers, tarif_standard: insc.ateliers.tarif_standard ?? null }, insc.creneau) : insc.ateliers;
  const id = inscIdentite(insc);
  const adresse = a?.adresse?.trim() ?? "";
  const pourCarte = adresse || a?.lieu?.trim() || "";
  const fin = a?.heure_fin || (a?.heure_debut && a.duree ? heureDeFin(a.heure_debut, a.duree) : null);
  return {
    "{prenom}": id.prenom,
    "{nom}": id.nom,
    "{titre}": a?.titre ?? "",
    "{espace}": a?.espaces?.nom ?? "",
    "{creneau}": libelleCreneau(insc),
    "{date}": a?.date_atelier ? dateLongue(a.date_atelier) : "",
    "{heure}": heureCourte(a?.heure_debut),
    "{heure_fin}": heureCourte(fin),
    "{duree}": a?.duree?.trim() ?? "",
    "{lieu}": a?.lieu ?? "",
    "{adresse}": adresseLisible(adresse) ?? (estLien(adresse) ? adresse : ""),
    "{carte}": pourCarte ? googleMapsSearchUrl(pourCarte) : "",
    "{description}": a?.description_courte?.trim() ?? "",
    "{tarif}": a?.tarif_affichage?.trim() || prix(a?.tarif_standard),
    "{tarif_adherent}": prix(a?.tarif_adherent ?? a?.tarif_standard),
    "{matin}": a?.matin?.trim() ?? "",
    "{apres_midi}": a?.apres_midi?.trim() ?? "",
    "{date_limite}": a?.date_fin_inscription ? dateLongue(a.date_fin_inscription) : "",
  };
};

/** Remplace les variables de `VARIABLES_MESSAGE` ({prenom}, {adresse}…) dans un modèle de message. */
export const remplirModele = (modele: string, insc: InscriptionPourMessage): string => {
  const valeurs = valeursMessage(insc);
  return Object.entries(valeurs).reduce((texte, [cle, valeur]) => texte.replaceAll(cle, valeur), modele);
};

/** Numéro français au format international sans « + » (wa.me). */
export const telephonePourWhatsApp = (telephone: string): string => {
  const chiffres = telephone.replace(/\D/g, "");
  if (chiffres.startsWith("33")) return chiffres;
  if (chiffres.startsWith("0")) return "33" + chiffres.substring(1);
  return chiffres;
};

/** Clés des modèles à utiliser selon la décision prise sur la pré-inscription. */
export const clesModele = (valide: boolean, canal: "mail" | "whatsapp") =>
  canal === "mail"
    ? { sujet: valide ? "validation_mail_sujet" : "refus_mail_sujet", corps: valide ? "validation_mail_corps" : "refus_mail_corps" }
    : { sujet: "", corps: valide ? "validation_whatsapp" : "refus_whatsapp" };
