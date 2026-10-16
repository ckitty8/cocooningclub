import type { Workshop } from "@/data/workshops";
import logoPapotages from "@/assets/espaces/papotages.webp";
import logoCreatifs from "@/assets/espaces/creatifs.webp";
import logoBusiness from "@/assets/espaces/business.webp";

// Logos des trois espaces, indexés par le slug de la table `antennes`
// (nom historique des espaces en base).
export const ESPACES_PAR_SLUG: Record<string, { nom: string; logo: string }> = {
  papotages: { nom: "Papotages", logo: logoPapotages },
  creatifs: { nom: "Créatif", logo: logoCreatifs },
  business: { nom: "Business", logo: logoBusiness },
};

/** Espace d'un atelier, ou undefined si l'espace n'a pas été chargé ou est inconnu. */
export const espaceDe = (atelier: Workshop) =>
  atelier.antennes ? ESPACES_PAR_SLUG[atelier.antennes.slug] : undefined;
