import type { Locator, Page } from "@playwright/test";

type Zone = Pick<Page | Locator, "getByLabel" | "getByRole">;

export interface Reponses {
  prenom?: string;
  nom?: string;
  email?: string;
  tel?: string;
  /** Droit à l'image : « oui » = J'autorise, « non » = Je n'autorise pas. */
  image?: "oui" | "non" | null;
  /** Groupe WhatsApp : « oui » = J'accepte, « non » = Je n'accepte pas. */
  whatsapp?: "oui" | "non" | null;
  cgu?: boolean;
}

/**
 * Remplit le formulaire de pré-inscription. Une valeur absente laisse le champ tel quel
 * (compte connecté : identité déjà remplie) ; null pour image / whatsapp ne coche rien.
 */
export const remplirPreInscription = async (zone: Zone, r: Reponses = {}) => {
  const { prenom, nom, email, tel, image = "oui", whatsapp = "non", cgu = true } = r;
  if (nom !== undefined) await zone.getByLabel("Nom", { exact: true }).fill(nom);
  if (prenom !== undefined) await zone.getByLabel("Prénom", { exact: true }).fill(prenom);
  if (email !== undefined) await zone.getByLabel("E-mail", { exact: true }).fill(email);
  if (tel !== undefined) await zone.getByLabel("Téléphone", { exact: true }).fill(tel);
  if (image) await zone.getByRole("checkbox", { name: image === "oui" ? "J'autorise" : "Je n'autorise pas", exact: true }).check();
  if (whatsapp) await zone.getByRole("checkbox", { name: whatsapp === "oui" ? "J'accepte" : "Je n'accepte pas", exact: true }).check();
  if (cgu) await zone.getByRole("checkbox", { name: /conditions générales/ }).check();
};

/** Titre de la confirmation affichée après l'envoi. */
export const TITRE_MERCI = "Merci pour ton inscription 💛";
