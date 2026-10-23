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
}

export const bulletinVierge = (aujourdhui = aujourdhuiIso()): ValeursBulletin => ({
  engagement: false, whatsapp: false, photos: false, supports: [], signeeLe: aujourdhui,
});

interface ChampsBulletin {
  engagement_accepte_le: string | null;
  whatsapp: boolean;
  autorisation_image: boolean;
  image_supports: string[];
  image_signee_le: string | null;
}

/** Colonnes de la table `adhesions` correspondant aux valeurs saisies. */
export const champsDepuisBulletin = (v: ValeursBulletin): ChampsBulletin => ({
  engagement_accepte_le: v.engagement ? v.signeeLe : null,
  whatsapp: v.whatsapp,
  autorisation_image: v.photos,
  image_supports: v.photos ? v.supports : [],
  image_signee_le: v.photos ? v.signeeLe : null,
});

/** Valeurs à afficher dans le formulaire pour une adhésion existante. */
export const bulletinDepuisChamps = (c: ChampsBulletin, aujourdhui = aujourdhuiIso()): ValeursBulletin => ({
  engagement: c.engagement_accepte_le !== null,
  whatsapp: c.whatsapp,
  photos: c.autorisation_image,
  supports: c.image_supports as SupportImage[],
  signeeLe: c.image_signee_le ?? c.engagement_accepte_le ?? aujourdhui,
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
