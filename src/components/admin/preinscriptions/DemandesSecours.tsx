import { useCallback, useEffect, useState } from "react";
import { Check, LifeBuoy, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { dateLongue } from "@/lib/dates";

type Demande = Tables<"pre_inscriptions_secours">;

// Demandes que le site n'a pas pu enregistrer normalement (panne, limite d'envois, atelier retiré…) :
// les coordonnées sont gardées ici pour qu'aucun contact ne soit perdu. Une administratrice
// recontacte la personne (ou ajoute la pré-inscription à la main), puis marque la demande « traitée ».
// Rien ne s'affiche s'il n'y en a aucune, ou si la migration n'est pas appliquée.
const DemandesSecours = () => {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [enCours, setEnCours] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabase
      .from("pre_inscriptions_secours")
      .select("*")
      .order("cree_le", { ascending: false });
    setDemandes(error ? [] : (data ?? []));
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  const traiter = async (d: Demande) => {
    setEnCours(d.id);
    const { error } = await supabase.from("pre_inscriptions_secours").delete().eq("id", d.id);
    setEnCours(null);
    if (error) {
      toast.error("Impossible de marquer cette demande comme traitée.");
      return;
    }
    setDemandes(liste => liste.filter(x => x.id !== d.id));
    toast.success("Demande marquée comme traitée");
  };

  if (demandes.length === 0) return null;

  return (
    <section aria-label="Demandes à récupérer" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <div className="mb-3 flex items-start gap-2">
        <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <h2 className="text-base font-semibold">Demandes à récupérer ({demandes.length})</h2>
          <p className="text-sm">
            Ces personnes ont voulu se pré-inscrire mais l'enregistrement normal n'a pas fonctionné. Leurs coordonnées sont
            ici : contactez-les (ou ajoutez la pré-inscription avec « Nouvelle inscription »), puis cliquez sur « Traitée ».
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {demandes.map(d => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
            <div className="min-w-0 space-y-0.5 text-sm">
              <p className="font-medium text-foreground">{d.nom}{d.atelier_titre && <span className="font-normal text-muted-foreground"> · {d.atelier_titre}</span>}</p>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-muted-foreground">
                {d.email && <a href={`mailto:${d.email}`} className="flex items-center gap-1 underline underline-offset-2"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{d.email}</a>}
                {d.telephone && <a href={`tel:${d.telephone}`} className="flex items-center gap-1 underline underline-offset-2"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{d.telephone}</a>}
                <span>{dateLongue(d.cree_le.slice(0, 10))}</span>
              </p>
              {d.erreur && <p className="text-xs text-muted-foreground">Cause : {d.erreur}</p>}
            </div>
            <button
              onClick={() => traiter(d)}
              disabled={enCours === d.id}
              className="flex items-center gap-1.5 rounded-full border border-amber-700 px-3 py-1.5 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Traitée
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default DemandesSecours;
