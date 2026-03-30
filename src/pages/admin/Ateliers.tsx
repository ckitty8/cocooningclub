import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, MapPin, Clock, Users } from "lucide-react";

interface Atelier {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  spots: number;
  price: string | null;
  location: string | null;
  lien_paypal: string | null;
  is_active: boolean;
}

const emptyForm = {
  title: "", description: "", date: "", time: "",
  spots: 10, price: "", location: "", lien_paypal: "", is_active: true,
};

const Ateliers = () => {
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; atelier: Atelier | null }>({ open: false, atelier: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAteliers = async () => {
    const { data } = await supabase.from("ateliers").select("*").order("date");
    setAteliers((data as Atelier[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAteliers(); }, []);

  const openAdd = () => { setForm(emptyForm); setModal({ open: true, atelier: null }); };
  const openEdit = (a: Atelier) => {
    setForm({
      title: a.title, description: a.description ?? "", date: a.date,
      time: a.time ?? "", spots: a.spots, price: a.price ?? "",
      location: a.location ?? "", lien_paypal: a.lien_paypal ?? "", is_active: a.is_active,
    });
    setModal({ open: true, atelier: a });
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      date: form.date,
      time: form.time || null,
      spots: Number(form.spots),
      price: form.price || null,
      location: form.location || null,
      lien_paypal: form.lien_paypal || null,
      is_active: form.is_active,
    };
    if (modal.atelier) {
      await supabase.from("ateliers").update(payload).eq("id", modal.atelier.id);
    } else {
      await supabase.from("ateliers").insert(payload);
    }
    await fetchAteliers();
    setModal({ open: false, atelier: null });
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet atelier définitivement ?")) return;
    await supabase.from("ateliers").delete().eq("id", id);
    fetchAteliers();
  };

  const toggleActive = async (a: Atelier) => {
    await supabase.from("ateliers").update({ is_active: !a.is_active }).eq("id", a.id);
    fetchAteliers();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ateliers</h1>
          <p className="text-muted-foreground text-sm mt-1">{ateliers.length} atelier(s)</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ateliers.map(a => (
            <div key={a.id} className="bg-card rounded-2xl border p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-foreground leading-snug flex-1 pr-2">{a.title}</h3>
                <button onClick={() => toggleActive(a)}
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    a.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  {a.is_active ? "Actif" : "Inactif"}
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground mb-4 flex-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {new Date(a.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    {a.time && ` · ${a.time}`}
                  </span>
                </div>
                {a.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{a.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>{a.spots} places · {a.price ?? "Gratuit"}</span>
                </div>
                {a.lien_paypal && (
                  <p className="truncate pt-1">
                    <span className="font-medium text-foreground">PayPal :</span> {a.lien_paypal}
                  </p>
                )}
              </div>

              <div className="flex gap-2 mt-auto">
                <button onClick={() => openEdit(a)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-muted transition-colors flex-1 justify-center">
                  <Pencil className="w-3 h-3" /> Modifier
                </button>
                <button onClick={() => handleDelete(a.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-destructive/30 text-destructive rounded-full hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-lg">{modal.atelier ? "Modifier l'atelier" : "Nouvel atelier"}</h2>
              <button onClick={() => setModal({ open: false, atelier: null })}
                className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Titre *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Heure</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Capacité max</label>
                  <input type="number" min={1} value={form.spots} onChange={e => setForm(f => ({ ...f, spots: Number(e.target.value) }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tarif</label>
                  <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="ex: 25€" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Lieu</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Lien PayPal</label>
                <input value={form.lien_paypal} onChange={e => setForm(f => ({ ...f, lien_paypal: e.target.value }))}
                  placeholder="https://paypal.me/..." className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                <p className="text-xs text-muted-foreground mt-1">Affiché uniquement aux membres standard après inscription</p>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                Atelier visible sur le site
              </label>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setModal({ open: false, atelier: null })}
                className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.title || !form.date}
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

export default Ateliers;
