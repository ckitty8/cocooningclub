import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Search, Pencil, Trash2, UserX, UserCheck2, X, ChevronDown } from "lucide-react";
import type { UserRole } from "@/contexts/AuthContext";

interface Member {
  id: string;
  numero_membre: string | null;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
  date_adhesion: string | null;
  notes_internes: string | null;
  role: UserRole;
  actif: boolean;
  created_at: string;
}

const roleBadgeClass: Record<UserRole, string> = {
  admin:           "bg-purple-100 text-purple-700",
  inscrit:         "bg-gray-100 text-gray-600",
  membre:          "bg-blue-100 text-blue-700",
  membre_premium:  "bg-amber-100 text-amber-700",
};

const roleLabel: Record<UserRole, string> = {
  admin:          "Admin",
  inscrit:        "Inscrit",
  membre:         "Membre",
  membre_premium: "Premium",
};

const emptyForm = {
  nom: "", prenom: "", email: "", telephone: "",
  date_naissance: "", date_adhesion: "",
  role: "inscrit" as UserRole, notes_internes: "",
};

const Membres = () => {
  const { profile: me } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("tous");
  const [filterActif, setFilterActif] = useState("tous");
  const [modal, setModal] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setMembers((data as Member[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || [m.nom, m.prenom, m.email, m.numero_membre]
      .some(v => v?.toLowerCase().includes(q));
    const matchRole = filterRole === "tous" || m.role === filterRole;
    const matchActif = filterActif === "tous"
      || (filterActif === "actif" ? m.actif : !m.actif);
    return matchSearch && matchRole && matchActif;
  });

  const openAdd = () => { setForm(emptyForm); setModal({ open: true, member: null }); };
  const openEdit = (m: Member) => {
    setForm({
      nom: m.nom ?? "", prenom: m.prenom ?? "", email: m.email ?? "",
      telephone: m.telephone ?? "", date_naissance: m.date_naissance ?? "",
      date_adhesion: m.date_adhesion ?? "", role: m.role,
      notes_internes: m.notes_internes ?? "",
    });
    setModal({ open: true, member: m });
  };

  const handleSave = async () => {
    setSaving(true);
    const isSelf = modal.member?.id === me?.id;
    const payload: Record<string, any> = {
      nom: form.nom || null,
      prenom: form.prenom || null,
      email: form.email || null,
      telephone: form.telephone || null,
      date_naissance: form.date_naissance || null,
      date_adhesion: form.date_adhesion || null,
      notes_internes: form.notes_internes || null,
    };
    if (!isSelf) payload.role = form.role;

    if (modal.member) {
      await supabase.from("profiles").update(payload).eq("id", modal.member.id);
    }
    await fetchMembers();
    setModal({ open: false, member: null });
    setSaving(false);
  };

  const toggleActif = async (m: Member) => {
    if (m.id === me?.id) return;
    await supabase.from("profiles").update({ actif: !m.actif }).eq("id", m.id);
    fetchMembers();
  };

  const handleDelete = async (m: Member) => {
    if (m.id === me?.id) return;
    if (!confirm(`Supprimer définitivement ${m.prenom ?? ""} ${m.nom ?? ""} ?`)) return;
    await supabase.from("profiles").delete().eq("id", m.id);
    fetchMembers();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Membres</h1>
          <p className="text-muted-foreground text-sm mt-1">{members.length} profil(s) au total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9 pr-4 py-2 border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary w-52"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="tous">Tous les rôles</option>
          <option value="inscrit">Inscrits</option>
          <option value="membre">Membres standard</option>
          <option value="membre_premium">Membres premium</option>
          <option value="admin">Admins</option>
        </select>
        <select
          value={filterActif}
          onChange={e => setFilterActif(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="tous">Tous statuts</option>
          <option value="actif">Actifs</option>
          <option value="inactif">Inactifs</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Membre</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">N°</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Rôle</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Statut</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden lg:table-cell">Adhésion</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Aucun résultat</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{m.prenom} {m.nom}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">{m.numero_membre ?? "—"}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass[m.role]}`}>
                      {roleLabel[m.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.actif ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {m.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground text-xs">
                    {m.date_adhesion ? new Date(m.date_adhesion).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(m)} title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {m.id !== me?.id && (
                        <>
                          <button onClick={() => toggleActif(m)} title={m.actif ? "Désactiver" : "Activer"}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            {m.actif ? <UserX className="w-3.5 h-3.5" /> : <UserCheck2 className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => handleDelete(m)} title="Supprimer"
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-lg">
                {modal.member ? "Modifier le membre" : "Ajouter un membre"}
              </h2>
              <button onClick={() => setModal({ open: false, member: null })}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Prénom</label>
                  <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nom</label>
                  <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Téléphone</label>
                <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date de naissance</label>
                  <input type="date" value={form.date_naissance} onChange={e => setForm(f => ({ ...f, date_naissance: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date d'adhésion</label>
                  <input type="date" value={form.date_adhesion} onChange={e => setForm(f => ({ ...f, date_adhesion: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              {modal.member?.id !== me?.id && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Rôle</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="inscrit">Inscrit</option>
                    <option value="membre">Membre standard</option>
                    <option value="membre_premium">Membre Premium</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Notes internes (admin uniquement)</label>
                <textarea value={form.notes_internes} onChange={e => setForm(f => ({ ...f, notes_internes: e.target.value }))}
                  rows={3} placeholder="Notes privées sur ce membre..."
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setModal({ open: false, member: null })}
                className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Membres;
