import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { withTimeout } from "@/utils/withTimeout";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, CalendarX, Clock, ChevronLeft, ChevronRight, CalendarDays, X, Palette, Check
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
const JOURS_COURT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

type Tab = "dispo" | "conges" | "calendrier";

const formatDateFr = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

// Format YYYY-MM-DD pour comparer des dates
const toIsoDate = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// Une date est-elle dans un range [debut, fin] inclus ?
const isDateInRange = (dateIso: string, debutIso: string, finIso: string) =>
  dateIso >= debutIso && dateIso <= finIso;

type CalEvent = {
  type: "conge" | "ferie" | "vacances";
  label: string;
  color: string; // classes tailwind
};

// Palette de 8 couleurs disponibles pour les admins
type CouleurKey = "teal" | "blue" | "fuchsia" | "pink" | "violet" | "orange" | "gray" | "brown";

const PALETTE: { key: CouleurKey; label: string; hex: string; bg: string; text: string; swatch: string }[] = [
  { key: "teal",    label: "Bleu-vert océan", hex: "#14b8a6", bg: "bg-teal-500",    text: "text-white",     swatch: "bg-teal-500" },
  { key: "blue",    label: "Bleu roi",         hex: "#1d4ed8", bg: "bg-blue-700",    text: "text-white",     swatch: "bg-blue-700" },
  { key: "fuchsia", label: "Rose fuchsia",     hex: "#d946ef", bg: "bg-fuchsia-500", text: "text-white",     swatch: "bg-fuchsia-500" },
  { key: "pink",    label: "Rose pastel",      hex: "#f9a8d4", bg: "bg-pink-300",    text: "text-pink-900",  swatch: "bg-pink-300" },
  { key: "violet",  label: "Violet",           hex: "#7c3aed", bg: "bg-violet-600",  text: "text-white",     swatch: "bg-violet-600" },
  { key: "orange",  label: "Orange",           hex: "#f97316", bg: "bg-orange-500",  text: "text-white",     swatch: "bg-orange-500" },
  { key: "gray",    label: "Gris",             hex: "#6b7280", bg: "bg-gray-500",    text: "text-white",     swatch: "bg-gray-500" },
  { key: "brown",   label: "Marron",           hex: "#92400e", bg: "bg-amber-800",   text: "text-white",     swatch: "bg-amber-800" },
];

const getColorClasses = (key: string | null | undefined): { bg: string; text: string } => {
  if (!key) return { bg: "bg-gray-400", text: "text-white" };
  const found = PALETTE.find(p => p.key === key);
  return found ? { bg: found.bg, text: found.text } : { bg: "bg-gray-400", text: "text-white" };
};

interface Admin {
  id: string;
  prenom: string;
  nom: string;
  couleur_conges: string | null;
}
interface IndisponibiliteWithAdmin extends Indisponibilite {
  couleur_conges: string | null;
  admin_prenom: string | null;
}

