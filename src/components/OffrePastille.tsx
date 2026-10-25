import { fondFormule } from "@/lib/adhesions";
import { nomCourtOffre, type OffreEnCours } from "@/lib/droits";

/** Pastille colorée de l'offre en cours d'une personne (nom court de la formule). */
export const OffrePastille = ({ offre }: { offre: Pick<OffreEnCours, "nom" | "couleur"> }) => (
  <span
    className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
    style={{ backgroundColor: fondFormule(offre.couleur) }}
  >
    {nomCourtOffre(offre.nom)}
  </span>
);

/** Toutes les offres en cours d'une personne, ou « Sans adhésion ». */
const OffresPersonne = ({ offres }: { offres: OffreEnCours[] }) =>
  offres.length === 0 ? (
    <span className="inline-block whitespace-nowrap rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Sans adhésion</span>
  ) : (
    <span className="inline-flex flex-wrap gap-1">
      {offres.map(o => <OffrePastille key={o.formule_id} offre={o} />)}
    </span>
  );

export default OffresPersonne;
