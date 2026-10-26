import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { creerCompte } from "@/lib/creerCompte";
import { MODES_REGLEMENT, type ModeReglement } from "@/lib/adhesions";
import { bulletinVierge, champsDepuisBulletin, type ValeursBulletin } from "@/lib/bulletin";
import AutorisationsForm from "./AutorisationsForm";
import { champ, type Formule, type MembreChoix } from "./types";

interface Props {
  formules: Formule[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Enregistre une demande d'adhésion saisie par l'équipe (espèces, virement) ; elle reste « à valider ».
 * La personne est choisie parmi les comptes existants OU créée à la volée (mêmes champs que « Membres ») :
 * elle est créée « inscrite » et ne devient « membre » qu'à la validation de son adhésion.
 */
const AjoutAdhesionModal = ({ formules, onClose, onSaved }: Props) => {
  const [membres, setMembres] = useState<MembreChoix[]>([]);
  const [recherche, setRecherche] = useState("");
  const [personne, setPersonne] = useState<"existante" | "nouvelle">("existante");
  const [membreId, setMembreId] = useState("");
  const [compte, setCompte] = useState({ prenom: "", nom: "", email: "", telephone: "", est_actif: false, mot_de_passe: "" });
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [formuleId, setFormuleId] = useState(formules.find(f => f.est_active)?.id ?? "");
  const [mode, setMode] = useState<ModeReglement>("virement");
  const [bulletin, setBulletin] = useState<ValeursBulletin>(bulletinVierge());
  const [commune, setCommune] = useState("");
  const [activite, setActivite] = useState("");
  const [saving, setSaving] = useState(false);

  const chargerMembres = () =>
    supabase.from("utilisateurs").select("id, prenom, nom, email, role, est_actif").neq("role", "administrateur").order("nom")
      .then(({ data }) => setMembres((data as MembreChoix[]) ?? []));

  useEffect(() => { chargerMembres(); }, []);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return membres.filter(m => !q || `${m.prenom} ${m.nom} ${m.email}`.toLowerCase().includes(q)).slice(0, 50);
  }, [membres, recherche]);

