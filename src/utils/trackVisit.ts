import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "cc_visitor_id";

// Génère ou récupère un ID stable pour le visiteur (stocké en localStorage).
// Malgré le nom de la colonne « visiteur_hash », c'est un UUID aléatoire, pas
// un hash : le renommer demanderait une migration pour un gain nul.
const getVisitorId = (): string => {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage inaccessible (mode privé) → on génère un ID éphémère
    return crypto.randomUUID();
  }
};

// Dedupe : ne log pas 2 fois le même pageview en moins de 5 secondes
const lastVisits: Record<string, number> = {};

export const trackVisit = (page: string): void => {
  const now = Date.now();
  const last = lastVisits[page] ?? 0;
  if (now - last < 5000) return;
  lastVisits[page] = now;

  supabase.from("visites_site").insert({
    page,
    referrer: document.referrer || null,
    user_agent: navigator.userAgent.substring(0, 500),
    visiteur_hash: getVisitorId(),
  }).then(({ error }) => {
    if (error) console.warn("[trackVisit] insert failed:", error);
  });
};
