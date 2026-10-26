import type { ModeReglement } from "@/lib/adhesions";

export interface Espace {
  id: string;
  nom: string;
  slug: string;
}

export interface Formule {
  id: string;
  nom: string;
  description: string | null;
  couleur: string;
  prix: number;
  duree_mois: number;
  lien_helloasso: string | null;
  modes_reglement: string[];
  est_active: boolean;
  ordre: number;
  formule_espaces: { espace_id: string }[];
}

export interface Adhesion {
  id: string;
  numero: number;
  utilisateur_id: string;
  formule_id: string;
  statut: string;
  mode_reglement: ModeReglement;
  montant: number;
  cotisation_recue_le: string | null;
  date_validation: string | null;
  valable_jusqu_au: string | null;
  engagement_accepte_le: string | null;
  whatsapp: boolean;
  autorisation_image: boolean;
  image_supports: string[];
  image_signee_le: string | null;
  /** Absente tant que la migration 20261026000001 n'est pas appliquée. */
  date_naissance?: string | null;
  cree_le: string;
  utilisateurs: {
    prenom: string | null;
    nom: string | null;
    email: string | null;
    telephone: string | null;
    role: string | null;
    commune: string | null;
    activite: string | null;
  } | null;
  formules: { nom: string; couleur: string; duree_mois: number } | null;
}

export interface MembreChoix {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  est_actif?: boolean;
}

export const champ =
  "w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary";
