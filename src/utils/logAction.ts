import { supabase } from "@/integrations/supabase/client";

/**
 * Enregistre une action admin dans la table logs.
 * Stockage BDD uniquement — aucune sortie utilisateur.
 *
 * @param action  Identifiant court de l'action (ex: "atelier.delete", "inscription.validate")
 * @param table_cible  Table concernée si applicable (ex: "ateliers", "inscriptions")
 * @param enregistrement_cible_id  UUID de la ligne concernée si applicable
 * @param details  Payload JSON libre (ancienne/nouvelle valeur, titre, etc.)
 */
export const logAction = async (
  action: string,
  table_cible?: string | null,
  enregistrement_cible_id?: string | null,
  details?: Record<string, unknown> | null
): Promise<void> => {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id ?? null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("logs") as any).insert({
      utilisateur_id: userId,
      action,
      table_cible: table_cible ?? null,
      enregistrement_cible_id: enregistrement_cible_id ?? null,
      details: details ?? null,
      user_agent: navigator.userAgent.substring(0, 500),
    });
  } catch {
    // Silent — un log raté ne doit pas casser l'action principale
  }
};
