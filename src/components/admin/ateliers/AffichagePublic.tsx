import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lireAffichagePublic } from "@/hooks/useAffichagePublic";
import { logAction } from "@/utils/logAction";
import {
  AFFICHAGE_PAR_DEFAUT, CHAMPS_PAR_PAGE, LIBELLES_CHAMPS, type ChampAffiche, type PageAffichage,
} from "@/lib/affichagePublic";

// Admin → Ateliers → « Affichage public » (17/11) : les informations des ateliers montrées au public,
// pour tous les ateliers, sur l'accueil et sur le calendrier (carte et fenêtre d'un atelier).

const PAGES: { page: PageAffichage; titre: string; aide: string }[] = [
  { page: "accueil", titre: "Accueil", aide: "Tuiles « Nos prochains ateliers »" },
  { page: "calendrier", titre: "Calendrier", aide: "Liste des ateliers et fenêtre d'un atelier" },
];

const AffichagePublic = ({ onFermer }: { onFermer: () => void }) => {
  const [choix, setChoix] = useState<Record<PageAffichage, ChampAffiche[]> | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    void lireAffichagePublic(true).then(r => setChoix({ accueil: [...r.accueil], calendrier: [...r.calendrier] }));
  }, []);

  const basculer = (page: PageAffichage, champ: ChampAffiche) =>
    setChoix(c => c && ({
      ...c,
      [page]: c[page].includes(champ) ? c[page].filter(x => x !== champ) : CHAMPS_PAR_PAGE[page].filter(x => x === champ || c[page].includes(x)),
    }));

  const enregistrer = async () => {
    if (!choix) return;
    setEnCours(true);
    const { error } = await supabase.from("parametres_affichage_ateliers")
      .update({ accueil: choix.accueil, calendrier: choix.calendrier, modifie_le: new Date().toISOString() }).eq("id", true);
    setEnCours(false);
    if (error) {
      toast.error(/parametres_affichage_ateliers/.test(error.message)
        ? "Le réglage n'existe pas encore dans la base : la migration 20261117000001_affichage_public_ateliers.sql est à appliquer."
        : `Enregistrement impossible : ${error.message}`, { duration: 8000 });
      return;
    }
    await lireAffichagePublic(true);
    logAction("atelier.affichage_public", "parametres_affichage_ateliers", null, { accueil: choix.accueil, calendrier: choix.calendrier });
    toast.success("Affichage enregistré : visible sur le site au prochain chargement des pages.");
    onFermer();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onFermer}>
      <div role="dialog" aria-modal="true" aria-labelledby="titre-affichage-public"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border bg-card shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 id="titre-affichage-public" className="flex items-center gap-2 text-lg font-semibold"><Eye className="h-5 w-5" aria-hidden="true" /> Affichage public</h2>
            <p className="text-xs text-muted-foreground">Les informations montrées au public, pour tous les ateliers.</p>
          </div>
          <button onClick={onFermer} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid flex-1 gap-6 overflow-y-auto p-5 sm:grid-cols-2">
          {!choix ? <p className="text-sm text-muted-foreground">Chargement…</p> : PAGES.map(({ page, titre, aide }) => (
            <fieldset key={page}>
              <legend className="font-medium">{titre}</legend>
              <p className="mb-3 text-xs text-muted-foreground">{aide}</p>
              <div className="space-y-2.5">
                {CHAMPS_PAR_PAGE[page].map(champ => (
                  <label key={champ} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input type="checkbox" checked={choix[page].includes(champ)} onChange={() => basculer(page, champ)} className="h-5 w-5 shrink-0 accent-primary" />
                    {LIBELLES_CHAMPS[champ]}
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Le titre, la date du calendrier et le bouton « Pré-inscription » restent toujours affichés.</p>
            </fieldset>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t p-5">
          <button onClick={() => setChoix({ accueil: [...AFFICHAGE_PAR_DEFAUT.accueil], calendrier: [...AFFICHAGE_PAR_DEFAUT.calendrier] })}
            className="rounded-full border px-4 py-2 text-sm hover:bg-muted">Revenir au réglage de départ</button>
          <div className="flex gap-2">
            <button onClick={onFermer} className="rounded-full border px-4 py-2 text-sm hover:bg-muted">Annuler</button>
            <button onClick={enregistrer} disabled={!choix || enCours}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffichagePublic;
