import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { MODES_REGLEMENT, type ModeReglement } from "@/lib/adhesions";
import { champ, type Formule, type MembreChoix } from "./types";

interface Props {
  formules: Formule[];
  onClose: () => void;
  onSaved: () => void;
}

/** Enregistre une demande d'adhésion saisie par l'équipe (espèces, virement) ; elle reste « à valider ». */
const AjoutAdhesionModal = ({ formules, onClose, onSaved }: Props) => {
  const [membres, setMembres] = useState<MembreChoix[]>([]);
  const [recherche, setRecherche] = useState("");
  const [membreId, setMembreId] = useState("");
  const [formuleId, setFormuleId] = useState(formules.find(f => f.est_active)?.id ?? "");
  const [mode, setMode] = useState<ModeReglement>("virement");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("utilisateurs").select("id, prenom, nom, email, role").eq("est_actif", true).neq("role", "administrateur").order("nom")
      .then(({ data }) => setMembres((data as MembreChoix[]) ?? []));
  }, []);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return membres.filter(m => !q || `${m.prenom} ${m.nom} ${m.email}`.toLowerCase().includes(q)).slice(0, 50);
  }, [membres, recherche]);

  const enregistrer = async () => {
    if (!membreId || !formuleId) { toast.error("Choisissez une personne et une formule."); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("adhesions")
      .insert({ utilisateur_id: membreId, formule_id: formuleId, mode_reglement: mode })
      .select("id")
      .single();
    setSaving(false);
    if (error) { console.error("[AjoutAdhesionModal]", error); toast.error("L'enregistrement a échoué."); return; }
    logAction("adhesion.create", "adhesions", data.id, { utilisateur_id: membreId, formule_id: formuleId });
    toast.success("Adhésion ajoutée, à valider");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Ajouter une adhésion">
      <div className="bg-background rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-lg">Ajouter une adhésion</h2>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="aj-rech" className="block text-sm font-medium mb-1.5">Personne *</label>
            <input id="aj-rech" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un nom, un e-mail…" className={champ} />
            <select aria-label="Personne" size={5} value={membreId} onChange={e => setMembreId(e.target.value)} className={`${champ} mt-2`}>
              {filtres.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom} — {m.email}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-1">La personne doit avoir un compte. Sinon, créez-la d'abord dans « Membres ».</p>
          </div>
          <div>
            <label htmlFor="aj-formule" className="block text-sm font-medium mb-1.5">Formule *</label>
            <select id="aj-formule" value={formuleId} onChange={e => setFormuleId(e.target.value)} className={champ}>
              {formules.filter(f => f.est_active).map(f => <option key={f.id} value={f.id}>{f.nom} — {f.prix} €</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="aj-mode" className="block text-sm font-medium mb-1.5">Mode de règlement</label>
            <select id="aj-mode" value={mode} onChange={e => setMode(e.target.value as ModeReglement)} className={champ}>
              {(Object.keys(MODES_REGLEMENT) as ModeReglement[]).map(m => <option key={m} value={m}>{MODES_REGLEMENT[m]}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-full text-sm hover:bg-muted">Annuler</button>
          <button onClick={enregistrer} disabled={saving}
            className="px-5 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? "Enregistrement…" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AjoutAdhesionModal;
