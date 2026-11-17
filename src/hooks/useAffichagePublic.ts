import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { reglageDepuis, type ReglageAffichage } from "@/lib/affichagePublic";

// Réglage « Affichage public » des ateliers (17/11), lu une fois par visite et gardé dans le navigateur pour
// s'afficher tout de suite à la visite suivante. Sans table (migration non appliquée) ou sans réponse :
// réglage par défaut, l'affichage d'avant.

const CLE = "cc_affichage_ateliers_v1";

const lireCache = (): ReglageAffichage => {
  try {
    return reglageDepuis(JSON.parse(localStorage.getItem(CLE) ?? "null"));
  } catch {
    return reglageDepuis(null);
  }
};

let lecture: Promise<ReglageAffichage> | null = null;

export const lireAffichagePublic = (forcer = false): Promise<ReglageAffichage> => {
  if (!lecture || forcer) {
    lecture = Promise.resolve(
      supabase.from("parametres_affichage_ateliers").select("accueil, calendrier").maybeSingle(),
    ).then(({ data, error }) => {
      if (error) return lireCache();
      try { localStorage.setItem(CLE, JSON.stringify(data ?? null)); } catch { /* stockage indisponible */ }
      return reglageDepuis(data);
    }).catch(() => lireCache());
  }
  return lecture;
};

export const useAffichagePublic = (): ReglageAffichage => {
  const [reglage, setReglage] = useState<ReglageAffichage>(lireCache);
  useEffect(() => {
    let actif = true;
    void lireAffichagePublic().then(r => { if (actif) setReglage(r); });
    return () => { actif = false; };
  }, []);
  return reglage;
};
