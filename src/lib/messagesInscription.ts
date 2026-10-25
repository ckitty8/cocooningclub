// Messages envoyés aux personnes pré-inscrites (mail, WhatsApp) à partir des modèles de « Modèles de messages ».
import { inscIdentite, type InscriptionIdentifiable } from "./inscriptionIdentite";

export interface InscriptionPourMessage extends InscriptionIdentifiable {
  ateliers?: { titre: string; date_atelier: string; heure_debut: string; lieu: string | null } | null;
}

const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

/** Remplace {prenom} {nom} {titre} {date} {heure} {lieu} dans un modèle de message. */
export const remplirModele = (modele: string, insc: InscriptionPourMessage): string => {
  const a = insc.ateliers;
  const id = inscIdentite(insc);
  return modele
    .replaceAll("{prenom}", id.prenom)
    .replaceAll("{nom}", id.nom)
    .replaceAll("{titre}", a?.titre ?? "")
    .replaceAll("{date}", a?.date_atelier ? dateLongue(a.date_atelier) : "")
    .replaceAll("{heure}", a?.heure_debut ? a.heure_debut.substring(0, 5) : "")
    .replaceAll("{lieu}", a?.lieu ?? "");
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