const Disponibilites = () => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("dispo");
  const [loading, setLoading] = useState(true);

  const [disponibilites, setDisponibilites] = useState<Disponibilite[]>([]);
  const [indisponibilites, setIndisponibilites] = useState<Indisponibilite[]>([]);
  const [allIndispoWithColor, setAllIndispoWithColor] = useState<IndisponibiliteWithAdmin[]>([]);
  const [joursFeries, setJoursFeries] = useState<JourFerie[]>([]);
  const [vacances, setVacances] = useState<VacancesScolaires[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [savingColor, setSavingColor] = useState(false);

  // Couleur courante de l'admin connecté
  const myColor = admins.find(a => a.id === profile?.id)?.couleur_conges ?? null;

  // Couleurs déjà prises par d'autres admins
  const takenByOthers = admins
    .filter(a => a.id !== profile?.id && a.couleur_conges)
    .map(a => a.couleur_conges);

  // Calendrier
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Nouveaux créneaux / congés
  const [newDispo, setNewDispo] = useState<{ jour: number; debut: string; fin: string }>({
    jour: 1, debut: "09:00", fin: "18:00",
  });
  const [newConge, setNewConge] = useState({ date_debut: "", date_fin: "", motif: "" });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    try {
      const [dRes, iRes, jRes, vRes, aRes, allIRes] = await withTimeout(Promise.all([
        supabase.from("disponibilites").select("*").eq("utilisateur_id", profile.id),
        supabase.from("indisponibilites").select("*").eq("utilisateur_id", profile.id).order("date_debut"),
        supabase.from("jours_feries").select("*").order("date"),
        supabase.from("vacances_scolaires").select("*").eq("zone", "C").order("date_debut"),
        supabase.from("utilisateurs").select("id, prenom, nom, couleur_conges").eq("role", "administrateur"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("indisponibilites") as any).select("*, utilisateurs(couleur_conges, prenom)").order("date_debut"),
      ]));
      setDisponibilites((dRes.data as Disponibilite[]) ?? []);
      setIndisponibilites((iRes.data as Indisponibilite[]) ?? []);
      setJoursFeries((jRes.data as JourFerie[]) ?? []);
      setVacances((vRes.data as VacancesScolaires[]) ?? []);
      setAdmins((aRes.data as Admin[]) ?? []);

      // Transform join result into flat structure
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allI = ((allIRes.data as any[]) ?? []).map((row: any) => ({
        id: row.id,
        utilisateur_id: row.utilisateur_id,
        date_debut: row.date_debut,
        date_fin: row.date_fin,
        motif: row.motif,
        cree_le: row.cree_le,
        couleur_conges: row.utilisateurs?.couleur_conges ?? null,
        admin_prenom: row.utilisateurs?.prenom ?? null,
      })) as IndisponibiliteWithAdmin[];
      setAllIndispoWithColor(allI);
    } catch (err) {
      console.error("[Disponibilites.fetchAll] error:", err);
      toast.error("Erreur lors du chargement des disponibilités");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeColor = async (couleur: CouleurKey | null) => {
    if (!profile?.id) return;
    setSavingColor(true);

    const hex = couleur ? PALETTE.find(p => p.key === couleur)?.hex ?? null : null;

    const { error } = await supabase
      .from("utilisateurs")
      .update({ couleur_conges: couleur, code_couleur_conges: hex })
      .eq("id", profile.id);
    if (error) {
      console.error("[handleChangeColor] error:", error);
      toast.error(`Erreur : ${error.message || error.code || "inconnue"}`, { duration: 8000 });
    } else {
      toast.success(couleur ? "Couleur enregistrée" : "Couleur supprimée");
      fetchAll();
    }
    setSavingColor(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {/* Sélecteur de couleur de l'admin */}
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-semibold">Ma couleur d'affichage</h3>
          </div>
          <div className="flex-1 min-w-[280px]">
            <p className="text-sm text-muted-foreground mb-3">
              Choisis une couleur pour tes congés sur le calendrier. Les couleurs déjà prises par d'autres admins sont désactivées.
            </p>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map(c => {
                const isTaken = takenByOthers.includes(c.key);
                const isMine = myColor === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => !isTaken && !savingColor && handleChangeColor(isMine ? null : c.key)}
                    disabled={isTaken || savingColor}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all
                      ${isMine ? "ring-2 ring-primary border-primary" : ""}
                      ${isTaken ? "opacity-30 cursor-not-allowed" : "hover:shadow-sm cursor-pointer"}
                    `}
                    title={isTaken ? "Déjà prise par un autre admin" : isMine ? "Cliquer pour désélectionner" : "Choisir cette couleur"}
                  >
                    <span className={`w-5 h-5 rounded-full ${c.swatch} shrink-0`} />
                    <span className="font-medium">{c.label}</span>
                    {isMine && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6 border-b">
        {([
          { key: "dispo",      label: "Mes disponibilités", icon: Clock },
          { key: "conges",     label: "Mes congés",          icon: CalendarX },
          { key: "calendrier", label: "Calendrier récap",    icon: CalendarDays },
        ] as { key: Tab; label: string; icon: typeof CalendarDays }[]).map(({ key, label, icon: Icon }) => (
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

      {/* ──────── Onglet 3 : Calendrier récap ──────── */}
      {tab === "calendrier" && (() => {
        // Construction de la grille du mois
        const firstDay = new Date(calYear, calMonth, 1);
        const lastDay  = new Date(calYear, calMonth + 1, 0);
        let startDow = firstDay.getDay();
        startDow = startDow === 0 ? 6 : startDow - 1; // lundi-based
        const days: (number | null)[] = [];
        for (let i = 0; i < startDow; i++) days.push(null);
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
        while (days.length % 7 !== 0) days.push(null);

        // Calcule les events pour un jour (tous admins confondus pour les congés)
        const getEventsForDay = (day: number): CalEvent[] => {
          const iso = toIsoDate(calYear, calMonth, day);
          const events: CalEvent[] = [];

          allIndispoWithColor.forEach(i => {
            if (isDateInRange(iso, i.date_debut, i.date_fin)) {
              const cc = getColorClasses(i.couleur_conges);
              const prefix = i.admin_prenom ? `${i.admin_prenom} · ` : "";
              events.push({
                type: "conge",
                label: `${prefix}${i.motif || "Congé"}`,
                color: `${cc.bg} ${cc.text}`,
              });
            }
          });

          joursFeries.forEach(j => {
            if (j.date === iso) {
              events.push({
                type: "ferie",
                label: j.nom,
                color: "bg-red-500 text-white",
              });
            }
          });

          vacances.forEach(v => {
            if (isDateInRange(iso, v.date_debut, v.date_fin)) {
              events.push({
                type: "vacances",
                label: `Vac. ${v.nom}`,
                color: "bg-amber-400 text-amber-900",
              });
            }
          });

          return events;
        };

        const prevMonth = () => {
          if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
          else setCalMonth(m => m - 1);
        };
        const nextMonth = () => {
          if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
          else setCalMonth(m => m + 1);
        };
        const goToday = () => {
          const now = new Date();
          setCalMonth(now.getMonth());
          setCalYear(now.getFullYear());
        };

        const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate());
        const selectedEvents = selectedDay
          ? (() => {
              const [, m, d] = selectedDay.split("-").map(Number);
              return getEventsForDay(d);
            })()
          : [];

        return (
          <div className="bg-card border rounded-2xl p-5">
            {/* Header calendrier */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={prevMonth}
                  className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Mois précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="font-display text-xl font-semibold capitalize min-w-[160px] text-center">
                  {MOIS[calMonth]} {calYear}
                </h2>
                <button
                  onClick={nextMonth}
                  className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={goToday}
                  className="text-xs px-3 py-1.5 border rounded-full hover:bg-muted transition-colors font-medium"
                >
                  Aujourd'hui
                </button>
              </div>

              {/* Légende */}
              <div className="flex flex-wrap gap-3 text-xs">
                {admins.filter(a => a.couleur_conges).map(a => {
                  const c = getColorClasses(a.couleur_conges);
                  return (
                    <span key={a.id} className="inline-flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded ${c.bg}`} />
                      Congés {a.prenom}
                    </span>
                  );
                })}
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-500" /> Jours fériés
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-400" /> Vacances scolaires
                </span>
              </div>
            </div>

            {/* En-têtes des jours */}
            <div className="grid grid-cols-7 border-b pb-2 mb-1">
              {JOURS_COURT.map(d => (
                <div key={d} className="text-center text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            {/* Grille des jours */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                if (!day) return <div key={i} className="aspect-[1/1] sm:aspect-auto sm:h-24" />;
                const iso = toIsoDate(calYear, calMonth, day);
                const events = getEventsForDay(day);
                const isToday = iso === todayIso;
                const isSelected = iso === selectedDay;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(iso)}
                    className={`
                      aspect-[1/1] sm:aspect-auto sm:h-24 rounded-lg p-1.5 border text-left transition-all
                      flex flex-col gap-0.5 overflow-hidden
                      ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border"}
                      ${isToday ? "bg-primary/5" : ""}
                    `}
                  >
                    <span className={`text-xs font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {events.slice(0, 3).map((ev, idx) => (
                        <span
                          key={idx}
                          className={`${ev.color} text-[10px] leading-tight px-1.5 py-0.5 rounded truncate font-medium`}
                          title={ev.label}
                        >
                          {ev.label}
                        </span>
                      ))}
                      {events.length > 3 && (
                        <span className="text-[10px] text-muted-foreground pl-1">
                          +{events.length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Détail du jour sélectionné */}
            {selectedDay && (
              <div className="mt-5 bg-background border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Détails</p>
                    <h3 className="font-semibold text-foreground">{formatDateFr(selectedDay)}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Aucun événement ce jour.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedEvents.map((ev, idx) => (
                      <div key={idx} className={`${ev.color} text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-2 mr-2`}>
                        {ev.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </AdminLayout>
  );
};

export default Disponibilites;
