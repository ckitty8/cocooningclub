import { ajouterMois, aujourdhuiIso } from "./adhesions";
import type { AutorisationImage, SupportImage } from "./autorisationImage";

// Champs du bulletin d'adhésion propres à l'adhésion : engagement, WhatsApp, autorisation photo et vidéo.
// Les coordonnées (nom, téléphone…) restent sur la fiche de la personne.

export interface ValeursBulletin {
  engagement: boolean;
  whatsapp: boolean;
  photos: boolean;
  supports: SupportImage[];
  /** Date de signature du bulletin (AAAA-MM-JJ). */
  signeeLe: string;
  /** Date de naissance de l'adhérente (AAAA-MM-JJ), vide si on ne l'a pas. */
  naissance: string;
}

export const bulletinVierge = (aujourdhui = aujourdhuiIso()): ValeursBulletin => ({
  engagement: false, whatsapp: false, photos: false, supports: [], signeeLe: aujourdhui, naissance: "",
});

interface ChampsBulletin {
  engagement_accepte_le: string | null;
  whatsapp: boolean;
  autorisation_image: boolean;
  image_supports: string[];
  image_signee_le: string | null;
  /** Absente tant que la migration 20261026000001 n'est pas appliquée. */
  date_naissance?: string | null;
}

/** Colonnes de la table `adhesions` correspondant aux valeurs saisies (hors date de naissance : voir `champNaissance`). */
export const champsDepuisBulletin = (v: ValeursBulletin): Omit<ChampsBulletin, "date_naissance"> => ({
  engagement_accepte_le: v.engagement ? v.signeeLe : null,
  whatsapp: v.whatsapp,
  autorisation_image: v.photos,
  image_supports: v.photos ? v.supports : [],
  image_signee_le: v.photos ? v.signeeLe : null,
});

/**
 * Date de naissance à écrire dans l'adhésion, ou rien : on n'envoie la colonne que si elle est renseignée ou
 * modifiée, pour que l'enregistrement du bulletin continue de marcher tant que la colonne n'existe pas en base.
 */
export const champNaissance = (v: ValeursBulletin, actuelle: string | null | undefined = ""): { date_naissance?: string | null } =>
  v.naissance === (actuelle ?? "") ? {} : { date_naissance: v.naissance || null };

/** Valeurs à afficher dans le formulaire pour une adhésion existante. */
export const bulletinDepuisChamps = (c: ChampsBulletin, aujourdhui = aujourdhuiIso()): ValeursBulletin => ({
  engagement: c.engagement_accepte_le !== null,
  whatsapp: c.whatsapp,
  photos: c.autorisation_image,
  supports: c.image_supports as SupportImage[],
  signeeLe: c.image_signee_le ?? c.engagement_accepte_le ?? aujourdhui,
  naissance: c.date_naissance ?? "",
});

/** Autorisation photo telle que la donne `vue_autorisation_image`, calculée pour une adhésion précise. */
export const autorisationDepuisChamps = (
  c: Pick<ChampsBulletin, "autorisation_image" | "image_supports" | "image_signee_le">,
  utilisateurId: string,
  aujourdhui = aujourdhuiIso(),
): AutorisationImage => {
  const fin = c.image_signee_le ? ajouterMois(c.image_signee_le, 36) : null;
  return {
    utilisateur_id: utilisateurId,
    autorisation_image: c.autorisation_image,
    image_supports: c.image_supports,
    image_signee_le: c.image_signee_le,
    image_valable_jusqu_au: fin,
    image_valide: c.autorisation_image && fin !== null && fin >= aujourdhui,
  };
};
