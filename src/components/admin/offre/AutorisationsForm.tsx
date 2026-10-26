import ChampDateNaissance from "@/components/ChampDateNaissance";
import { SUPPORTS_IMAGE, type SupportImage } from "@/lib/autorisationImage";
import type { ValeursBulletin } from "@/lib/bulletin";
import { champ } from "./types";

interface Props {
  valeurs: ValeursBulletin;
  onChange: (valeurs: ValeursBulletin) => void;
}

/** Saisie des engagements et autorisations du bulletin (bulletin papier ou modification à la demande de la personne). */
const AutorisationsForm = ({ valeurs, onChange }: Props) => {
  const maj = (partiel: Partial<ValeursBulletin>) => onChange({ ...valeurs, ...partiel });
  const basculeSupport = (s: SupportImage) =>
    maj({ supports: valeurs.supports.includes(s) ? valeurs.supports.filter(x => x !== s) : [...valeurs.supports, s] });

  return (
    <div className="space-y-3 text-sm">
      <div>
        <label htmlFor="b-naissance" className="block text-xs font-medium mb-1">Date de naissance <span className="font-normal text-muted-foreground">(facultatif)</span></label>
        <ChampDateNaissance id="b-naissance" value={valeurs.naissance} onChange={naissance => maj({ naissance })} className={champ} />
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" className="mt-0.5" checked={valeurs.engagement} onChange={e => maj({ engagement: e.target.checked })} />
        <span>Statuts et règlement intérieur acceptés</span>
      </label>
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" className="mt-0.5" checked={valeurs.whatsapp} onChange={e => maj({ whatsapp: e.target.checked })} />
        <span>Souhaite rejoindre le groupe WhatsApp du club <span className="text-muted-foreground">(son numéro y sera visible)</span></span>
      </label>

      <fieldset className="rounded-xl border p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">Autorisation photo et vidéo</legend>
        <div className="flex gap-4 mb-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="photos" checked={valeurs.photos} onChange={() => maj({ photos: true })} /> Oui
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="photos" checked={!valeurs.photos} onChange={() => maj({ photos: false })} /> Non
          </label>
        </div>
        {valeurs.photos && (
          <div className="space-y-1.5 pl-1">
            {(Object.keys(SUPPORTS_IMAGE) as SupportImage[]).map(s => (
              <label key={s} className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={valeurs.supports.includes(s)} onChange={() => basculeSupport(s)} />
                <span>{SUPPORTS_IMAGE[s].libelle}</span>
              </label>
            ))}
            <p className="text-xs text-muted-foreground">Seules les cases cochées valent autorisation. Valable 3 ans à compter de la signature.</p>
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="b-signee" className="block text-xs font-medium mb-1">Date de signature du bulletin</label>
        <input id="b-signee" type="date" value={valeurs.signeeLe} onChange={e => maj({ signeeLe: e.target.value })} className={champ} />
      </div>
    </div>
  );
};

export default AutorisationsForm;
