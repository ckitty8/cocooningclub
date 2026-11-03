import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Workshop } from "@/data/workshops";

const MAX_ATTEMPTS = 3;

/** Colonne « creneaux » absente (migration 20261103000001 pas encore appliquée) : on relit sans elle. */
const sansCreneaux = (columns: string) => columns.replace(/,\s*creneaux\b/, "");
const colonneAbsente = (err: { code?: string; message?: string }) => err.code === "42703" || /creneaux/.test(err.message ?? "");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Charge les ateliers publics à venir. Réessaie automatiquement en cas
// d'échec réseau (ex. "TypeError: Load failed" sur Safari mobile).
export const usePublicAteliers = (columns: string) => {
  const [ateliers, setAteliers] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);

    (async () => {
      setLoading(true);
      setError(null);
      let lastError = "";
      let colonnes = columns;
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        try {
          const { data, error: err } = await supabase
            .from("ateliers")
            .select(colonnes)
            .in("statut", ["publie", "complet"])
            .gte("date_atelier", today)
            .order("date_atelier");
          if (cancelled) return;
          if (!err) {
            setAteliers((data ?? []) as unknown as Workshop[]);
            setLoading(false);
            return;
          }
          lastError = err.message;
          if (colonnes !== sansCreneaux(colonnes) && colonneAbsente(err)) {
            colonnes = sansCreneaux(colonnes);
            i -= 1;
            continue;
          }
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
        }
        console.error(`[usePublicAteliers] tentative ${i + 1}/${MAX_ATTEMPTS} échouée:`, lastError);
        if (i < MAX_ATTEMPTS - 1) await wait(800 * (i + 1));
        if (cancelled) return;
      }
      setError(lastError || "Erreur réseau");
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [columns, attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  return { ateliers, setAteliers, loading, error, reload };
};
