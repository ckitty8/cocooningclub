import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Calendar, CalendarX, Flag, School, Clock
} from "lucide-react";

interface Disponibilite {
  id: string;
  utilisateur_id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
}
interface Indisponibilite {
  id: string;
  utilisateur_id: string;
  date_debut: string;
  date_fin: string;
  motif: string | null;
}
interface JourFerie {
  id: string;
  date: string;
  nom: string;
  annee: number;
}
interface VacancesScolaires {
  id: string;
  nom: string;
  date_debut: string;
  date_fin: string;
  annee_scolaire: string;
  zone: string;
}

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const JOURS_ORDRE = [1, 2, 3, 4, 5, 6, 0]; // lun-dim

type Tab = "dispo" | "conges" | "officiels";

const formatDateFr = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

const Disponibilites = () => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("dispo");
  const [loading, setLoading] = useState(true);

  const [disponibilites, setDisponibilites] = useState<Disponibilite[]>([]);
  const [indisponibilites, setIndisponibilites] = useState<Indisponibilite[]>([]);
  const [joursFeries, setJoursFeries] = useState<JourFerie[]>([]);
  const [vacances, setVacances] = useState<VacancesScolaires[]>([]);

  // Nouveaux créneaux / congés
  const [newDispo, setNewDispo] = useState<{ jour: number; debut: string; fin: string }>({
    jour: 1, debut: "09:00", fin: "18:00",
  });
  const [newConge, setNewConge] = useState({ date_debut: "", date_fin: "", motif: "" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    if (!profile?.id) return;
    const [dRes, iRes, jRes, vRes] = await Promise.all([
      supabase.from("disponibilites").select("*").eq("utilisateur_id", profile.id),
      supabase.from("indisponibilites").select("*").eq("utilisateur_id", profile.id).order("date_debut"),
      supabase.from("jours_feries").select("*").order("date"),
      supabase.from("vacances_scolaires").select("*").eq("zone", "C").order("date_debut"),
    ]);
    setDisponibilites((dRes.data as Disponibilite[]) ?? []);
    setIndisponibilites((iRes.data as Indisponibilite[]) ?? []);
    setJoursFeries((jRes.data as JourFerie[]) ?? []);
    setVacances((vRes.data as VacancesScolaires[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [profile?.id]);

  // ────────────────────────────────────────────────────
  // Disponibilités
  // ────────────────────────────────────────────────────
  const handleAddDispo = async () => {
    if (!profile?.id) return;
    if (newDispo.debut >= newDispo.fin) {
      toast.error("L'heure de début doit être avant l'heure de fin");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("disponibilites").insert({
      utilisateur_id: profile.id,
      jour_semaine: newDispo.jour,
      heure_debut: newDispo.debut,
      heure_fin: newDispo.fin,
    });
    if (error) toast.error("Erreur lors de l'ajout");
    else {
      toast.success("Créneau ajouté");
      fetchAll();
    }
    setSaving(false);
  };

  const handleDeleteDispo = async (id: string) => {
    const { error } = await supabase.from("disponibilites").delete().eq("id", id);
    if (error) toast.error("Erreur");
    else {
      toast.success("Créneau supprimé");
      setDisponibilites(prev => prev.filter(d => d.id !== id));
    }
  };

  // ────────────────────────────────────────────────────
  // Congés
  // ────────────────────────────────────────────────────
  const handleAddConge = async () => {
    if (!profile?.id) return;
    if (!newConge.date_debut || !newConge.date_fin) {
      toast.error("Choisis des dates de début et de fin");
      return;
    }
    if (newConge.date_debut > newConge.date_fin) {
      toast.error("La date de début doit être avant la date de fin");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("indisponibilites").insert({
      utilisateur_id: profile.id,
      date_debut: newConge.date_debut,
      date_fin: newConge.date_fin,
      motif: newConge.motif || null,
    });
    if (error) toast.error("Erreur lors de l'ajout");
    else {
      toast.success("Congé ajouté");
      setNewConge({ date_debut: "", date_fin: "", motif: "" });
      fetchAll();
    }
    setSaving(false);
  };

  const handleDeleteConge = async (id: string) => {
    if (!confirm("Supprimer ce congé ?")) return;
    const { error } = await supabase.from("indisponibilites").delete().eq("id", id);
    if (error) toast.error("Erreur");
    else {
      toast.success("Congé supprimé");
      setIndisponibilites(prev => prev.filter(i => i.id !== id));
    }
  };

  // ────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────
  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Disponibilités</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez vos créneaux disponibles et vos congés. Ces infos bloquent la création d'ateliers si personne n'est dispo.
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6 border-b">
        {([
          { key: "dispo",     label: "Mes disponibilités", icon: Clock },
          { key: "conges",    label: "Mes congés",          icon: CalendarX },
          { key: "officiels", label: "Jours fériés & vacances scolaires", icon: Flag },
        ] as { key: Tab; label: string; icon: typeof Flag }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ──────── Onglet 1 : Disponibilités ──────── */}
      {tab === "dispo" && (
        <div className="space-y-6">
          {/* Ajout */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Ajouter un créneau
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select
                value={newDispo.jour}
                onChange={e => setNewDispo({ ...newDispo, jour: Number(e.target.value) })}
                className="rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {JOURS_ORDRE.map(j => <option key={j} value={j}>{JOURS[j]}</option>)}
              </select>
              <input
                type="time"
                value={newDispo.debut}
                onChange={e => setNewDispo({ ...newDispo, debut: e.target.value })}
                className="rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="time"
                value={newDispo.fin}
                onChange={e => setNewDispo({ ...newDispo, fin: e.target.value })}
                className="rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleAddDispo}
                disabled={saving}
                className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Ajouter
              </button>
            </div>
          </div>

          {/* Liste des créneaux par jour */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Mes créneaux récurrents</h2>
            <div className="space-y-3">
              {JOURS_ORDRE.map(j => {
                const creneaux = disponibilites
                  .filter(d => d.jour_semaine === j)
                  .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
                return (
                  <div key={j} className="flex items-start gap-4 py-2 border-b last:border-b-0">
                    <div className="w-24 font-medium text-foreground shrink-0">{JOURS[j]}</div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {creneaux.length === 0 ? (
                        <span className="text-sm text-muted-foreground italic">Non disponible</span>
                      ) : (
                        creneaux.map(c => (
                          <div key={c.id} className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                            <Clock className="w-3.5 h-3.5" />
                            {c.heure_debut.substring(0, 5)} – {c.heure_fin.substring(0, 5)}
                            <button
                              onClick={() => handleDeleteDispo(c.id)}
                              className="hover:text-destructive ml-1"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ──────── Onglet 2 : Congés ──────── */}
      {tab === "conges" && (
        <div className="space-y-6">
          {/* Ajout */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Ajouter une période de congé
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Date de début</label>
                <input
                  type="date"
                  value={newConge.date_debut}
                  onChange={e => setNewConge({ ...newConge, date_debut: e.target.value })}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Date de fin</label>
                <input
                  type="date"
                  value={newConge.date_fin}
                  onChange={e => setNewConge({ ...newConge, date_fin: e.target.value })}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs text-muted-foreground mb-1">Motif (optionnel)</label>
              <input
                type="text"
                value={newConge.motif}
                onChange={e => setNewConge({ ...newConge, motif: e.target.value })}
                placeholder="ex: Vacances, formation, personnel…"
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={handleAddConge}
              disabled={saving}
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Ajouter
            </button>
          </div>

          {/* Liste */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold mb-4">Mes congés & indispos</h2>
            {indisponibilites.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucun congé enregistré.</p>
            ) : (
              <div className="space-y-2">
                {indisponibilites.map(i => (
                  <div key={i.id} className="flex items-center justify-between bg-background border rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <CalendarX className="w-4 h-4 text-red-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          Du <span className="text-foreground">{formatDateFr(i.date_debut)}</span>
                          {" "}au <span className="text-foreground">{formatDateFr(i.date_fin)}</span>
                        </p>
                        {i.motif && <p className="text-xs text-muted-foreground">{i.motif}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteConge(i.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────── Onglet 3 : Officiels ──────── */}
      {tab === "officiels" && (
        <div className="space-y-6">
          {/* Jours fériés */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" />
              Jours fériés (France)
            </h2>
            {joursFeries.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucun jour férié.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {joursFeries.map(j => (
                  <div key={j.id} className="flex items-center justify-between bg-background border rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-red-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{j.nom}</p>
                        <p className="text-xs text-muted-foreground">{formatDateFr(j.date)}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {j.annee}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vacances scolaires */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <School className="w-4 h-4 text-primary" />
              Vacances scolaires — Zone C (Île-de-France)
            </h2>
            {vacances.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Aucune période.</p>
            ) : (
              <div className="space-y-2">
                {vacances.map(v => (
                  <div key={v.id} className="flex items-center justify-between bg-background border rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <School className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{v.nom}</p>
                        <p className="text-xs text-muted-foreground">
                          Du {formatDateFr(v.date_debut)} au {formatDateFr(v.date_fin)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {v.annee_scolaire}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Disponibilites;
