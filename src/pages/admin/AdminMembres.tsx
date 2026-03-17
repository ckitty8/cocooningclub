import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, User, X, Calendar, MapPin, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  role: string;
  status: string;
  created_at: string;
}

interface Reservation {
  id: string;
  status: string;
  atelier: { id: string; title: string; date: string; location: string };
}

const AdminMembres = () => {
  const [members, setMembers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [memberReservations, setMemberReservations] = useState<Reservation[]>([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const PER_PAGE = 10;

  const fetchMembers = async () => {
    let query = supabase.from("profiles").select("*").eq("role", "membre").order("created_at", { ascending: false });
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    const { data } = await query.range(page * PER_PAGE, (page + 1) * PER_PAGE - 1);
    if (data) setMembers(data as Profile[]);
  };

  useEffect(() => { fetchMembers(); }, [search, page]);

  const openDetail = async (member: Profile) => {
    setSelected(member);
    setEditData({ first_name: member.first_name, last_name: member.last_name, email: member.email, phone: member.phone });
    setEditing(false);
    const { data } = await supabase
      .from("reservations")
      .select("id, status, atelier:atelier_id(id, title, date, location)")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false });
    if (data) setMemberReservations(data as unknown as Reservation[]);
  };

  const toggleStatus = async () => {
    if (!selected) return;
    const newStatus = selected.status === "actif" ? "inactif" : "actif";
    await supabase.from("profiles").update({ status: newStatus }).eq("id", selected.id);
    toast.success(`Membre ${newStatus === "actif" ? "activé" : "désactivé"}.`);
    setSelected({ ...selected, status: newStatus });
    fetchMembers();
  };

  const deleteMember = async () => {
    if (!selected || !confirm("Supprimer ce membre ? Cette action est irréversible.")) return;
    await supabase.from("profiles").delete().eq("id", selected.id);
    toast.success("Membre supprimé.");
    setSelected(null);
    fetchMembers();
  };

  const saveEdit = async () => {
    if (!selected) return;
    await supabase.from("profiles").update(editData).eq("id", selected.id);
    toast.success("Informations mises à jour.");
    setSelected({ ...selected, ...editData });
    setEditing(false);
    fetchMembers();
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-foreground mb-8">Gestion des membres</h1>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Rechercher par nom ou email..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-4 font-medium">Membre</th>
              <th className="p-4 font-medium hidden md:table-cell">Email</th>
              <th className="p-4 font-medium hidden lg:table-cell">Téléphone</th>
              <th className="p-4 font-medium hidden lg:table-cell">Statut</th>
              <th className="p-4 font-medium hidden lg:table-cell">Inscription</th>
              <th className="p-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-primary" />}
                    </div>
                    <span className="font-medium text-foreground">{m.first_name} {m.last_name}</span>
                  </div>
                </td>
                <td className="p-4 hidden md:table-cell text-foreground/70">{m.email}</td>
                <td className="p-4 hidden lg:table-cell text-foreground/70">{m.phone || "—"}</td>
                <td className="p-4 hidden lg:table-cell">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === "actif" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {m.status}
                  </span>
                </td>
                <td className="p-4 hidden lg:table-cell text-foreground/70">{new Date(m.created_at).toLocaleDateString("fr-FR")}</td>
                <td className="p-4">
                  <button onClick={() => openDetail(m)} className="text-primary hover:underline text-sm">Voir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-3 mt-4 justify-center">
        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-4 py-2 rounded-lg border text-sm disabled:opacity-30">
          Précédent
        </button>
        <span className="px-4 py-2 text-sm text-muted-foreground">Page {page + 1}</span>
        <button onClick={() => setPage(page + 1)} disabled={members.length < PER_PAGE} className="px-4 py-2 rounded-lg border text-sm disabled:opacity-30">
          Suivant
        </button>
      </div>

      {/* Modal détail membre */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-background rounded-3xl border shadow-2xl w-full max-w-2xl mx-4 p-8 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                {selected.avatar_url ? <img src={selected.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6 text-primary" />}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">{selected.first_name} {selected.last_name}</h2>
                <p className="text-sm text-muted-foreground">{selected.email}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${selected.status === "actif" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  {selected.status}
                </span>
              </div>
            </div>

            {/* Edit form */}
            {editing ? (
              <div className="space-y-3 mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <input value={editData.first_name} onChange={(e) => setEditData({ ...editData, first_name: e.target.value })} placeholder="Prénom" className="rounded-xl border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input value={editData.last_name} onChange={(e) => setEditData({ ...editData, last_name: e.target.value })} placeholder="Nom" className="rounded-xl border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} placeholder="Email" className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} placeholder="Téléphone" className="w-full rounded-xl border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm hover:opacity-90">Enregistrer</button>
                  <button onClick={() => setEditing(false)} className="border px-4 py-2 rounded-full text-sm hover:bg-muted">Annuler</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span>{selected.phone || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Inscrit le</span><span>{new Date(selected.created_at).toLocaleDateString("fr-FR")}</span></div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mb-6">
              {!editing && <button onClick={() => setEditing(true)} className="border px-4 py-2 rounded-full text-sm hover:bg-muted">Modifier</button>}
              <button onClick={toggleStatus} className="border px-4 py-2 rounded-full text-sm hover:bg-muted">
                {selected.status === "actif" ? "Désactiver" : "Activer"}
              </button>
              <button onClick={deleteMember} className="border border-destructive text-destructive px-4 py-2 rounded-full text-sm hover:bg-destructive/10 flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Supprimer
              </button>
            </div>

            {/* Reservations */}
            <h3 className="font-display font-semibold text-foreground mb-3">Ateliers passés</h3>
            <div className="space-y-2 mb-6">
              {memberReservations.filter(r => r.atelier.date < today).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun atelier passé.</p>
              ) : (
                memberReservations.filter(r => r.atelier.date < today).map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
                    <div>
                      <span className="font-medium">{r.atelier.title}</span>
                      <span className="text-muted-foreground ml-2">{r.atelier.date}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "presente" ? "bg-green-50 text-green-700" : r.status === "absente" ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-600"}`}>
                      {r.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <h3 className="font-display font-semibold text-foreground mb-3">Ateliers à venir</h3>
            <div className="space-y-2">
              {memberReservations.filter(r => r.atelier.date >= today && r.status !== "annulee").length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun atelier réservé.</p>
              ) : (
                memberReservations.filter(r => r.atelier.date >= today && r.status !== "annulee").map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">{r.atelier.title}</span>
                      <span className="text-muted-foreground">{r.atelier.date}</span>
                      <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{r.atelier.location}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMembres;
