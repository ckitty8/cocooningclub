import { useEffect, useMemo, useState } from "react";
import MembreLayout from "@/components/membre/MembreLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Lightbulb, Plus, X, Loader2, Check, XCircle, MessageCircle, Trash2, Pencil, Sparkles,
} from "lucide-react";

type Categorie = "evolution_site" | "ateliers" | "anomalie_site" | "membres" | "communication" | "evenements" | "organisation" | "autre";
type Reaction = "valide" | "non_valide" | "a_discuter";

interface Idee {
  id: string;
  utilisateur_id: string;
  categorie: Categorie;
  titre: string;
  description: string | null;
  cree_le: string;
}

interface IdeeReaction {
  id: string;
  idee_id: string;
  reaction: Reaction;
}

const CATEGORIES: { key: Categorie; label: string; emoji: string }[] = [
  { key: "evolution_site",  label: "Évolutions Site internet", emoji: "🚀" },
  { key: "ateliers",        label: "Ateliers",                  emoji: "🎨" },
  { key: "anomalie_site",   label: "Anomalie Site internet",    emoji: "🐛" },
  { key: "membres",         label: "Membres",                   emoji: "👥" },
  { key: "communication",   label: "Communication",             emoji: "📣" },
  { key: "evenements",      label: "Événements",                emoji: "✨" },
  { key: "organisation",    label: "Organisation",              emoji: "📋" },
  { key: "autre",           label: "Autre",                     emoji: "💡" },
];

const REACTIONS: { key: Reaction; label: string; color: string; icon: typeof Check }[] = [
  { key: "valide",     label: "Validé",     color: "text-green-600 bg-green-50 border-green-200",  icon: Check },
  { key: "non_valide", label: "Non validé", color: "text-red-600 bg-red-50 border-red-200",        icon: XCircle },
  { key: "a_discuter", label: "À discuter", color: "text-amber-600 bg-amber-50 border-amber-200",  icon: MessageCircle },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

const getCatLabel = (cat: Categorie) => CATEGORIES.find(c => c.key === cat)?.label ?? cat;
const getCatEmoji = (cat: Categorie) => CATEGORIES.find(c => c.key === cat)?.emoji ?? "💡";

const BoiteAIdees = () => {
  const { profile } = useAuth();
  const [idees, setIdees] = useState<Idee[]>([]);
  const [reactions, setReactions] = useState<IdeeReaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<{ open: boolean; idee: Idee | null }>({ open: false, idee: null });
  const [form, setForm] = useState<{ categorie: Categorie; titre: string; description: string }>({
    categorie: "evolution_site",
    titre: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  // La RLS limite déjà "idees" aux idées de l'utilisateur courant (+ admin,
  // non pertinent ici) et "idee_reactions" aux réactions sur ses propres
  // idées : pas besoin de filtrer côté client.
  const fetchAll = async () => {
    try {
      const [iRes, rRes] = await Promise.all([
        supabase.from("idees").select("*").order("cree_le", { ascending: false }),
        supabase.from("idee_reactions").select("id, idee_id, reaction"),
      ]);
      setIdees((iRes.data as Idee[]) ?? []);
      setReactions((rRes.data as IdeeReaction[]) ?? []);
    } catch (err) {
      console.error("[membre.BoiteAIdees.fetchAll] error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const reactionsByIdee = useMemo(() => {
    const map: Record<string, IdeeReaction[]> = {};
    reactions.forEach(r => {
      if (!map[r.idee_id]) map[r.idee_id] = [];
      map[r.idee_id].push(r);
    });
    return map;
  }, [reactions]);

  const openCreate = () => {
    setForm({ categorie: "evolution_site", titre: "", description: "" });
    setModal({ open: true, idee: null });
  };

  const openEdit = (idee: Idee) => {
    setForm({ categorie: idee.categorie, titre: idee.titre, description: idee.description ?? "" });
    setModal({ open: true, idee });
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    if (!form.titre.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    setSaving(true);
    if (modal.idee) {
      const { error } = await supabase
        .from("idees")
        .update({ categorie: form.categorie, titre: form.titre.trim(), description: form.description.trim() || null })
        .eq("id", modal.idee.id);
      if (error) toast.error("Erreur lors de la mise à jour");
      else {
        toast.success("Idée mise à jour");
        fetchAll();
        setModal({ open: false, idee: null });
      }
    } else {
      const { error } = await supabase.from("idees").insert({
        utilisateur_id: profile.id,
        categorie: form.categorie,
        titre: form.titre.trim(),
        description: form.description.trim() || null,
      });
      if (error) {
        console.error(error);
        toast.error(`Erreur : ${error.message}`);
      } else {
        toast.success("Idée envoyée ✨");
        fetchAll();
        setModal({ open: false, idee: null });
      }
    }
    setSaving(false);
  };

  const handleDelete = async (idee: Idee) => {
    if (!confirm(`Supprimer l'idée "${idee.titre}" ?`)) return;
    const { error } = await supabase.from("idees").delete().eq("id", idee.id);
    if (error) toast.error("Erreur");
    else {
      toast.success("Idée supprimée");
      setIdees(prev => prev.filter(i => i.id !== idee.id));
    }
  };

  if (loading) return (
    <MembreLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </MembreLayout>
  );

  return (
    <MembreLayout>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-primary" />
            Boîte à idées
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Propose une idée à l'équipe. Seuls toi et les admins peuvent la voir.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nouvelle idée
        </button>
      </div>

      {idees.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <Sparkles className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">
            Aucune idée envoyée pour le moment. Lance-toi avec le bouton "Nouvelle idée" !
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {idees.map(idee => {
            const ideeReactions = reactionsByIdee[idee.id] ?? [];
            return (
              <div key={idee.id} className="bg-card border rounded-2xl overflow-hidden flex flex-col">
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full">
                      {getCatEmoji(idee.categorie)} {getCatLabel(idee.categorie)}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(idee)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(idee)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground text-lg leading-tight">{idee.titre}</h3>
                    {idee.description && (
                      <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{idee.description}</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">{formatDate(idee.cree_le)}</p>

                  {ideeReactions.length > 0 && (
                    <div className="mt-auto pt-3 border-t flex gap-2 flex-wrap">
                      {ideeReactions.map(r => {
                        const rObj = REACTIONS.find(x => x.key === r.reaction)!;
                        const Icon = rObj.icon;
                        return (
                          <span
                            key={r.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${rObj.color}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {rObj.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setModal({ open: false, idee: null })}
        >
          <div
            className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setModal({ open: false, idee: null })}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-foreground mb-1">
              {modal.idee ? "Modifier l'idée" : "Nouvelle idée"}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {modal.idee ? "Mets à jour ton idée." : "Propose une idée à l'équipe."}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Catégorie</label>
                <select
                  value={form.categorie}
                  onChange={e => setForm({ ...form, categorie: e.target.value as Categorie })}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Titre *</label>
                <input
                  type="text"
                  value={form.titre}
                  onChange={e => setForm({ ...form, titre: e.target.value })}
                  placeholder="Une phrase courte"
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={5}
                  placeholder="Détaille ton idée (optionnel)"
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setModal({ open: false, idee: null })}
                className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.titre.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {modal.idee ? "Enregistrer" : "Envoyer l'idée"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MembreLayout>
  );
};

export default BoiteAIdees;
