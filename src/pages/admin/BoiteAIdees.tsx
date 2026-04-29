import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAction } from "@/utils/logAction";
import { withTimeout } from "@/utils/withTimeout";
import { toast } from "sonner";
import {
  Lightbulb, Plus, X, Loader2, Check, XCircle, MessageCircle, Trash2, Pencil,
  Filter, Sparkles
} from "lucide-react";

type Categorie = "evolution_site" | "ateliers" | "anomalie_site" | "membres" | "communication" | "evenements" | "organisation" | "autre";
type Reaction = "valide" | "non_valide" | "a_discuter";

interface Admin {
  id: string;
  prenom: string;
  nom: string;
  couleur_conges: string | null;
  code_couleur_conges: string | null;
}

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
  utilisateur_id: string;
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
  { key: "valide",     label: "Validé",       color: "text-green-600 bg-green-50 border-green-200",   icon: Check },
  { key: "non_valide", label: "Non validé",   color: "text-red-600 bg-red-50 border-red-200",         icon: XCircle },
  { key: "a_discuter", label: "À discuter",   color: "text-amber-600 bg-amber-50 border-amber-200",  icon: MessageCircle },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

const getCatLabel = (cat: Categorie) => CATEGORIES.find(c => c.key === cat)?.label ?? cat;
const getCatEmoji = (cat: Categorie) => CATEGORIES.find(c => c.key === cat)?.emoji ?? "💡";

