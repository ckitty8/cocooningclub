import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/contexts/auth";

// Pré-inscription à un atelier, partagée par l'accueil et le calendrier.
// Les statuts (inscription, paiement, présence) sont fixés par la base
// (trigger private.proteger_inscriptions) : le site n'envoie que l'identité.

// Seul atelier qui demande la date de naissance (thème astrologique).
export const ATELIER_AVEC_DATE_NAISSANCE = "Atelier Créatif — Pierre & Oracle";

const schemaAvecIdentite = (name: z.ZodString, email: z.ZodString) =>
  z.object({
    name,
    email,
    // Même règle que private.telephone_valide() côté base.
    phone: z.string().trim().regex(/^[0-9 +().-]{6,20}$/, "Numéro de téléphone invalide.").optional().or(z.literal("")),
    workshop: z.string().min(1, "Veuillez choisir un atelier."),
    birthdate: z.string().optional(),
    cgu: z.boolean().refine(v => v, "Merci d'accepter les CGU et la politique de confidentialité."),
  }).refine(d => d.workshop !== ATELIER_AVEC_DATE_NAISSANCE || !!d.birthdate?.trim(), {
    message: "La date de naissance est requise pour cet atelier.",
    path: ["birthdate"],
  });

/** Visiteur : nom et email obligatoires. */
export const preInscriptionSchema = schemaAvecIdentite(
  z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(100),
  z.string().trim().email("Veuillez entrer un email valide.").max(255),
);

/** Membre connecté : l'identité vient du compte, les champs ne sont qu'affichés. */
export const preInscriptionMembreSchema = schemaAvecIdentite(z.string(), z.string());

export type PreInscriptionData = z.infer<typeof preInscriptionSchema>;

/** Valeurs du formulaire à l'ouverture, pré-remplies pour un membre connecté. */
export const valeursInitiales = (atelierTitre = "", profil?: Profile | null): PreInscriptionData => ({
  name: profil ? [profil.prenom, profil.nom].filter(Boolean).join(" ") : "",
  email: profil?.email ?? "",
  phone: "",
  workshop: atelierTitre,
  birthdate: "",
  cgu: false,
});

/** « Marie Dupont » → prénom « Marie », nom « Dupont » (le prénom sert de nom s'il est seul). */
export const separerNomComplet = (nomComplet: string) => {
  const [prenom = "", ...reste] = nomComplet.trim().split(/\s+/);
  return { prenom, nom: reste.join(" ") || prenom };
};

/**
 * Enregistre la pré-inscription.
 * - Membre connecté : rattachée à son compte, pour qu'elle apparaisse dans
 *   son espace membre (la base refuse alors les champs « invité »).
 * - Visiteur : enregistrée avec les coordonnées saisies.
 */
export const envoyerPreInscription = (data: PreInscriptionData, atelierId: string, profil: Profile | null) => {
  const complements = {
    telephone_invite: data.phone || null,
    date_naissance: data.birthdate || null,
  };

  if (profil) {
    return supabase.from("inscriptions").insert({
      atelier_id: atelierId,
      utilisateur_id: profil.id,
      ...complements,
    });
  }

  const { prenom, nom } = separerNomComplet(data.name);
  return supabase.from("inscriptions").insert({
    atelier_id: atelierId,
    prenom_invite: prenom,
    nom_invite: nom,
    email_invite: data.email,
    ...complements,
  });
};
