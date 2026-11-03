import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { deplacer, type OffrePublique, type QuestionBonASavoir } from "@/lib/offres";
import ApercuOffres from "./ApercuOffres";
import { champ } from "./types";

interface Props {
  questions: QuestionBonASavoir[];
  /** Offres proposées, pour l'aperçu de la page. */
  offres: OffrePublique[];
  /** false tant que la table n'existe pas (migration 20261103000000). */
  disponible: boolean;
  onChange: () => void;
}

const NOUVELLE: QuestionBonASavoir = { id: "", question: "", reponse: "", est_publiee: true, ordre: 0 };

/** Onglet « Bon à savoir » d'Offre & adhésions : questions affichées en bas de la page publique « Nos offres ». */
const OngletBonASavoir = ({ questions, offres, disponible, onChange }: Props) => {
  const [edition, setEdition] = useState<QuestionBonASavoir | null>(null);
  const [apercu, setApercu] = useState<QuestionBonASavoir[] | null>(null);
  const [saving, setSaving] = useState(false);
  const triees = [...questions].sort((a, b) => a.ordre - b.ordre);

  if (!disponible) {
    return (
      <div role="alert" className="rounded-2xl border border-yellow-300 bg-yellow-50 p-6 text-sm text-yellow-900">
        Cet onglet attend la migration <code>20261103000000_nos_offres.sql</code> (table des questions « Bon à savoir »).
      </div>
    );
  }

  const enregistrer = async () => {
    if (!edition) return;
    const question = edition.question.trim();
    if (!question) { toast.error("La question est obligatoire."); return; }
    setSaving(true);
    const valeurs = { question, reponse: edition.reponse.trim(), est_publiee: edition.est_publiee };
    const creation = !edition.id;
    const { data, error } = creation
      ? await supabase.from("bon_a_savoir")
          .insert({ ...valeurs, ordre: Math.max(0, ...questions.map(q => q.ordre)) + 1 }).select("id").single()
      : await supabase.from("bon_a_savoir").update(valeurs).eq("id", edition.id).select("id").single();
    setSaving(false);
    if (error) { console.error("[BonASavoir.enregistrer]", error); toast.error("L'enregistrement a échoué."); return; }
    logAction(creation ? "bon_a_savoir.create" : "bon_a_savoir.update", "bon_a_savoir", data.id, { question, est_publiee: valeurs.est_publiee });
    toast.success(creation ? "Question ajoutée" : "Question enregistrée");
    setEdition(null);
    onChange();
  };

  const supprimer = async (q: QuestionBonASavoir) => {
    if (!window.confirm(`Supprimer la question « ${q.question} » ?`)) return;
    const { error } = await supabase.from("bon_a_savoir").delete().eq("id", q.id);
    if (error) { toast.error("La suppression a échoué."); return; }
    logAction("bon_a_savoir.delete", "bon_a_savoir", q.id, { question: q.question });
    onChange();
  };

  const basculer = async (q: QuestionBonASavoir) => {
    const { error } = await supabase.from("bon_a_savoir").update({ est_publiee: !q.est_publiee }).eq("id", q.id);
    if (error) { toast.error("La modification a échoué."); return; }
    logAction("bon_a_savoir.update", "bon_a_savoir", q.id, { est_publiee: !q.est_publiee });
    onChange();
  };

  const bouger = async (q: QuestionBonASavoir, sens: -1 | 1) => {
    const changements = deplacer(questions, q.id, sens);
    const resultats = await Promise.all(changements.map(c => supabase.from("bon_a_savoir").update({ ordre: c.ordre }).eq("id", c.id)));
    if (resultats.some(r => r.error)) toast.error("Le déplacement a échoué.");
    onChange();
  };

  // Aperçu depuis la fenêtre : la question en cours de saisie remplace l'ancienne (ou s'ajoute à la fin).
  const apercuAvecEdition = (q: QuestionBonASavoir) => {
    const brouillon = { ...q, id: q.id || "nouvelle", ordre: q.id ? q.ordre : Math.max(0, ...questions.map(x => x.ordre)) + 1 };
    return [...questions.filter(x => x.id !== q.id), brouillon];
  };

  const petitBouton = "flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Questions affichées en bas de la page publique « Nos offres », dans cet ordre. Une question en brouillon n'est
          pas visible du public ; sans question publiée, la section n'apparaît pas.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setApercu(questions)}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-2 text-sm text-terracotta hover:bg-muted">
            <Eye className="h-4 w-4" aria-hidden="true" /> Prévisualiser la page
          </button>
          <button onClick={() => setEdition({ ...NOUVELLE })}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Nouvelle question
          </button>
        </div>
      </div>

      {triees.length === 0 ? (
        <div className="py-14 text-center text-muted-foreground">
          <p className="font-medium">Aucune question pour l'instant</p>
          <p className="mt-1 text-sm">Cliquez sur « Nouvelle question » pour en ajouter une.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {triees.map((q, i) => (
            <li key={q.id} className="flex items-center gap-3 rounded-2xl border bg-card px-3 py-3">
              <div className="flex flex-col">
                <button onClick={() => bouger(q, -1)} disabled={i === 0} aria-label={`Monter « ${q.question} »`} className={petitBouton}>
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button onClick={() => bouger(q, 1)} disabled={i === triees.length - 1} aria-label={`Descendre « ${q.question} »`} className={petitBouton}>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{q.question}</p>
                <p className="truncate text-sm text-muted-foreground">{q.reponse || "(réponse à écrire)"}</p>
              </div>
              <button onClick={() => basculer(q)} aria-label={`${q.est_publiee ? "Dépublier" : "Publier"} « ${q.question} »`}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${q.est_publiee ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                {q.est_publiee ? "Publiée" : "Brouillon"}
              </button>
              <button onClick={() => setEdition(q)} aria-label={`Modifier « ${q.question} »`} className={petitBouton}><Pencil className="h-4 w-4" /></button>
              <button onClick={() => supprimer(q)} aria-label={`Supprimer « ${q.question} »`} className={petitBouton}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}

      {edition && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" role="dialog" aria-modal="true"
          aria-label={edition.id ? "Modifier la question" : "Nouvelle question"}>
          <div className="my-10 w-full max-w-xl rounded-2xl bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">{edition.id ? "Modifier la question" : "Nouvelle question"}</h2>
              <button onClick={() => setEdition(null)} aria-label="Fermer" className="rounded-lg p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label htmlFor="bas-question" className="mb-1.5 block text-sm font-medium">Question *</label>
                <input id="bas-question" value={edition.question} maxLength={300} className={champ}
                  onChange={e => setEdition({ ...edition, question: e.target.value })} placeholder="Le Café Papotages est-il ouvert sans adhésion ?" />
              </div>
              <div>
                <label htmlFor="bas-reponse" className="mb-1.5 block text-sm font-medium">Réponse</label>
                <textarea id="bas-reponse" value={edition.reponse} maxLength={3000} rows={5} className={champ}
                  onChange={e => setEdition({ ...edition, reponse: e.target.value })} />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={edition.est_publiee} onChange={e => setEdition({ ...edition, est_publiee: e.target.checked })} />
                Publiée sur la page « Nos offres »
              </label>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t px-6 py-4">
              <button onClick={() => setEdition(null)} className="rounded-full border px-4 py-2 text-sm hover:bg-muted">Annuler</button>
              <button type="button" onClick={() => setApercu(apercuAvecEdition(edition))}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary px-4 py-2 text-sm text-terracotta hover:bg-muted">
                <Eye className="h-4 w-4" aria-hidden="true" /> Prévisualiser
              </button>
              <button onClick={enregistrer} disabled={saving}
                className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {apercu && <ApercuOffres offres={offres} questions={apercu} onClose={() => setApercu(null)} />}
    </div>
  );
};

export default OngletBonASavoir;
