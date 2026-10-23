import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AutorisationImage } from "@/lib/autorisationImage";

/**
 * Autorisations photo (par identifiant de personne) lues dans `vue_autorisation_image`.
 * `ids` : personnes concernées ; `null` pour toutes. Silencieux si la vue n'existe pas
 * encore (migration non appliquée) : les badges affichent alors « non renseigné ».
 */
export const useAutorisationsImage = (ids: (string | null | undefined)[] | null): Map<string, AutorisationImage> => {
  const [carte, setCarte] = useState<Map<string, AutorisationImage>>(new Map());
  const cle = ids === null ? "*" : [...new Set(ids.filter((i): i is string => !!i))].sort().join(",");

  useEffect(() => {
    let annule = false;
    if (cle === "") {
      setCarte(new Map());
      return;
    }
    const requete = supabase.from("vue_autorisation_image").select("*");
    (cle === "*" ? requete : requete.in("utilisateur_id", cle.split(","))).then(({ data, error }) => {
      if (annule) return;
      if (error) {
        setCarte(new Map());
        return;
      }
      setCarte(new Map(((data ?? []) as AutorisationImage[]).map(a => [a.utilisateur_id as string, a])));
    });
    return () => { annule = true; };
  }, [cle]);

  return carte;
};
