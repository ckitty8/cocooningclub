import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { withTimeout } from "@/utils/withTimeout";
import { toast } from "sonner";
import {
  Check, X, Star, MessageSquare, Loader2, Trash2, Plus,
  CheckCircle2, XCircle, Clock, User, Calendar,
} from "lucide-react";

type StatutModeration = "en_attente" | "approuve" | "rejete";

interface Avis {
  id: string;
  utilisateur_id: string | null;
  inscription_id: string | null;
  nom_auteur: string | null;
  note: number;
  commentaire: string | null;
  moderation: StatutModeration;
  mis_en_avant: boolean;
  cree_le: string;
  modere_le: string | null;
  utilisateurs?: {
    prenom: string | null;
    nom: string | null;
    email: string | null;
    role: string | null;
  } | null;
  inscriptions?: {
    ateliers: {
      id: string;
      titre: string;
      date_atelier: string;
    } | null;
  } | null;
}

type Filter = StatutModeration | "tous";

const statutBadge: Record<StatutModeration, string> = {
  en_attente: "bg-amber-100 text-amber-700",
  approuve:   "bg-green-100 text-green-700",
  rejete:     "bg-red-100 text-red-700",
};

const statutLabel: Record<StatutModeration, string> = {
  en_attente: "En attente",
  approuve:   "Approuvé",
  rejete:     "Rejeté",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

const Avis = () => {
  const [avis, setAvis] = useState<Avis[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("en_attente");
  const [actingOn, setActingOn] = useState<string | null>(null);

  // Modal "Nouveau témoignage"
  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addForm, setAddForm] = useState({
    nom_auteur: "",
    note: 5,
    commentaire: "",
    moderation: "approuve" as StatutModeration,
    mis_en_avant: false,
  });

  const fetchAll = async () => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("avis")
          .select("*, utilisateurs(prenom, nom, email, role), inscriptions(ateliers(id, titre, date_atelier))")
          .order("cree_le", { ascending: false })
      );
      if (error) throw error;
      setAvis((data as unknown as Avis[]) ?? []);
    } catch (err) {
      console.error("[Avis.fetchAll] error:", err);
      toast.error("Erreur lors du chargement des témoignages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    if (filter === "tous") return avis;
    return avis.filter(a => a.moderation === filter);
  }, [avis, filter]);

  const counts = useMemo(() => ({
    en_attente: avis.filter(a => a.moderation === "en_attente").length,
    approuve:   avis.filter(a => a.moderation === "approuve").length,
    rejete:     avis.filter(a => a.moderation === "rejete").length,
    tous:       avis.length,
  }), [avis]);

  const setModeration = async (a: Avis, next: StatutModeration) => {
    if (a.moderation === next) return;
    setActingOn(a.id);
    const payload = {
      moderation: next,
      modere_le: new Date().toISOString(),
      // si on rejette / remet en attente, on retire la mise en avant
      ...(next !== "approuve" ? { mis_en_avant: false } : {}),
    };
    const { error } = await supabase.from("avis").update(payload).eq("id", a.id);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success(
        next === "approuve" ? "Témoignage approuvé"
        : next === "rejete" ? "Témoignage rejeté"
        : "Témoignage remis en attente"
      );
      logAction("avis.moderate", "avis", a.id, {
        statut_avant: a.moderation, statut_apres: next,
      });
      setAvis(prev => prev.map(i => i.id === a.id ? { ...i, ...payload } as Avis : i));
    }
    setActingOn(null);
  };

  const toggleMisEnAvant = async (a: Avis) => {
    if (a.moderation !== "approuve") {
      toast.error("Seul un témoignage approuvé peut être mis en avant.");
      return;
    }
    setActingOn(a.id);
    const next = !a.mis_en_avant;
    const { error } = await supabase.from("avis").update({ mis_en_avant: next }).eq("id", a.id);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      logAction("avis.mis_en_avant", "avis", a.id, { mis_en_avant: next });
      setAvis(prev => prev.map(i => i.id === a.id ? { ...i, mis_en_avant: next } : i));
    }
    setActingOn(null);
  };

  const handleCreate = async () => {
    if (!addForm.nom_auteur.trim()) {
      toast.error("Le nom de l'auteur est requis");
      return;
    }
    if (!addForm.commentaire.trim()) {
      toast.error("Le commentaire est requis");
      return;
    }
    setAddSaving(true);
    const { data, error } = await supabase.from("avis").insert({
      nom_auteur: addForm.nom_auteur.trim(),
      note: addForm.note,
      commentaire: addForm.commentaire.trim(),
      moderation: addForm.moderation,
      mis_en_avant: addForm.mis_en_avant && addForm.moderation === "approuve",
      modere_le: addForm.moderation !== "en_attente" ? new Date().toISOString() : null,
    }).select("*").single();

    if (error) {
      toast.error(`Erreur : ${error.message}`, { duration: 8000 });
    } else {
      toast.success("Témoignage ajouté");
      logAction("avis.create_admin", "avis", data?.id ?? null, {
        nom_auteur: addForm.nom_auteur, note: addForm.note,
      });
      setAvis(prev => [data as Avis, ...prev]);
      setAddOpen(false);
      setAddForm({ nom_auteur: "", note: 5, commentaire: "", moderation: "approuve", mis_en_avant: false });
    }
    setAddSaving(false);
  };

  const handleDelete = async (a: Avis) => {
    if (!confirm("Supprimer définitivement ce témoignage ?")) return;
    setActingOn(a.id);
    const { error } = await supabase.from("avis").delete().eq("id", a.id);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      logAction("avis.delete", "avis", a.id, { auteur: a.utilisateurs?.email });
      toast.success("Témoignage supprimé");
      setAvis(prev => prev.filter(i => i.id !== a.id));
    }
    setActingOn(null);
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
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Témoignages</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Modère les avis laissés par les membres après les ateliers.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Nouveau témoignage
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["en_attente", "approuve", "rejete", "tous"] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card border text-foreground hover:bg-muted"
            }`}
          >
            {f === "tous" ? "Tous" : statutLabel[f]}
            <span className="ml-2 text-xs opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border p-12 text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">
            Aucun témoignage {filter !== "tous" ? `avec le statut "${statutLabel[filter as StatutModeration]}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            // Affichage : si avis posté par un membre → "Prénom L."
            // (anonymisation de la home). Sinon → nom_auteur (admin-créé).
            const u = a.utilisateurs;
            const auteur = u?.prenom
              ? `${u.prenom} ${u.nom?.[0] ?? ""}.`.trim()
              : a.nom_auteur || "—";
            const atelier = a.inscriptions?.ateliers;
            return (
              <div key={a.id} className="bg-card rounded-2xl border p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {auteur}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutBadge[a.moderation]}`}>
                        {statutLabel[a.moderation]}
                      </span>
                      {a.mis_en_avant && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                          <Star className="w-3 h-3 fill-current" /> Mis en avant
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 text-amber-500" title={`${a.note}/5`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < a.note ? "fill-current" : "opacity-30"}`} />
                        ))}
                      </div>
                    </div>

                    {atelier && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{atelier.titre}</span>
                        <span className="text-xs">· {formatDate(atelier.date_atelier)}</span>
                      </div>
                    )}

                    {a.commentaire && (
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{a.commentaire}</p>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      Soumis le {formatDate(a.cree_le)}
                      {a.modere_le && a.moderation !== "en_attente" && ` · modéré le ${formatDate(a.modere_le)}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col lg:w-48 shrink-0">
                    <div className="flex gap-1.5 lg:flex-col w-full">
                      <button
                        onClick={() => setModeration(a, "approuve")}
                        disabled={actingOn === a.id || a.moderation === "approuve"}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed flex-1 lg:flex-none ${
                          a.moderation === "approuve"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                        }`}
                      >
                        {actingOn === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                          a.moderation === "approuve" ? <CheckCircle2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        {a.moderation === "approuve" ? "Approuvé" : "Approuver"}
                      </button>
                      <button
                        onClick={() => setModeration(a, "rejete")}
                        disabled={actingOn === a.id || a.moderation === "rejete"}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed flex-1 lg:flex-none ${
                          a.moderation === "rejete"
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                        }`}
                      >
                        {a.moderation === "rejete" ? <XCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        {a.moderation === "rejete" ? "Rejeté" : "Rejeter"}
                      </button>
                    </div>
                    {a.moderation !== "en_attente" && (
                      <button
                        onClick={() => setModeration(a, "en_attente")}
                        disabled={actingOn === a.id}
                        className="flex items-center justify-center gap-2 border border-foreground/20 text-muted-foreground hover:bg-muted px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Remettre en attente
                      </button>
                    )}
                    <button
                      onClick={() => toggleMisEnAvant(a)}
                      disabled={actingOn === a.id || a.moderation !== "approuve"}
                      className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        a.mis_en_avant
                          ? "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                          : "border border-foreground/20 text-foreground hover:bg-muted"
                      }`}
                      title={a.moderation !== "approuve" ? "Approuvez d'abord le témoignage" : a.mis_en_avant ? "Retirer de la home" : "Mettre en avant sur la home"}
                    >
                      <Star className={`w-3.5 h-3.5 ${a.mis_en_avant ? "fill-current" : ""}`} />
                      {a.mis_en_avant ? "À la une" : "Mettre en avant"}
                    </button>
                    <button
                      onClick={() => handleDelete(a)}
                      disabled={actingOn === a.id}
                      className="flex items-center justify-center gap-2 border border-destructive/30 text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nouveau témoignage */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setAddOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Nouveau témoignage
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Ajoute manuellement un témoignage pour la home (par ex. retour reçu hors plateforme).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Auteur *</label>
                <input
                  type="text"
                  value={addForm.nom_auteur}
                  onChange={e => setAddForm({ ...addForm, nom_auteur: e.target.value })}
                  placeholder="Marie D."
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Note *</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAddForm({ ...addForm, note: n })}
                      className="p-1 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Star className={`w-6 h-6 ${n <= addForm.note ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"}`} />
                    </button>
                  ))}
                  <span className="ml-2 self-center text-sm text-muted-foreground">{addForm.note}/5</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Commentaire *</label>
                <textarea
                  rows={4}
                  value={addForm.commentaire}
                  onChange={e => setAddForm({ ...addForm, commentaire: e.target.value })}
                  placeholder="Un super atelier, ambiance chaleureuse, j'ai adoré…"
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Statut</label>
                <div className="flex gap-2 flex-wrap">
                  {(["en_attente", "approuve", "rejete"] as StatutModeration[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAddForm({ ...addForm, moderation: s, mis_en_avant: s === "approuve" ? addForm.mis_en_avant : false })}
                      className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        addForm.moderation === s
                          ? s === "approuve" ? "bg-green-50 border-green-500 text-green-700"
                            : s === "rejete" ? "bg-red-50 border-red-500 text-red-700"
                            : "bg-amber-50 border-amber-500 text-amber-700"
                          : "bg-background border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {statutLabel[s]}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={addForm.mis_en_avant}
                  onChange={e => setAddForm({ ...addForm, mis_en_avant: e.target.checked })}
                  disabled={addForm.moderation !== "approuve"}
                  className="w-4 h-4 rounded border-border"
                />
                <span className={`text-sm ${addForm.moderation !== "approuve" ? "text-muted-foreground" : "text-foreground"}`}>
                  Mettre en avant sur la home (réservé aux avis approuvés)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={addSaving || !addForm.nom_auteur.trim() || !addForm.commentaire.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {addSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Avis;
