import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { euros } from "@/lib/droits";
import { creneauComplet, creneauxProposes, horairesCreneau, type CleCreneau } from "@/lib/creneaux";

interface Props {
  atelier: { id: string; creneaux?: unknown; heure_debut?: string | null; duree?: string | null; matin?: string | null; apres_midi?: string | null };
  valeur: string;
  onChoisir: (cle: CleCreneau) => void;
  erreur?: string;
}

/**
 * « Je viens… » : choix de la matinée, de l'après-midi ou de la journée entière (ateliers Business qui proposent des créneaux).
 * Un créneau complet (places du matin ou de l'après-midi toutes validées) est grisé. Le prix n'apparaît que s'il est saisi.
 */
const ChoixCreneau = ({ atelier, valeur, onChoisir, erreur }: Props) => {
  const creneaux = creneauxProposes(atelier);
  const [pris, setPris] = useState({ matin: 0, apres_midi: 0 });

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const { data } = await supabase.rpc("places_creneaux", { p_atelier: atelier.id });
        const ligne = data?.[0] ?? null;
        if (!annule && ligne) setPris({ matin: ligne.matin ?? 0, apres_midi: ligne.apres_midi ?? 0 });
      } catch {
        // Comptage indisponible : tous les créneaux restent proposés, l'équipe valide de toute façon.
      }
    })();
    return () => { annule = true; };
  }, [atelier.id]);

  if (creneaux.length === 0) return null;

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-foreground mb-1.5">Je viens… <span className="text-terracotta" aria-hidden="true">*</span></legend>
      <div className="space-y-2">
        {creneaux.map(c => {
          const complet = creneauComplet(c.cle, atelier.creneaux, pris);
          const choisi = valeur === c.cle;
          const horaires = horairesCreneau(c);
          return (
            <label
              key={c.cle}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                complet ? "cursor-not-allowed bg-muted/40 opacity-70"
                : choisi ? "cursor-pointer border-primary bg-primary/5 ring-2 ring-primary/20" : "cursor-pointer bg-background hover:bg-muted/30"
              }`}
            >
              <input
                type="radio"
                name="creneau"
                value={c.cle}
                checked={choisi}
                disabled={complet}
                onChange={() => onChoisir(c.cle)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">
                  {c.libelle}
                  {complet && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Complet</span>}
                </span>
                {horaires && <span className="block text-xs text-muted-foreground">{horaires}</span>}
                {c.programme && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{c.programme}</span>}
              </span>
              {c.tarif != null && (
                <span className="shrink-0 text-right text-sm font-medium text-foreground">
                  {c.tarif > 0 ? euros(c.tarif) : "Gratuit"}
                  {c.tarif_adherent != null && c.tarif_adherent !== c.tarif && (
                    <span className="block text-xs font-normal text-muted-foreground">adhérente : {c.tarif_adherent > 0 ? euros(c.tarif_adherent) : "gratuit"}</span>
                  )}
                </span>
              )}
            </label>
          );
        })}
      </div>
      {erreur && <p className="text-destructive text-xs mt-1">{erreur}</p>}
    </fieldset>
  );
};

export default ChoixCreneau;
