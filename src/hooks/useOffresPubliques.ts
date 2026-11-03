import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { versOffre, type OffrePublique, type QuestionBonASavoir } from "@/lib/offres";

/** Offres proposées et questions « Bon à savoir » publiées, pour la page « Nos offres » et l'accueil. */
export const useOffresPubliques = ({ avecQuestions = true }: { avecQuestions?: boolean } = {}) => {
  const [offres, setOffres] = useState<OffrePublique[]>([]);
  const [questions, setQuestions] = useState<QuestionBonASavoir[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let annule = false;
    Promise.all([
      supabase.from("formules").select("*").eq("est_active", true).order("ordre"),
      avecQuestions
        ? supabase.from("bon_a_savoir").select("id, question, reponse, est_publiee, ordre").eq("est_publiee", true).order("ordre")
        : Promise.resolve({ data: [] as QuestionBonASavoir[], error: null }),
    ]).then(([f, q]) => {
      if (annule) return;
      setOffres(f.error ? [] : (f.data ?? []).map(l => versOffre(l as unknown as Record<string, unknown>)));
      // Table absente (migration pas encore appliquée) : pas de section « Bon à savoir ».
      setQuestions(q.error ? [] : (q.data ?? []));
      setChargement(false);
    });
    return () => { annule = true; };
  }, [avecQuestions]);

  return { offres, questions, chargement };
};
