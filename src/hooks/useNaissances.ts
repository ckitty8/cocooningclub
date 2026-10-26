import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LigneNaissance {
  id: string;
  utilisateur_id: string;
  date_naissance: string | null;
  cree_le: string;
}

export interface NaissancePersonne {
  /** Adhésion la plus récente : c'est elle qui porte la date quand on la modifie depuis « Membres ». */
  adhesionId: string;
  date: string | null;
}

/**
 * Date de naissance de chaque personne, lue sur ses adhésions (administration). Elle est saisie avec le bulletin :
 * une personne sans adhésion n'a pas de date. `disponible` vaut false tant que la colonne n'existe pas en base
 * (migration 20261026000001) : l'écran n'affiche alors ni colonne ni champ.
 */
export const useNaissancesParPersonne = () => {
  const [lignes, setLignes] = useState<LigneNaissance[] | null>(null);
  const [disponible, setDisponible] = useState(false);

  const recharger = useCallback(() => {
    supabase.from("adhesions").select("id, utilisateur_id, date_naissance, cree_le").order("cree_le", { ascending: false })
      .then(({ data, error }) => {
        setDisponible(!error);
        setLignes(error ? [] : ((data ?? []) as LigneNaissance[]));
      });
  }, []);

  useEffect(() => { recharger(); }, [recharger]);

  const parPersonne = useMemo(() => {
    const carte = new Map<string, NaissancePersonne>();
    for (const l of lignes ?? []) {
      const deja = carte.get(l.utilisateur_id);
      if (!deja) carte.set(l.utilisateur_id, { adhesionId: l.id, date: l.date_naissance });
      else if (!deja.date && l.date_naissance) deja.date = l.date_naissance;
    }
    return carte;
  }, [lignes]);

  return { parPersonne, disponible, recharger };
};
