import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Workshop } from "@/data/workshops";

const MAX_ATTEMPTS = 3;
/** Délai maximal d'une tentative : une réponse qui ne revient jamais ne doit pas bloquer « Chargement… » (17/11). */
export const DELAI_TENTATIVE_MS = 8000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Mémoire des ateliers (17/11, demandé après une panne du serveur Supabase) : la dernière liste reçue est gardée
// dans le navigateur. Elle s'affiche tout de suite à la visite suivante, puis est remplacée par la liste à jour ;
// si le serveur ne répond pas, la liste gardée reste affichée (sans les ateliers déjà passés) au lieu d'une erreur.
const CLE_CACHE = "cc_ateliers_publics_v1";
const DUREE_CACHE_MS = 14 * 24 * 60 * 60 * 1000;

const cleCache = (columns: string) => `${CLE_CACHE}:${columns}`;

export const lireCacheAteliers = (columns: string, aujourdhui: string): Workshop[] | null => {
  try {
    const brut = window.localStorage.getItem(cleCache(columns));
    if (!brut) return null;
    const { le, ateliers } = JSON.parse(brut) as { le: number; ateliers: Workshop[] };
    if (!Array.isArray(ateliers) || Date.now() - le > DUREE_CACHE_MS) return null;
    return ateliers.filter(a => (a.date_atelier ?? "") >= aujourdhui);
  } catch {
    return null;
  }
};

const ecrireCacheAteliers = (columns: string, ateliers: Workshop[]) => {
  try {
    window.localStorage.setItem(cleCache(columns), JSON.stringify({ le: Date.now(), ateliers }));
  } catch {
    // Stockage indisponible (navigation privée stricte, quota) : la page marche sans mémoire.
  }
};

// Charge les ateliers publics à venir. Réessaie automatiquement en cas
// d'échec réseau (ex. "TypeError: Load failed" sur Safari mobile).
export const usePublicAteliers = (columns: string) => {
  // Lu une seule fois, au premier affichage : la liste en mémoire s'affiche sans attendre le serveur.
  const [enCache] = useState(() => lireCacheAteliers(columns, new Date().toISOString().slice(0, 10)));
  const [ateliers, setAteliers] = useState<Workshop[]>(enCache ?? []);
  const [loading, setLoading] = useState(enCache === null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);

    const memoire = lireCacheAteliers(columns, today);

    (async () => {
      // Avec une liste en mémoire, elle reste affichée pendant la mise à jour (pas de « Chargement… »).
      setLoading(memoire === null);
      setError(null);
      let lastError = "";
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        try {
          // Requête annulée au bout de DELAI_TENTATIVE_MS (réseau ou session bloqués), puis nouvel essai.
          const controle = new AbortController();
          let minuteur: ReturnType<typeof setTimeout> | undefined;
          const delai = new Promise<never>((_, rejeter) => {
            minuteur = setTimeout(() => { controle.abort(); rejeter(new Error("Délai dépassé")); }, DELAI_TENTATIVE_MS);
          });
          const requete = supabase
            .from("ateliers")
            .select(columns)
            .in("statut", ["publie", "complet"])
            .gte("date_atelier", today)
            .order("date_atelier")
            .abortSignal(controle.signal);
          const { data, error: err } = await Promise.race([requete, delai]).finally(() => clearTimeout(minuteur));
          if (cancelled) return;
          if (!err) {
            const recus = (data ?? []) as unknown as Workshop[];
            setAteliers(recus);
            ecrireCacheAteliers(columns, recus);
            setLoading(false);
            return;
          }
          lastError = err.message;
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
        }
        console.error(`[usePublicAteliers] tentative ${i + 1}/${MAX_ATTEMPTS} échouée:`, lastError);
        if (i < MAX_ATTEMPTS - 1) await wait(800 * (i + 1));
        if (cancelled) return;
      }
      // Serveur injoignable : la liste en mémoire suffit, pas de message d'erreur.
      if (memoire !== null) {
        setAteliers(memoire);
        setLoading(false);
        return;
      }
      setError(lastError || "Erreur réseau");
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [columns, attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  return { ateliers, setAteliers, loading, error, reload };
};
