import { LIBELLE_COURT_CRENEAU, type SaisieCreneaux } from "@/lib/creneaux";

interface Props {
  valeur: SaisieCreneaux;
  onChange: (valeur: SaisieCreneaux) => void;
}

const champ = "w-full rounded-lg border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50";
const petitLibelle = "block text-xs text-muted-foreground mb-1";

/**
 * « Créneaux proposés à l'inscription » (ateliers Business) : la matinée, l'après-midi et la journée entière se cochent
 * séparément ; seuls les créneaux cochés sont proposés dans le formulaire de pré-inscription.
 * Tarifs facultatifs (vides = aucun prix affiché, ce sont alors les tarifs de l'atelier qui s'appliquent) ;
 * places vides = illimitées ; la journée entière prend une place le matin et une l'après-midi.
 */
const TableauCreneaux = ({ valeur, onChange }: Props) => {
  const maj = <K extends keyof SaisieCreneaux>(cle: K, champs: Partial<SaisieCreneaux[K]>) =>
    onChange({ ...valeur, [cle]: { ...valeur[cle], ...champs } });

  return (
    <fieldset className="rounded-xl border bg-muted/20 p-4">
      <legend className="px-1 text-sm font-medium">Créneaux proposés à l'inscription</legend>
      <p className="mb-3 text-xs text-muted-foreground">
        Coche les créneaux que les participantes peuvent choisir (aucun coché = inscription à l'atelier, comme avant).
        Tarifs facultatifs : vides, aucun prix n'est affiché. Places vides = illimitées.
      </p>
      <div className="space-y-3">
        {(["matin", "apres_midi"] as const).map(cle => {
          const d = valeur[cle];
          const id = `creneau-${cle}`;
          return (
            <div key={cle} className="rounded-lg border bg-background p-3">
              <label className="flex min-h-6 cursor-pointer items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={d.actif} onChange={e => maj(cle, { actif: e.target.checked })} className="h-5 w-5 accent-primary" />
                {LIBELLE_COURT_CRENEAU[cle]}
              </label>
              {d.actif && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div><label htmlFor={`${id}-debut`} className={petitLibelle}>Début</label>
                    <input id={`${id}-debut`} type="time" value={d.debut} onChange={e => maj(cle, { debut: e.target.value })} className={champ} /></div>
                  <div><label htmlFor={`${id}-fin`} className={petitLibelle}>Fin</label>
                    <input id={`${id}-fin`} type="time" value={d.fin} onChange={e => maj(cle, { fin: e.target.value })} className={champ} /></div>
                  <div><label htmlFor={`${id}-places`} className={petitLibelle}>Places</label>
                    <input id={`${id}-places`} type="number" min={1} inputMode="numeric" value={d.places} placeholder="illimitées"
                      onChange={e => maj(cle, { places: e.target.value })} className={champ} /></div>
                  <div><label htmlFor={`${id}-tarif`} className={petitLibelle}>Tarif (€)</label>
                    <input id={`${id}-tarif`} type="number" min={0} step="0.01" inputMode="decimal" value={d.tarif} placeholder="facultatif"
                      onChange={e => maj(cle, { tarif: e.target.value })} className={champ} /></div>
                  <div><label htmlFor={`${id}-tarif-adh`} className={petitLibelle}>Tarif adhérente (€)</label>
                    <input id={`${id}-tarif-adh`} type="number" min={0} step="0.01" inputMode="decimal" value={d.tarif_adherent} placeholder="facultatif"
                      onChange={e => maj(cle, { tarif_adherent: e.target.value })} className={champ} /></div>
                </div>
              )}
            </div>
          );
        })}
        <div className="rounded-lg border bg-background p-3">
          <label className="flex min-h-6 cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={valeur.journee.actif} onChange={e => maj("journee", { actif: e.target.checked })} className="h-5 w-5 accent-primary" />
            {LIBELLE_COURT_CRENEAU.journee}
          </label>
          {valeur.journee.actif && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="sm:col-start-4"><label htmlFor="creneau-journee-tarif" className={petitLibelle}>Tarif (€)</label>
                  <input id="creneau-journee-tarif" type="number" min={0} step="0.01" inputMode="decimal" value={valeur.journee.tarif} placeholder="facultatif"
                    onChange={e => maj("journee", { tarif: e.target.value })} className={champ} /></div>
                <div><label htmlFor="creneau-journee-tarif-adh" className={petitLibelle}>Tarif adhérente (€)</label>
                  <input id="creneau-journee-tarif-adh" type="number" min={0} step="0.01" inputMode="decimal" value={valeur.journee.tarif_adherent} placeholder="facultatif"
                    onChange={e => maj("journee", { tarif_adherent: e.target.value })} className={champ} /></div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Du début de la matinée à la fin de l'après-midi ; prend une place le matin et une l'après-midi.</p>
            </>
          )}
        </div>
      </div>
    </fieldset>
  );
};

export default TableauCreneaux;
