import { useState } from "react";
import { Mail, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import {
  aujourdhuiIso, finDeValidite, formaterNumero, fondFormule, LIBELLES_STATUT, MODES_REGLEMENT,
  statutAdhesion, type ModeReglement,
} from "@/lib/adhesions";

import { autorisationDepuisChamps, bulletinDepuisChamps, champsDepuisBulletin, type ValeursBulletin } from "@/lib/bulletin";
import BadgePhotos from "@/components/BadgePhotos";
import AutorisationsForm from "./AutorisationsForm";
import { champ, type Adhesion } from "./types";
import { dateFr } from "@/lib/dates";

interface Props {
  adhesion: Adhesion;
  onClose: () => void;
  onDone: () => void;
}


/** Fiche d'une adhésion : reprend le « cadre réservé à l'association » du bulletin. */
const AdhesionDrawer = ({ adhesion, onClose, onDone }: Props) => {
  const aValider = adhesion.statut === "en_attente";
  const [mode, setMode] = useState<ModeReglement>(adhesion.mode_reglement);
  const [recueLe, setRecueLe] = useState(adhesion.cotisation_recue_le ?? "");
  const [validation, setValidation] = useState(adhesion.date_validation ?? aujourdhuiIso());
  const [saving, setSaving] = useState(false);
  const [edition, setEdition] = useState(false);
  const [bulletin, setBulletin] = useState<ValeursBulletin>(() => bulletinDepuisChamps(adhesion));

  const enregistrerBulletin = async () => {
    setSaving(true);
    const { error } = await supabase.from("adhesions").update(champsDepuisBulletin(bulletin)).eq("id", adhesion.id);
    setSaving(false);
    if (error) { console.error("[AdhesionDrawer.bulletin]", error); toast.error("L'enregistrement a échoué."); return; }
    logAction("adhesion.bulletin", "adhesions", adhesion.id, { numero: adhesion.numero, photos: bulletin.photos });
    toast.success("Bulletin mis à jour");
    onDone();
  };

  const personne = adhesion.utilisateurs;
  const nomComplet = `${personne?.prenom ?? ""} ${personne?.nom ?? ""}`.trim() || "—";
  const duree = adhesion.formules?.duree_mois ?? 12;
  const fin = aValider ? (validation ? finDeValidite(validation, duree) : "") : adhesion.valable_jusqu_au ?? "";
  const statut = statutAdhesion(adhesion, aujourdhuiIso());

  const valider = async () => {
    if (!validation) { toast.error("Indiquez la date de validation."); return; }
    setSaving(true);
    const { error } = await supabase.rpc("valider_adhesion", {
      p_id: adhesion.id, p_mode: mode, p_recue_le: recueLe || null, p_validation: validation,
    });
    setSaving(false);
    if (error) {
      console.error("[AdhesionDrawer.valider]", error);
      toast.error("La validation a échoué.");
      return;
    }
    logAction("adhesion.valider", "adhesions", adhesion.id, { numero: adhesion.numero, email: personne?.email ?? null });
    toast.success(`Adhésion de ${nomComplet} validée`);
    onDone();
  };

  const refuser = async () => {
    if (!confirm(`Refuser l'adhésion de ${nomComplet} ?`)) return;
    setSaving(true);
    const { error } = await supabase.from("adhesions").update({ statut: "refusee" }).eq("id", adhesion.id);
    setSaving(false);
    if (error) { toast.error("L'opération a échoué."); return; }
    logAction("adhesion.refuser", "adhesions", adhesion.id, { numero: adhesion.numero });
    toast.success("Adhésion refusée");
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label="Fiche d'adhésion">
      <div className="bg-background w-full max-w-md h-full overflow-y-auto shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">Demande d'adhésion</span>
          <button onClick={onClose} aria-label="Fermer" className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <h2 className="font-display text-2xl">{nomComplet}</h2>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {adhesion.formules && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: fondFormule(adhesion.formules.couleur) }}>
              {adhesion.formules.nom} · {adhesion.montant} €
            </span>
          )}
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted">{LIBELLES_STATUT[statut]}</span>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground mt-4 mb-6">
          {personne?.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4" />{personne.email}</div>}
          {personne?.telephone && <div className="flex items-center gap-2"><Phone className="w-4 h-4" />{personne.telephone}</div>}
          <div>Demande du {new Date(adhesion.cree_le).toLocaleDateString("fr-FR")}</div>
        </div>

        <div className="rounded-2xl p-4 bg-card border space-y-4">
          <p className="font-medium text-primary text-sm">Cadre réservé à l'association</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">N° d'adhérente</label>
              <div className="border rounded-xl px-3 py-2.5 text-sm bg-green-50 border-green-200 font-semibold">{formaterNumero(adhesion.numero)}</div>
            </div>
            <div>
              <label htmlFor="a-mode" className="block text-xs font-medium mb-1">Mode de règlement</label>
              <select id="a-mode" value={mode} onChange={e => setMode(e.target.value as ModeReglement)} disabled={!aValider} className={champ}>
                {(Object.keys(MODES_REGLEMENT) as ModeReglement[]).map(m => <option key={m} value={m}>{MODES_REGLEMENT[m]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="a-recue" className="block text-xs font-medium mb-1">Cotisation reçue le</label>
              {aValider
                ? <input id="a-recue" type="date" value={recueLe} onChange={e => setRecueLe(e.target.value)} className={champ} />
                : <div className="border rounded-xl px-3 py-2.5 text-sm bg-background">{dateFr(adhesion.cotisation_recue_le)}</div>}
            </div>
            <div>
              <label htmlFor="a-valid" className="block text-xs font-medium mb-1">Date de validation</label>
              {aValider
                ? <input id="a-valid" type="date" value={validation} onChange={e => setValidation(e.target.value)} className={champ} />
                : <div className="border rounded-xl px-3 py-2.5 text-sm bg-background">{dateFr(adhesion.date_validation)}</div>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Valable jusqu'au</label>
            <div className="border rounded-xl px-3 py-2.5 text-sm bg-green-50 border-green-200 flex justify-between">
              <b>{dateFr(fin || null)}</b>
              {aValider && <span className="text-green-700">{duree} mois · calculée</span>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-card border mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-medium text-primary text-sm">Bulletin</p>
            {!edition && (
              <button onClick={() => setEdition(true)} className="text-xs underline text-muted-foreground hover:text-foreground">Modifier</button>
            )}
          </div>
          {edition ? (
            <>
              <AutorisationsForm valeurs={bulletin} onChange={setBulletin} />
              <div className="flex gap-2 pt-1">
                <button onClick={enregistrerBulletin} disabled={saving}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50">Enregistrer</button>
                <button onClick={() => { setEdition(false); setBulletin(bulletinDepuisChamps(adhesion)); }}
                  className="px-4 py-2 rounded-full text-xs border hover:bg-muted">Annuler</button>
              </div>
            </>
          ) : (
            <ul className="space-y-1 text-muted-foreground">
              <li>Statuts et règlement : {adhesion.engagement_accepte_le ? `acceptés le ${dateFr(adhesion.engagement_accepte_le)}` : "non renseigné"}</li>
              <li>Groupe WhatsApp : {adhesion.whatsapp ? "oui" : "non"}</li>
              <li><BadgePhotos autorisation={autorisationDepuisChamps(adhesion, adhesion.utilisateur_id)} /></li>
              {(personne?.commune || personne?.activite) && (
                <li>{[personne?.commune, personne?.activite].filter(Boolean).join(" · ")}</li>
              )}
            </ul>
          )}
        </div>

        {aValider && (
          <>
            <div className="flex gap-2 mt-5">
              <button onClick={valider} disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                ✓ Valider l'adhésion
              </button>
              <button onClick={refuser} disabled={saving}
                className="px-4 py-2.5 rounded-full text-sm border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50">
                Refuser
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              À la validation, la personne passe de « inscrit » à « membre » et accède à l'espace membre.
            </p>
          </>
        )}
        {personne?.email && (
          <a href={`mailto:${personne.email}`} className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 text-xs border rounded-full hover:bg-muted">
            <Mail className="w-3 h-3" /> Écrire
          </a>
        )}
      </div>
    </div>
  );
};

export default AdhesionDrawer;
