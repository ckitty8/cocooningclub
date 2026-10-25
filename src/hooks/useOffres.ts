import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { aujourdhuiIso, ajouterMois } from "@/lib/adhesions";
import { offreSimulee, offresEnCours, type EspaceDroit, type OffreEnCours } from "@/lib/droits";

/** Espaces du club (Papotages, Créatifs, Business) avec leur éventuelle gratuité pour tous. */
export const useEspaces = (): EspaceDroit[] => {
  const [espaces, setEspaces] = useState<EspaceDroit[]>([]);
  useEffect(() => {
    supabase.from("espaces").select("*").order("ordre_affichage").then(({ data }) => {
      setEspaces(((data ?? []) as unknown as EspaceDroit[]).map(e => ({
        id: e.id, nom: e.nom, slug: e.slug, gratuit_pour_tous: e.gratuit_pour_tous ?? null,
      })));
    });
  }, []);
  return espaces;
};

/**
 * Tarif adhérente de chaque atelier (colonne ajoutée par la migration « tarif adhérente »).
 * Lu à part : tant que la colonne n'existe pas, la requête échoue et la carte reste vide.
 */
export const useTarifsAdherent = (): Map<string, number | null> => {
  const [tarifs, setTarifs] = useState<Map<string, number | null>>(new Map());
  useEffect(() => {
    // La colonne n'est pas encore dans les types générés.
    (supabase.from("ateliers") as unknown as { select: (c: string) => PromiseLike<{ data: { id: string; tarif_adherent: number | null }[] | null; error: unknown }> })
      .select("id, tarif_adherent")
      .then(({ data, error }) => {
        if (!error && data) setTarifs(new Map(data.map(a => [a.id, a.tarif_adherent])));
      });
  }, []);
  return tarifs;
};

interface LigneAdhesion {
  utilisateur_id: string;
  statut: string;
  valable_jusqu_au: string | null;
  formules: { id: string; nom: string; couleur: string; formule_espaces: { espace_id: string }[] } | null;
}

/**
 * Offres en cours, par personne. `disponible` vaut false tant que la migration (tables des adhésions)
 * n'est pas appliquée : les écrans n'affichent alors aucune mention d'offre plutôt qu'une mention fausse.
 * `moi` : seulement l'adhésion de la personne connectée ; sinon toutes (administration).
 */
export const useOffresParPersonne = (moi: string | null) => {
  const [lignes, setLignes] = useState<LigneAdhesion[] | null>(null);
  const [disponible, setDisponible] = useState(false);

  useEffect(() => {
    let annule = false;
    const requete = supabase
      .from("adhesions")
      .select("utilisateur_id, statut, valable_jusqu_au, formules(id, nom, couleur, formule_espaces(espace_id))")
      .eq("statut", "active")
      .gte("valable_jusqu_au", aujourdhuiIso());
    (moi ? requete.eq("utilisateur_id", moi) : requete).then(({ data, error }) => {
      if (annule) return;
      setDisponible(!error);
      setLignes(error ? [] : ((data ?? []) as unknown as LigneAdhesion[]));
    });
    return () => { annule = true; };
  }, [moi]);

  const parPersonne = useMemo(() => {
    const carte = new Map<string, OffreEnCours[]>();
    const jour = aujourdhuiIso();
    for (const l of lignes ?? []) {
      const offres = offresEnCours([l], jour);
      carte.set(l.utilisateur_id, [...(carte.get(l.utilisateur_id) ?? []), ...offres]);
    }
    return carte;
  }, [lignes]);

  return { parPersonne, disponible, charge: lignes !== null };
};

/**
 * Offres de la personne connectée (espace membre). Pendant une simulation du créateur, l'offre
 * simulée remplace les données réelles : on voit le site comme une adhérente Business, Créatif ou Complet.
 */
export const useMesOffres = () => {
  const { profile, offreSimulee: simulee } = useAuth();
  const espaces = useEspaces();
  const reelles = useOffresParPersonne(simulee ? null : profile?.id ?? null);

  const offres = useMemo(() => {
    if (simulee) return offreSimulee(simulee, espaces, ajouterMois(aujourdhuiIso(), 12));
    return profile ? reelles.parPersonne.get(profile.id) ?? [] : [];
  }, [simulee, espaces, profile, reelles.parPersonne]);

  return {
    offres,
    espaces,
    simulee: simulee !== null,
    // Les mentions « inclus / à régler » ne s'affichent qu'avec des données fiables.
    disponible: simulee !== null || reelles.disponible,
    charge: espaces.length > 0 && (simulee !== null || reelles.charge),
  };
};
