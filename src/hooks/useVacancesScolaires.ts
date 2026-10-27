import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PeriodeVacances } from "@/lib/calendrierAteliers";

/** Vacances scolaires de la zone C (calendrier du club), les mêmes que dans « Gestion des dispo des admins ». */
export const useVacancesScolaires = (): PeriodeVacances[] => {
  const [vacances, setVacances] = useState<PeriodeVacances[]>([]);
  useEffect(() => {
    let annule = false;
    supabase.from("vacances_scolaires").select("id, nom, date_debut, date_fin").eq("zone", "C").order("date_debut")
      .then(({ data, error }) => { if (!annule && !error) setVacances((data ?? []) as PeriodeVacances[]); });
    return () => { annule = true; };
  }, []);
  return vacances;
};
