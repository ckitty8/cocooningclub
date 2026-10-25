import { fondFormule } from "@/lib/adhesions";
import { droitAtelier, nomCourtOffre, type EspaceDroit, type EtatDroit, type OffreEnCours } from "@/lib/droits";
import { couleurEspace } from "@/lib/calendrierAteliers";

interface FormuleDroit {
  id: string;
  nom: string;
  couleur: string;
  /** Identifiants des espaces couverts. */
  espaces: string[];
}

interface Props {
  formules: FormuleDroit[];
  espaces: EspaceDroit[];
}

const STYLES: Record<EtatDroit, { libelle: string; classe: string }> = {
  gratuit: { libelle: "Gratuit", classe: "bg-blue-100 text-blue-700" },
  inclus: { libelle: "Inclus", classe: "bg-green-100 text-green-700" },
  a_payer: { libelle: "À payer", classe: "bg-amber-100 text-amber-700" },
};

const enOffre = (f: FormuleDroit): OffreEnCours => ({ formule_id: f.id, nom: f.nom, couleur: f.couleur, espaces: f.espaces, valable_jusqu_au: "9999-12-31" });

/** Qui est gratuit, inclus ou à payer, selon l'offre et l'espace de l'atelier. Calculé avec la règle réelle du site. */
const TableauDroits = ({ formules, espaces }: Props) => {
  const lignes: { cle: string; titre: React.ReactNode; offres: OffreEnCours[] }[] = [
    { cle: "aucune", titre: <><span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Sans adhésion</span> <span className="text-xs text-muted-foreground">(inscrite ou visiteuse)</span></>, offres: [] },
    ...formules.map(f => ({
      cle: f.id,
      titre: <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: fondFormule(f.couleur) }}>{nomCourtOffre(f.nom)}</span>,
      offres: [enOffre(f)],
    })),
  ];

  return (
    <div className="bg-card rounded-2xl border overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b bg-muted/30">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">La personne…</th>
            {espaces.map(e => (
              <th key={e.id} className="px-4 py-3 text-center font-medium text-muted-foreground">
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: couleurEspace(e.slug) }} />
                Atelier {e.nom}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map(l => (
            <tr key={l.cle} className="border-t">
              <td className="px-4 py-3">{l.titre}</td>
              {espaces.map(e => {
                const droit = droitAtelier({ espace_id: e.id, tarif_standard: 25 }, espaces, l.offres);
                return (
                  <td key={e.id} className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[droit.etat].classe}`}>{STYLES[droit.etat].libelle}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableauDroits;
