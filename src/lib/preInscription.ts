import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/contexts/auth";

// Pré-inscription à un atelier, partagée par l'accueil et le calendrier.
// Les statuts (inscription, paiement, présence) sont fixés par la base
// (trigger private.proteger_inscriptions) : le site n'envoie que l'identité.

// Seul atelier qui demande la date de naissance (thème astrologique).
export const ATELIER_AVEC_DATE_NAISSANCE = "Atelier Créatif — Pierre & Oracle";

// Même règle que private.telephone_valide() côté base (vérifié par un test).
export const TELEPHONE_REGEX = /^[0-9 +().-]{6,20}$/;

const REPONSE_REQUISE = "Merci de choisir une réponse.";
/** Réponse à une question à deux cases : « oui » (J'autorise / J'accepte) ou « non » ; vide tant que rien n'est coché. */
export type ReponseDeuxCases = "oui" | "non" | "";
const reponse = z.string().refine((v): boolean => v === "oui" || v === "non", REPONSE_REQUISE);

const schemaAvecIdentite = (prenom: z.ZodString, nom: z.ZodString, email: z.ZodString) =>
  z.object({
    prenom,
    nom,
    email,
    phone: z.string().trim().min(1, "Veuillez indiquer votre numéro de téléphone.")
      .refine(v => v === "" || TELEPHONE_REGEX.test(v), "Numéro de téléphone invalide."),
    workshop: z.string().min(1, "Veuillez choisir un atelier."),
    birthdate: z.string().optional(),
    /** Droit à l'image : photos et vidéos de l'atelier. */
    droitImage: reponse,
    /** Autorisation d'être ajoutée au groupe WhatsApp du club. */
    whatsapp: reponse,
    cgu: z.boolean().refine(v => v, "Merci d'accepter les CGU et la politique de confidentialité."),
  }).refine(d => d.workshop !== ATELIER_AVEC_DATE_NAISSANCE || !!d.birthdate?.trim(), {
    message: "La date de naissance est requise pour cet atelier.",
    path: ["birthdate"],
  });

/** Visiteur : prénom, nom et email obligatoires. */
export const preInscriptionSchema = schemaAvecIdentite(
  z.string().trim().min(1, "Veuillez indiquer votre prénom.").max(100),
  z.string().trim().min(1, "Veuillez indiquer votre nom.").max(100),
  z.string().trim().email("Veuillez entrer un email valide.").max(255),
);

/** Membre connecté : l'identité vient du compte, les champs ne sont qu'affichés. */
export const preInscriptionMembreSchema = schemaAvecIdentite(z.string(), z.string(), z.string());

export type PreInscriptionData = z.infer<typeof preInscriptionSchema>;

/** Valeurs du formulaire à l'ouverture, pré-remplies pour un membre connecté. */
export const valeursInitiales = (atelierTitre = "", profil?: Profile | null): PreInscriptionData => ({
  prenom: profil?.prenom ?? "",
  nom: profil?.nom ?? "",
  email: profil?.email ?? "",
  phone: profil?.telephone ?? "",
  workshop: atelierTitre,
  birthdate: "",
  droitImage: "",
  whatsapp: "",
  cgu: false,
});

/** « oui » → true, « non » → false (la base garde null pour « pas de réponse », anciennes pré-inscriptions). */
export const reponseEnBooleen = (r: string): boolean => r === "oui";

/**
 * Enregistre la pré-inscription.
 * - Membre connecté : rattachée à son compte, pour qu'elle apparaisse dans
 *   son espace membre (la base refuse alors les champs « invité »).
 * - Visiteur : enregistrée avec les coordonnées saisies.
 */
export const envoyerPreInscription = (
  data: PreInscriptionData,
  atelierId: string,
  profil: Pick<Profile, "id"> | null,
  /** Repli si la base n'a pas encore les colonnes de consentement : la pré-inscription passe quand même. */
  sansConsentements = false,
) => {
  const complements = {
    telephone_invite: data.phone || null,
    date_naissance: data.birthdate || null,
    ...(sansConsentements ? {} : {
      autorisation_image: reponseEnBooleen(data.droitImage),
      accord_whatsapp: reponseEnBooleen(data.whatsapp),
    }),
  };

  if (profil) {
    return supabase.from("inscriptions").insert({
      atelier_id: atelierId,
      utilisateur_id: profil.id,
      ...complements,
    });
  }

  return supabase.from("inscriptions").insert({
    atelier_id: atelierId,
    prenom_invite: data.prenom.trim(),
    nom_invite: data.nom.trim(),
    email_invite: data.email,
    ...complements,
  });
};

/** Lien à partager pour s'inscrire : ouvre directement la pré-inscription à cet atelier. */
export const lienInscription = (atelierId: string, origine = window.location.origin) =>
  `${origine}/inscription/${atelierId}`;
