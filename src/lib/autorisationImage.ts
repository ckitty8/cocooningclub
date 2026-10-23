// Autorisation photo et vidéo du bulletin d'adhésion.
//
// Elle est enregistrée une seule fois, sur l'adhésion (bulletin) ; la vue
// `vue_autorisation_image` donne le dernier bulletin de chaque personne. Les écrans
// (membres, inscrits d'un atelier, pré-inscriptions) la retrouvent par la fiche de la
// personne : aucune copie du consentement n'est faite ailleurs.

export type SupportImage = "reseaux" | "site" | "imprimes" | "interne";

export const SUPPORTS_IMAGE: Record<SupportImage, { libelle: string; court: string }> = {
  reseaux:  { libelle: "Réseaux sociaux du club (Instagram, Facebook)", court: "Réseaux sociaux" },
  site:     { libelle: "Site internet de l'association", court: "Site internet" },
  imprimes: { libelle: "Supports imprimés (affiches, flyers, plaquettes)", court: "Supports imprimés" },
  interne:  { libelle: "Communications internes du club (groupe WhatsApp, e-mails)", court: "Communications internes" },
};

export interface AutorisationImage {
  utilisateur_id: string | null;
  autorisation_image: boolean | null;
  image_supports: string[] | null;
  image_signee_le: string | null;
  image_valable_jusqu_au: string | null;
  image_valide: boolean | null;
}

export type EtatPhotos = "accord" | "refus" | "expire" | "inconnu";

export const etatPhotos = (a: AutorisationImage | null | undefined): EtatPhotos => {
  if (!a) return "inconnu";
  if (!a.autorisation_image) return "refus";
  return a.image_valide ? "accord" : "expire";
};

export const LIBELLES_PHOTOS: Record<EtatPhotos, string> = {
  accord: "Photos : accord",
  refus: "Photos : refus",
  expire: "Photos : accord expiré",
  inconnu: "Photos : non renseigné",
};

export const supportsLisibles = (supports: string[] | null | undefined): string[] =>
  (supports ?? []).map(s => SUPPORTS_IMAGE[s as SupportImage]?.court ?? s);

/** Précision affichée au survol : supports cochés et date de fin de l'autorisation. */
export const detailPhotos = (a: AutorisationImage | null | undefined): string => {
  const etat = etatPhotos(a);
  if (etat === "inconnu") return "Aucun bulletin d'adhésion enregistré pour cette personne.";
  if (etat === "refus") return "La personne n'autorise pas la prise de photos et de vidéos.";
  const supports = supportsLisibles(a?.image_supports);
  const fin = a?.image_valable_jusqu_au ? new Date(a.image_valable_jusqu_au + "T00:00:00").toLocaleDateString("fr-FR") : "—";
  return `${etat === "accord" ? "Accord" : "Accord expiré"} jusqu'au ${fin}. Supports : ${supports.length ? supports.join(", ") : "aucun coché"}.`;
};
