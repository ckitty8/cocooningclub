import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Calendar, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Atelier {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  type: string;
  photo_url: string | null;
  price: string;
  created_at: string;
}

const emptyForm = { title: "", description: "", date: "", time: "", location: "Gagny", capacity: 12, type: "general", photo_url: "", price: "Gratuit" };

const AdminAteliers = () => {
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAteliers = async () => {
    const { data } = await supabase.from("ateliers").select("*").order("date", { ascending: false });
    if (data) setAteliers(data as Atelier[]);
  };

  useEffect(() => { fetchAteliers(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (a: Atelier) => {
    setEditId(a.id);
    setForm({ title: a.title, description: a.description, date: a.date, time: a.time, location: a.location, capacity: a.capacity, type: a.type, photo_url: a.photo_url || "", price: a.price });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet atelier ?")) return;
    await supabase.from("ateliers").delete().eq("id", id);
    toast.success("Atelier supprimé.");
    fetchAteliers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, photo_url: form.photo_url || null };

    if (editId) {
      const { error } = await supabase.from("ateliers").update(payload).eq("id", editId);
      if (error) { toast.error("Erreur lors de la mise à jour."); return; }
      toast.success("Atelier mis à jour !");
    } else {
      const { error } = await supabase.from("ateliers").insert(payload);
      if (error) { toast.error("Erreur lors de la création."); return; }
      toast.success("Atelier créé !");
    }
    setModalOpen(false);
    fetchAteliers();
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">Gestion des ateliers</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" />
          Créer un atelier
        </button>
      </div>

      <div className="space-y-4">
        {ateliers.map((a) => (
          <div key={a.id} className="bg-card rounded-2xl border p-6 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-lg font-semibold text-foreground">{a.title}</h3>
                {a.date < today && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Passé</span>}
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">{a.type}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-foreground/70 mt-2">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(a.date), "d MMMM yyyy", { locale: fr })} · {a.time}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.location}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {a.capacity} places</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(a)} className="p-2 rounded-lg border hover:bg-muted transition-colors" title="Modifier">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(a.id)} className="p-2 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors" title="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal create/edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="bg-background rounded-3xl border shadow-2xl w-full max-w-lg mx-4 p-8 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl font-bold text-foreground mb-6">{editId ? "Modifier l'atelier" : "Créer un atelier"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Titre</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Heure</label>
                  <input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="14h – 17h" required className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Lieu</label>
                  <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="Gagny">Gagny</option>
                    <option value="Chelles">Chelles</option>
                    <option value="Le Raincy">Le Raincy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Capacité</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} min={1} required className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="general">Général</option>
                    <option value="bougie">Bougie</option>
                    <option value="peinture">Peinture</option>
                    <option value="textile">Textile</option>
                    <option value="poterie">Poterie</option>
                    <option value="nature">Nature</option>
                    <option value="art">Art</option>
                    <option value="bien-etre">Bien-être</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Prix</label>
                  <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">URL Photo</label>
                <input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <button type="submit" className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity">
                {editId ? "Mettre à jour" : "Créer l'atelier"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAteliers;