const BoiteAIdees = () => {
  const { profile } = useAuth();
  const [idees, setIdees] = useState<Idee[]>([]);
  const [reactions, setReactions] = useState<IdeeReaction[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [filterCat, setFilterCat] = useState<Categorie | "all">("all");
  const [filterReact, setFilterReact] = useState<Reaction | "none" | "all">("all");

  // Modal création / édition
  const [modal, setModal] = useState<{ open: boolean; idee: Idee | null }>({ open: false, idee: null });
  const [form, setForm] = useState<{ categorie: Categorie; titre: string; description: string }>({
    categorie: "evolution_site",
    titre: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [reactingOn, setReactingOn] = useState<string | null>(null); // idee_id

  // ─── Fetch ───
  const fetchAll = async () => {
    try {
      const [iRes, rRes, aRes] = await withTimeout(Promise.all([
        supabase.from("idees").select("*").order("cree_le", { ascending: false }),
        supabase.from("idee_reactions").select("*"),
        supabase.from("utilisateurs").select("id, prenom, nom, couleur_conges, code_couleur_conges").eq("role", "administrateur"),
      ]));
      setIdees((iRes.data as Idee[]) ?? []);
      setReactions((rRes.data as IdeeReaction[]) ?? []);
      setAdmins((aRes.data as Admin[]) ?? []);
    } catch (err) {
      console.error("[BoiteAIdees.fetchAll] error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Map id admin → admin
  const adminsById = useMemo(() => {
    const map: Record<string, Admin> = {};
    admins.forEach(a => { map[a.id] = a; });
    return map;
  }, [admins]);

  // Réactions groupées par idée
  const reactionsByIdee = useMemo(() => {
    const map: Record<string, IdeeReaction[]> = {};
    reactions.forEach(r => {
      if (!map[r.idee_id]) map[r.idee_id] = [];
      map[r.idee_id].push(r);
    });
    return map;
  }, [reactions]);

  // Ma réaction sur une idée
  const myReaction = (ideeId: string): Reaction | null => {
    if (!profile?.id) return null;
    return reactions.find(r => r.idee_id === ideeId && r.utilisateur_id === profile.id)?.reaction ?? null;
  };

  // Liste filtrée
  const filtered = idees.filter(i => {
    if (filterCat !== "all" && i.categorie !== filterCat) return false;
    const rs = reactionsByIdee[i.id] ?? [];
    if (filterReact === "none" && rs.length > 0) return false;
    if (filterReact !== "all" && filterReact !== "none" && !rs.some(r => r.reaction === filterReact)) return false;
    return true;
  });

  // ─── Actions idée ───
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
      // Update
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
      // Create
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
        toast.success("Idée ajoutée ✨");
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
      logAction("idee.delete", "idees", idee.id, { titre: idee.titre, categorie: idee.categorie });
      toast.success("Idée supprimée");
      setIdees(prev => prev.filter(i => i.id !== idee.id));
    }
  };

  // ─── Actions réaction ───
  const handleReact = async (ideeId: string, reaction: Reaction) => {
    if (!profile?.id) return;
    setReactingOn(ideeId);
    const existing = reactions.find(r => r.idee_id === ideeId && r.utilisateur_id === profile.id);

    if (existing && existing.reaction === reaction) {
      // Retire la réaction
      const { error } = await supabase.from("idee_reactions").delete().eq("id", existing.id);
      if (error) {
        console.error(error);
        toast.error(`Erreur : ${error.message}`);
      } else {
        setReactions(prev => prev.filter(r => r.id !== existing.id));
      }
    } else if (existing) {
      // Change la réaction
      const { error } = await supabase.from("idee_reactions").update({ reaction }).eq("id", existing.id);
      if (error) {
        console.error(error);
        toast.error(`Erreur : ${error.message}`);
      } else {
        setReactions(prev => prev.map(r => r.id === existing.id ? { ...r, reaction } : r));
      }
    } else {
      // Nouvelle réaction
      const { data, error } = await supabase
        .from("idee_reactions")
        .insert({ idee_id: ideeId, utilisateur_id: profile.id, reaction })
        .select()
        .single();
      if (error) {
        console.error(error);
        toast.error(`Erreur : ${error.message}`);
      } else if (data) {
        setReactions(prev => [...prev, data as IdeeReaction]);
      }
    }
    setReactingOn(null);
  };

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-primary" />
            Boîte à idées
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Propose des idées, commente celles des autres. Chaque admin a sa couleur.
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

      {/* Filtres */}
      <div className="bg-card border rounded-2xl p-4 mb-5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" /> Filtres :
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value as Categorie | "all")}
          className="rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Toutes les catégories</option>
          {CATEGORIES.map(c => (
            <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
          ))}
        </select>
        <select
          value={filterReact}
          onChange={e => setFilterReact(e.target.value as Reaction | "none" | "all")}
          className="rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">Tous les statuts</option>
          <option value="none">Sans réaction</option>
          <option value="valide">Avec un "Validé"</option>
          <option value="non_valide">Avec un "Non validé"</option>
          <option value="a_discuter">Avec un "À discuter"</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} idée{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Liste des idées */}
      {filtered.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <Sparkles className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {idees.length === 0
              ? "Aucune idée pour le moment. Lance-toi avec le bouton \"Nouvelle idée\" !"
              : "Aucune idée ne correspond à ces filtres."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(idee => {
            const author = adminsById[idee.utilisateur_id];
            const authorColor = author?.code_couleur_conges ?? "#9ca3af"; // fallback gray
            const ideeReactions = reactionsByIdee[idee.id] ?? [];
            const currentReact = myReaction(idee.id);
            const isAuthor = idee.utilisateur_id === profile?.id;
            const isReacting = reactingOn === idee.id;

            // Réactions groupées
            const byType: Record<Reaction, IdeeReaction[]> = {
              valide: [], non_valide: [], a_discuter: [],
            };
            ideeReactions.forEach(r => { byType[r.reaction].push(r); });

            return (
              <div key={idee.id} className="bg-card border rounded-2xl overflow-hidden flex flex-col">
                {/* Bandeau couleur auteur */}
                <div className="h-1.5" style={{ backgroundColor: authorColor }} />

                <div className="p-5 flex-1 flex flex-col gap-3">
                  {/* Catégorie + actions */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium bg-muted px-2.5 py-1 rounded-full">
                      {getCatEmoji(idee.categorie)} {getCatLabel(idee.categorie)}
                    </span>
                    {isAuthor && (
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
                    )}
                  </div>

                  {/* Titre + description */}
                  <div>
                    <h3 className="font-semibold text-foreground text-lg leading-tight">{idee.titre}</h3>
                    {idee.description && (
                      <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{idee.description}</p>
                    )}
                  </div>

                  {/* Auteur + date */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: authorColor }}
                    />
                    <span className="font-medium text-foreground">{author?.prenom ?? "—"}</span>
                    <span>·</span>
                    <span>{formatDate(idee.cree_le)}</span>
                  </div>

                  {/* Réactions */}
                  <div className="mt-auto pt-3 border-t space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      {REACTIONS.map(r => {
                        const count = byType[r.key].length;
                        const isMine = currentReact === r.key;
                        const Icon = r.icon;
                        return (
                          <button
                            key={r.key}
                            onClick={() => handleReact(idee.id, r.key)}
                            disabled={isReacting}
                            className={`
                              flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all
                              ${isMine ? `${r.color} ring-2 ring-offset-1` : "bg-background text-muted-foreground hover:bg-muted"}
                              disabled:opacity-50
                            `}
                            style={isMine ? { boxShadow: `0 0 0 2px ${authorColor}` } : undefined}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {r.label}
                            <span className="ml-1 opacity-80">{count}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Pastilles des admins qui ont réagi, groupées par type */}
                    {ideeReactions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(byType) as Reaction[]).filter(k => byType[k].length > 0).map(k => {
                          const rObj = REACTIONS.find(x => x.key === k)!;
                          return (
                            <div key={k} className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                {rObj.label}:
                              </span>
                              {byType[k].map(r => {
                                const a = adminsById[r.utilisateur_id];
                                const color = a?.code_couleur_conges ?? "#9ca3af";
                                return (
                                  <span
                                    key={r.id}
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                    style={{ backgroundColor: color }}
                                    title={a?.prenom ?? "?"}
                                  >
                                    {(a?.prenom ?? "?")[0]?.toUpperCase()}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création/édition */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm"
          onClick={() => setModal({ open: false, idee: null })}
        >
          <div
            className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg mx-3 p-6 relative"
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
                {modal.idee ? "Enregistrer" : "Créer l'idée"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default BoiteAIdees;
