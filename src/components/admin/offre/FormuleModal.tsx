import { useState } from "react";
import { Eye, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { COULEURS_FORMULE, MODES_REGLEMENT, type CouleurFormule, type ModeReglement } from "@/lib/adhesions";
import CarteOffre from "@/components/offres/CarteOffre";
import {
  ESPACES_OFFRE, lignesCompris, lireActivites, versOffre,
  type ActiviteOffre, type QuestionBonASavoir, type SlugEspaceOffre,
} from "@/lib/offres";
import ApercuOffres from "./ApercuOffres";
import { champ, type Espace, type Formule } from "./types";
import Requis from "@/components/Requis";

interface Props {
  /** Formule à modifier, ou modèle d'une nouvelle formule (id vide). */
  formule: Formule;
  espaces: Espace[];
  /** Toutes les formules (pour l'aperçu de la page complète). */
  formules?: Formule[];
  /** Questions « Bon à savoir » (aperçu). */
  questions?: QuestionBonASavoir[];
  /** false tant que la migration 20261103000000 n'est pas appliquée : les champs de la page « Nos offres » sont masqués. */
  contenuDisponible?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const nombre = (texte: string) => Number(texte.replace(",", "."));

const FormuleModal = ({ formule, espaces, formules = [], questions = [], contenuDisponible = true, onClose, onSaved }: Props) => {
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
  const [rythme, setRythme] = useState(formule.rythme ?? "");
  const [prixBarre, setPrixBarre] = useState(formule.prix_barre === null || formule.prix_barre === undefined ? "" : String(formule.prix_barre));
  const [miseEnAvant, setMiseEnAvant] = useState(formule.mise_en_avant ?? false);
  const [activites, setActivites] = useState<ActiviteOffre[]>(lireActivites(formule.activites));
  const [compris, setCompris] = useState((formule.compris ?? []).join("\n"));
  const [apercuOuvert, setApercuOuvert] = useState(false);
  const [saving, setSaving] = useState(false);

  const changerActivite = (i: number, champActivite: keyof ActiviteOffre, valeur: string) =>
    setActivites(liste => liste.map((a, k) => (k === i ? { ...a, [champActivite]: valeur } : a)));

  const bascule = (liste: string[], valeur: string) =>
    liste.includes(valeur) ? liste.filter(v => v !== valeur) : [...liste, valeur];

  const prixNombre = nombre(prix);
  const prixBarreNombre = prixBarre.trim() ? nombre(prixBarre) : null;
  const dureeNombre = Number(duree);
  const erreur =
    !nom.trim() ? "Le nom est obligatoire."
    : !(prix.trim() !== "" && Number.isFinite(prixNombre) && prixNombre >= 0) ? "Le tarif doit être un montant positif."
    : !(Number.isInteger(dureeNombre) && dureeNombre >= 1 && dureeNombre <= 60) ? "La durée doit être comprise entre 1 et 60 mois."
    : lien.trim() && !/^https:\/\//i.test(lien.trim()) ? "Le lien HelloAsso doit commencer par https://"
    : modes.length === 0 ? "Choisissez au moins un mode de règlement."
    : prixBarreNombre !== null && !(Number.isFinite(prixBarreNombre) && prixBarreNombre >= 0) ? "Le prix barré doit être un montant positif."
    : rythme.length > 120 ? "Le rythme ne doit pas dépasser 120 caractères."
    : null;

  const apercu: Formule = {
    ...formule,
    nom, description: description || null, couleur,
    prix: Number.isFinite(prixNombre) ? prixNombre : 0,
    duree_mois: Number.isInteger(dureeNombre) && dureeNombre > 0 ? dureeNombre : 12,
    est_active: active,
    formule_espaces: espacesIds.map(espace_id => ({ espace_id })),
  };

  // Contenu public de la carte, tel qu'il sera enregistré.
  const contenu = {
    rythme: rythme.trim() || null,
    prix_barre: prixBarreNombre !== null && Number.isFinite(prixBarreNombre) ? prixBarreNombre : null,
    mise_en_avant: miseEnAvant,
    activites: activites.filter(a => a.nom.trim()).map(a => ({ nom: a.nom.trim(), lieu: a.lieu.trim(), espace: a.espace })),
    compris: lignesCompris(compris),
  };
  const offreApercu = versOffre({ ...apercu, ...contenu, id: formule.id || "nouvelle" } as unknown as Record<string, unknown>);
  // Page complète : les autres formules proposées, et celle-ci à sa place (même si elle n'est pas encore proposée).
  const offresPage = [
    ...formules.filter(f => f.est_active && f.id !== formule.id).map(f => versOffre(f as unknown as Record<string, unknown>)),
    ...(active ? [offreApercu] : []),
  ];

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
      ...(contenuDisponible ? contenu : {}),
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
                <label htmlFor="f-nom" className="block text-sm font-medium mb-1.5">Nom<Requis /></label>
                <input id="f-nom" value={nom} onChange={e => setNom(e.target.value)} maxLength={80} placeholder="L'Espace Chill" className={champ} />
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
                <label htmlFor="f-prix" className="block text-sm font-medium mb-1.5">Cotisation (€)<Requis /></label>
                <input id="f-prix" value={prix} onChange={e => setPrix(e.target.value)} inputMode="decimal" placeholder="80" className={champ} />
              </div>
              <div>
                <label htmlFor="f-duree" className="block text-sm font-medium mb-1.5">Durée (mois)<Requis /></label>
                <input id="f-duree" value={duree} onChange={e => setDuree(e.target.value)} inputMode="numeric" placeholder="12" className={champ} />
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">La durée court à partir de la date de validation de l'adhésion.</p>

            {contenuDisponible ? (
              <div className="space-y-4 rounded-2xl border bg-card p-4">
                <p className="text-sm font-semibold">Carte de la page « Nos offres »</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="f-rythme" className="block text-sm font-medium mb-1.5">Rythme</label>
                    <input id="f-rythme" value={rythme} onChange={e => setRythme(e.target.value)} maxLength={120} placeholder="2 jeudis par mois" className={champ} />
                  </div>
                  <div>
                    <label htmlFor="f-barre" className="block text-sm font-medium mb-1.5">Prix barré (€, facultatif)</label>
                    <input id="f-barre" value={prixBarre} onChange={e => setPrixBarre(e.target.value)} inputMode="decimal" placeholder="180" className={champ} />
                  </div>
                </div>

                <fieldset>
                  <legend className="block text-sm font-medium mb-2">Activités et lieux</legend>
                  <div className="space-y-2">
                    {activites.map((a, i) => (
                      <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_130px_auto]">
                        <input aria-label={`Activité ${i + 1}`} value={a.nom} onChange={e => changerActivite(i, "nom", e.target.value)} placeholder="Coworking*" className={champ} />
                        <input aria-label={`Lieu de l'activité ${i + 1}`} value={a.lieu} onChange={e => changerActivite(i, "lieu", e.target.value)} placeholder="La Picorette, Le Raincy" className={champ} />
                        <select aria-label={`Couleur de l'activité ${i + 1}`} value={a.espace} onChange={e => changerActivite(i, "espace", e.target.value as SlugEspaceOffre)} className={champ}>
                          {(Object.keys(ESPACES_OFFRE) as SlugEspaceOffre[]).map(slug => <option key={slug} value={slug}>{ESPACES_OFFRE[slug]}</option>)}
                        </select>
                        <button type="button" onClick={() => setActivites(liste => liste.filter((_, k) => k !== i))}
                          aria-label={`Retirer l'activité ${i + 1}`} className="flex h-10 w-10 items-center justify-center rounded-xl border hover:bg-muted">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setActivites(liste => [...liste, { nom: "", lieu: "", espace: "papotages" }])}
                    disabled={activites.length >= 12}
                    className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium hover:bg-muted disabled:opacity-50">
                    <Plus className="h-3.5 w-3.5" /> Ajouter une activité
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">Un astérisque (*) renvoie à « Consommation sur place obligatoire ». Un lieu « à définir » n'a pas de lien vers la carte.</p>
                </fieldset>

                <div>
                  <label htmlFor="f-compris" className="block text-sm font-medium mb-1.5">Ce qui est compris <span className="font-normal text-muted-foreground">(une ligne par point)</span></label>
                  <textarea id="f-compris" value={compris} onChange={e => setCompris(e.target.value)} rows={6} className={champ}
                    placeholder={"La location de la salle pour nos journées de création.\nLe magazine du club."} />
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={miseEnAvant} onChange={e => setMiseEnAvant(e.target.checked)} />
                  Mettre en avant (« Le plus complet »)
                </label>
              </div>
            ) : (
              <p className="rounded-2xl border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-900">
                Le contenu de la page « Nos offres » (rythme, activités, ce qui est compris) sera modifiable ici après la
                migration <code>20261103000000_nos_offres.sql</code>.
              </p>
            )}

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
              Formule proposée sur la page « Nos offres »
            </label>
          </div>

          <aside>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Aperçu de la carte</p>
            <div className="theme-vitrine rounded-2xl bg-background p-3">
              <div className="pointer-events-none"><CarteOffre offre={offreApercu} /></div>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t">
          <p className="text-sm text-destructive" role="alert">{erreur && nom ? erreur : ""}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-full text-sm hover:bg-muted">Annuler</button>
            <button type="button" onClick={() => setApercuOuvert(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-primary rounded-full text-sm text-terracotta hover:bg-muted">
              <Eye className="h-4 w-4" aria-hidden="true" /> Prévisualiser
            </button>
            <button onClick={enregistrer} disabled={saving}
              className="px-5 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
      {apercuOuvert && (
        <ApercuOffres offres={offresPage} questions={questions} surligneeId={offreApercu.id} onClose={() => setApercuOuvert(false)} />
      )}
    </div>
  );
};

export default FormuleModal;
