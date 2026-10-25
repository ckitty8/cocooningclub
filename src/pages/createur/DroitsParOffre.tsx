import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import TableauDroits from "@/components/admin/offre/TableauDroits";
import { supabase } from "@/integrations/supabase/client";
import { useEspaces } from "@/hooks/useOffres";
import { OFFRES_SIMULABLES } from "@/lib/droits";

interface FormuleLue {
  id: string;
  nom: string;
  couleur: string;
  ordre: number;
  formule_espaces: { espace_id: string }[];
}

/** Les droits par offre, calculés avec les formules enregistrées (ou, avant la migration, celles du bulletin d'adhésion). */
const DroitsParOffre = () => {
  const espaces = useEspaces();
  const [formules, setFormules] = useState<FormuleLue[] | null>(null);

  useEffect(() => {
    document.title = "Droits par offre · Cocooning Club";
    supabase.from("formules").select("id, nom, couleur, ordre, formule_espaces(espace_id)").order("ordre")
      .then(({ data, error }) => setFormules(error ? [] : ((data ?? []) as unknown as FormuleLue[])));
  }, []);

  const reelles = (formules ?? []).length > 0;
  const lignes = reelles
    ? (formules ?? []).map(f => ({ id: f.id, nom: f.nom, couleur: f.couleur, espaces: f.formule_espaces.map(fe => fe.espace_id) }))
    : OFFRES_SIMULABLES.map(o => ({
        id: o.code, nom: o.formule, couleur: o.couleur,
        espaces: espaces.filter(e => o.slugs.includes(e.slug)).map(e => e.id),
      }));

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Droits par offre</h1>
        <p className="mt-1 text-muted-foreground">Qui est gratuit, inclus ou à payer, selon l'espace de l'atelier.</p>
      </div>

      {formules !== null && espaces.length > 0 && <TableauDroits formules={lignes} espaces={espaces} />}

      <div className="mt-5 flex gap-3 rounded-2xl border bg-muted/40 p-5 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1.5">
          <p>
            « Gratuit » : espace marqué « gratuit pour tous » (Papotages). « Inclus » : l'espace fait partie de la formule en cours.
            « À payer » : le tarif de l'atelier s'applique. Une personne qui cumule deux adhésions cumule leurs espaces.
          </p>
          <p>
            {reelles
              ? "Tableau construit à partir de vos formules : il suit les changements faits dans « Offre & adhésions »."
              : "Aperçu avec les formules du bulletin d'adhésion (Business, Créatif, Complet) : les formules enregistrées s'afficheront ici après la migration."}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DroitsParOffre;