  const enregistrer = async () => {
    if (!formuleId) { toast.error("Choisissez une formule."); return; }
    if (personne === "existante" && !membreId) { toast.error("Choisissez une personne."); return; }
    setSaving(true);

    // 1. Personne nouvelle : on crée d'abord son compte (rôle « inscrit », jamais « membre » avant validation).
    let utilisateurId = membreId;
    let compteCree = false;
    if (personne === "nouvelle") {
      const resultat = await creerCompte({ ...compte, role: "inscrit", commune, activite });
      if (resultat.erreur) { setSaving(false); toast.error(resultat.erreur); return; }
      utilisateurId = resultat.id;
      compteCree = true;
    }

    // 2. Adhésion « à valider ».
    const { data, error } = await supabase
      .from("adhesions")
      .insert({ utilisateur_id: utilisateurId, formule_id: formuleId, mode_reglement: mode, ...champsDepuisBulletin(bulletin) })
      .select("id")
      .single();
    if (error) {
      setSaving(false);
      console.error("[AjoutAdhesionModal]", error);
      if (compteCree) {
        // Le compte existe déjà : on bascule sur « Personne existante » pour ne pas le recréer au second essai.
        await chargerMembres();
        setPersonne("existante");
        setMembreId(utilisateurId);
        toast.error("Le compte est créé, mais pas l'adhésion : vérifiez les informations puis réessayez.");
      } else {
        toast.error("L'enregistrement a échoué.");
      }
      return;
    }

    // Commune et activité sont des coordonnées de la personne : elles vont sur sa fiche, pas sur l'adhésion.
    if (!compteCree && (commune.trim() || activite.trim())) {
      const { error: errFiche } = await supabase.from("utilisateurs")
        .update({ ...(commune.trim() && { commune: commune.trim() }), ...(activite.trim() && { activite: activite.trim() }) })
        .eq("id", utilisateurId);
      if (errFiche) toast.error("L'adhésion est enregistrée, mais pas la commune ni l'activité.");
    }
    setSaving(false);
    logAction("adhesion.create", "adhesions", data.id, { utilisateur_id: utilisateurId, formule_id: formuleId, compte_cree: compteCree });
    toast.success(compteCree ? "Compte créé et adhésion ajoutée, à valider" : "Adhésion ajoutée, à valider");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Ajouter une adhésion">
      <div className="bg-background rounded-2xl w-full max-w-lg shadow-xl my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-lg">Ajouter une adhésion</h2>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div role="group" aria-label="Personne" className="inline-flex rounded-full border bg-card p-0.5 text-sm">
            {([["existante", "Personne existante"], ["nouvelle", "Nouvelle personne"]] as const).map(([cle, libelle]) => (
              <button key={cle} type="button" aria-pressed={personne === cle} onClick={() => setPersonne(cle)}
                className={`px-4 py-1.5 rounded-full font-medium ${personne === cle ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {libelle}
              </button>
            ))}
          </div>
          {personne === "existante" ? (
            <div>
              <label htmlFor="aj-rech" className="block text-sm font-medium mb-1.5">Personne *</label>
              <input id="aj-rech" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un nom, un e-mail…" className={champ} />
              <select aria-label="Personne" size={5} value={membreId} onChange={e => setMembreId(e.target.value)} className={`${champ} mt-2`}>
                {filtres.map(m => <option key={m.id} value={m.id}>{m.prenom} {m.nom} — {m.email}{m.est_actif === false ? " (compte inactif)" : ""}</option>)}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Elle n'a pas encore de compte ? Choisissez « Nouvelle personne » : son compte sera créé avec l'adhésion.</p>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="aj-prenom" className="block text-sm font-medium mb-1.5">Prénom *</label>
                  <input id="aj-prenom" value={compte.prenom} onChange={e => setCompte(c => ({ ...c, prenom: e.target.value }))} maxLength={100} className={champ} />
                </div>
                <div>
                  <label htmlFor="aj-nom" className="block text-sm font-medium mb-1.5">Nom *</label>
                  <input id="aj-nom" value={compte.nom} onChange={e => setCompte(c => ({ ...c, nom: e.target.value }))} maxLength={100} className={champ} />
                </div>
              </div>
              <div>
                <label htmlFor="aj-email" className="block text-sm font-medium mb-1.5">E-mail *</label>
                <input id="aj-email" type="email" value={compte.email} onChange={e => setCompte(c => ({ ...c, email: e.target.value }))} className={champ} />
              </div>
              <div>
                <label htmlFor="aj-tel" className="block text-sm font-medium mb-1.5">Téléphone</label>
                <input id="aj-tel" type="tel" value={compte.telephone} onChange={e => setCompte(c => ({ ...c, telephone: e.target.value }))} className={champ} />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={compte.est_actif} onChange={e => setCompte(c => ({ ...c, est_actif: e.target.checked }))} className="mt-1" />
                <span>
                  Activer sa connexion maintenant
                  <span className="block text-xs text-muted-foreground">
                    Décoché : fiche seule, aucun e-mail envoyé ; vous pourrez l'activer plus tard dans « Membres ». Coché : un e-mail de confirmation lui est envoyé.
                  </span>
                </span>
              </label>
              {compte.est_actif && (
                <div>
                  <label htmlFor="aj-mdp" className="block text-sm font-medium mb-1.5">Mot de passe provisoire *</label>
                  <div className="relative">
                    <input id="aj-mdp" type={voirMotDePasse ? "text" : "password"} value={compte.mot_de_passe}
                      onChange={e => setCompte(c => ({ ...c, mot_de_passe: e.target.value }))} placeholder="6 caractères minimum" className={`${champ} pr-10`} />
                    <button type="button" onClick={() => setVoirMotDePasse(v => !v)} aria-label={voirMotDePasse ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {voirMotDePasse ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Elle pourra le changer via « Mot de passe oublié ».</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Le compte est créé « Inscrit » ; elle devient « Membre » quand vous validez l'adhésion.</p>
            </div>
          )}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="aj-commune" className="block text-sm font-medium mb-1.5">Commune</label>
              <input id="aj-commune" value={commune} onChange={e => setCommune(e.target.value)} maxLength={100} className={champ} />
            </div>
            <div>
              <label htmlFor="aj-activite" className="block text-sm font-medium mb-1.5">Activité</label>
              <input id="aj-activite" value={activite} onChange={e => setActivite(e.target.value)} maxLength={150} placeholder="facultatif" className={champ} />
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Bulletin signé</p>
            <AutorisationsForm valeurs={bulletin} onChange={setBulletin} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-full text-sm hover:bg-muted">Annuler</button>
          <button onClick={enregistrer} disabled={saving}
            className="px-5 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {saving ? "Enregistrement…" : personne === "nouvelle" ? "Créer le compte et ajouter" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AjoutAdhesionModal;
