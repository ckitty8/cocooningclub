import { Clock, Copy, LayoutGrid, Pencil, RefreshCw } from "lucide-react";
import { fondFormule } from "@/lib/adhesions";
import type { Espace, Formule } from "./types";

interface Props {
  formule: Formule;
  espaces: Espace[];
  /** Nombre d'adhérentes en cours ; absent sur l'aperçu. */
  nbActives?: number;
  onModifier?: () => void;
  onDupliquer?: () => void;
  onBasculer?: () => void;
}

const prix = (n: number) => `${Number.isInteger(Number(n)) ? Number(n) : Number(n).toLocaleString("fr-FR")} €`;

const FormuleCard = ({ formule, espaces, nbActives, onModifier, onDupliquer, onBasculer }: Props) => {
  const inclus = espaces.filter(e => formule.formule_espaces.some(fe => fe.espace_id === e.id)).map(e => e.nom);
  const admin = !!onModifier;

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden flex flex-col ${formule.est_active ? "" : "opacity-60"}`}>
      <div className="px-5 py-4 text-white" style={{ backgroundColor: fondFormule(formule.couleur) }}>
        <h3 className="font-display text-xl">{formule.nom || "Nom de la formule"}</h3>
        <p className="text-xs opacity-90 mt-0.5">{formule.description || "Description de la formule"}</p>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <p className="font-display text-3xl text-foreground">
          {prix(formule.prix)} <span className="font-body text-sm text-muted-foreground">/ {formule.duree_mois} mois</span>
        </p>
        <div className="space-y-1.5 text-xs text-muted-foreground mt-4">
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>Espaces inclus : <span className="text-foreground font-medium">{inclus.length ? inclus.join(" + ") : "aucun"}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" /> Valable {formule.duree_mois} mois à compter de la validation
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 shrink-0" /> Renouvellement manuel
          </div>
        </div>

        {admin && (
          <>
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-xs text-muted-foreground">
                {nbActives ?? 0} adhérente{(nbActives ?? 0) > 1 ? "s" : ""} en cours
              </span>
              <button
                role="switch"
                aria-checked={formule.est_active}
                aria-label={`Formule ${formule.nom} proposée`}
                onClick={onBasculer}
                className={`relative h-6 w-10 rounded-full transition-colors ${formule.est_active ? "bg-green-600" : "bg-muted-foreground/40"}`}
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${formule.est_active ? "left-5" : "left-1"}`} />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={onModifier}
                className="flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-muted transition-colors">
                <Pencil className="w-3 h-3" /> Modifier
              </button>
              <button onClick={onDupliquer} title="Dupliquer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-muted transition-colors">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FormuleCard;
