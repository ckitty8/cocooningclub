import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { COULEURS_FORMULE, MODES_REGLEMENT, type CouleurFormule, type ModeReglement } from "@/lib/adhesions";
import FormuleCard from "./FormuleCard";
import { champ, type Espace, type Formule } from "./types";

interface Props {
  /** Formule à modifier, ou modèle d'une nouvelle formule (id vide). */
  formule: Formule;
  espaces: Espace[];
  onClose: () => void;
  onSaved: () => void;
}

const FormuleModal = ({ formule, espaces, onClose, onSaved }: Props) => {
  const creation = !formule.id;
  const [nom, setNom] = useState(formule.nom);
  const [description, setDescription] = useState(formule.description ?? "");
  const [couleur, setCouleur] = useState(formule.couleur);
  const [prix, setPrix] = useState(String(formule.prix));
  const [duree, setDuree] = useState(String(formule.duree_mois));
  const [lien, setLien] = useState(formule.lien_helloasso ?? "");
  const [modes, setModes] = useState<string[]>(formule.modes_reglement);
  const [espacesIds, setEspacesIds] = useState<string[]>(formule.formule_espaces.map(fe => fe.espace_id));
  const [active, setActive] = useState(formule.est_active);
  const [saving, setSaving] = useState(false);

  const bascule = (liste: string[], valeur: string) =>
    liste.includes(valeur) ? liste.filter(v => v !== valeur) : [...liste, valeur];

  const prixNombre = Number(prix.replace(",", "."));
  const dureeNombre = Number(duree);
  const erreur =
    !nom.trim() ? "Le nom est obligatoire."
    : !(prix.trim() !== "" && Number.isFinite(prixNombre) && prixNombre >= 0) ? "Le tarif doit être un montant positif."
    : !(Number.isInteger(dureeNombre) && dureeNombre >= 1 && dureeNombre <= 60) ? "La durée doit être comprise entre 1 et 60 mois."
    : lien.trim() && !/^https:\/\//i.test(lien.trim()) ? "Le lien HelloAsso doit commencer par https://"
    : modes.length === 0 ? "Choisissez au moins un mode de règlement."
    : null;

  const apercu: Formule = {
    ...formule,
    nom, description: description || null, couleur,
    prix: Number.isFinite(prixNombre) ? prixNombre : 0,
    duree_mois: Number.isInteger(dureeNombre) && dureeNombre > 0 ? dureeNombre : 12,
    est_active: active,
    formule_espaces: espacesIds.map(espace_id => ({ espace_id })),
  };

  const enregistrer = async () => {
    if (erreur) { toast.error(erreur); return; }
    setSaving(true);
    const valeurs = {
      nom: nom.trim(),
      description: description.trim() || null,
      couleur,
      prix: prixNombre,
      duree_mois: dureeNombre,
      lien_helloasso: lien.trim() || null,
      modes_reglement: modes,
      est_active: active,
    };
    try {
      let id = formule.id;
      if (creation) {
        const { data, error } = await supabase.from("formules").insert({ ...valeurs, ordre: formule.ordre }).select("id").single();
        if (error) throw error;
        id = data.id;
      } else {
        const { error } = await supabase.from("formules").update(valeurs).eq("id", id);
        if (error) throw error;
        const { error: errDel } = await supabase.from("formule_espaces").delete().eq("formule_id", id);
        if (errDel) throw errDel;
      }
      if (espacesIds.length > 0) {
        const { error } = await supabase.from("formule_espaces").insert(espacesIds.map(espace_id => ({ formule_id: id, espace_id })));
        if (error) throw error;
      }
      logAction(creation ? "formule.create" : "formule.update", "formules", id, { nom: valeurs.nom, prix: valeurs.prix });
      toast.success(creation ? "Formule créée" : "Formule enregistrée");
      onSaved();
    } catch (err) {
      console.error("[FormuleModal.enregistrer]", err);
      toast.error("L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={creation ? "Nouvelle formule" : "Modifier la formule"}>
      <div className="bg-background rounded-2xl w-full max-w-4xl my-6 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-lg">{creation ? "Nouvelle formule" : "Modifier la formule"}</h2>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="f-nom" className="block text-sm font-medium mb-1.5">Nom *</label>
                <input id="f-nom" value={nom} onChange={e => setNom(e.target.value)} maxLength={80} placeholder="Cocooning Créatif" className={champ} />
              </div>
              <div>
                <label htmlFor="f-couleur" className="block text-sm font-medium mb-1.5">Couleur</label>
                <select id="f-couleur" value={couleur} onChange={e => setCouleur(e.target.value)} className={champ}>
                  {(Object.keys(COULEURS_FORMULE) as CouleurFormule[]).map(c => (
                    <option key={c} value={c}>{COULEURS_FORMULE[c].libelle}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="f-desc" className="block text-sm font-medium mb-1.5">Description</label>
              <textarea id="f-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={500}
                placeholder="Ateliers créatifs, rencontres et moments de partage." className={champ} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="f-prix" className="block text-sm font-medium mb-1.5">Cotisation (€) *</label>
                <input id="f-prix" value={prix} onChange={e => setPrix(e.target.value)} inputMode="decimal" placeholder="80" className={champ} />
              </div>
              <div>
                <label htmlFor="f-duree" className="block text-sm font-medium mb-1.5">Durée (mois) *</label>
                <input id="f-duree" value={duree} onChange={e => setDuree(e.target.value)} inputMode="numeric" placeholder="12" className={champ} />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">La durée court à partir de la date de validation de l'adhésion.</p>

            <fieldset>
              <legend className="block text-sm font-medium mb-2">Espaces inclus</legend>
              <div className="flex flex-wrap gap-2">
                {espaces.map(e => (
                  <label key={e.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${espacesIds.includes(e.id) ? "bg-primary/10 border-primary" : "bg-card"}`}>
                    <input type="checkbox" checked={espacesIds.includes(e.id)} onChange={() => setEspacesIds(bascule(espacesIds, e.id))} />
                    {e.nom}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="block text-sm font-medium mb-2">Modes de règlement proposés</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MODES_REGLEMENT) as ModeReglement[]).map(m => (
                  <label key={m} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${modes.includes(m) ? "bg-primary/10 border-primary" : "bg-card"}`}>
                    <input type="checkbox" checked={modes.includes(m)} onChange={() => setModes(bascule(modes, m))} />
                    {MODES_REGLEMENT[m]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="f-lien" className="block text-sm font-medium mb-1.5">Lien HelloAsso (formulaire d'adhésion)</label>
              <input id="f-lien" value={lien} onChange={e => setLien(e.target.value)} placeholder="https://www.helloasso.com/associations/…" className={champ} />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
              Formule proposée sur la page d'adhésion
            </label>
          </div>

          <aside>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Aperçu sur le site</p>
            <FormuleCard formule={apercu} espaces={espaces} />
          </aside>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t">
          <p className="text-sm text-destructive" role="alert">{erreur && nom ? erreur : ""}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-full text-sm hover:bg-muted">Annuler</button>
            <button onClick={enregistrer} disabled={saving}
              className="px-5 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormuleModal;
