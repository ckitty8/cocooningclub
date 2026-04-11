import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, MapPin, Clock, Users, Euro } from "lucide-react";

type Statut = "brouillon" | "publie" | "complet" | "annule" | "termine";
type Niveau = "debutant" | "intermediaire" | "avance";

interface Atelier {
  id: string;
  titre: string;
  description: string | null;
  description_courte: string | null;
  date_atelier: string;
  heure_debut: string | null;
  duree: string | null;
  lieu: string | null;
  url_image: string | null;
  places_max: number;
  places_disponibles: number;
  tarif_standard: number | null;
  tarif_premium: number | null;
  tarif_affichage: string | null;
  lien_paypal: string | null;
  niveau: Niveau | null;
  statut: Statut;
}

const emptyForm = {
  titre: "", description: "", description_courte: "",
  date_atelier: "", heure_debut: "", duree: "", lieu: "", url_image: "",
  places_max: 10, tarif_standard: "", tarif_premium: "", tarif_affichage: "",
  lien_paypal: "", niveau: "" as Niveau | "", statut: "brouillon" as Statut,
};

const statutLabels: Record<Statut, string> = {
  brouillon: "Brouillon", publie: "Publié", complet: "Complet",
  annule: "Annulé", termine: "Terminé",
};
const statutColors: Record<Statut, string> = {
  brouillon: "bg-gray-100 text-gray-600",
  publie: "bg-green-100 text-green-700",
  complet: "bg-blue-100 text-blue-700",
  annule: "bg-red-100 text-red-600",
  termine: "bg-purple-100 text-purple-600",
};

const Ateliers = () => {
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; atelier: Atelier | null }>({ open: false, atelier: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAteliers = async () => {
    const { data } = await supabase.from("ateliers").select("*").order("date_atelier");
    setAteliers((data as Atelier[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAteliers(); }, []);

  const openAdd = () => { setForm(emptyForm); setModal({ open: true, atelier: null }); };
  const openEdit = (a: Atelier) => {
    setForm({
      titre: a.titre, description: a.description ?? "", description_courte: a.description_courte ?? "",
      date_atelier: a.date_atelier, heure_debut: a.heure_debut ?? "", duree: a.duree ?? "",
      lieu: a.lieu ?? "", url_image: a.url_image ?? "",
      places_max: a.places_max,
      tarif_standard: a.tarif_standard?.toString() ?? "",
      tarif_premium: a.tarif_premium?.toString() ?? "",
      tarif_affichage: a.tarif_affichage ?? "",
      lien_paypal: a.lien_paypal ?? "",
      niveau: a.niveau ?? "", statut: a.statut,
    });
    setModal({ open: true, atelier: a });
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      titre: form.titre,
      description: form.description || null,
      description_courte: form.description_courte || null,
      date_atelier: form.date_atelier,
      heure_debut: form.heure_debut || null,
      duree: form.duree || null,
      lieu: form.lieu || null,
      url_image: form.url_image || null,
      places_max: Number(form.places_max),
      tarif_standard: form.tarif_standard ? Number(form.tarif_standard) : null,
      tarif_premium: form.tarif_premium ? Number(form.tarif_premium) : null,
      tarif_affichage: form.tarif_affichage || null,
      lien_paypal: form.lien_paypal || null,
      niveau: (form.niveau as Niveau) || null,
      statut: form.statut,
    };
    if (modal.atelier) {
      await supabase.from("ateliers").update(payload).eq("id", modal.atelier.id);
    } else {
      await supabase.from("ateliers").insert({ ...payload, places_disponibles: Number(form.places_max) });
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

  const f = (key: keyof typeof form, val: string | number) =>
    setForm(prev => ({ ...prev, [key]: val }));

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
      ) : ateliers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Aucun atelier</p>
          <p className="text-sm mt-1">Cliquez sur "+ Ajouter" pour créer votre premier atelier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ateliers.map(a => (
            <div key={a.id} className="bg-card rounded-2xl border p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-foreground leading-snug flex-1 pr-2">{a.titre}</h3>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[a.statut]}`}>
                  {statutLabels[a.statut]}
                </span>
              </div>

              {a.description_courte && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{a.description_courte}</p>
              )}

              <div className="space-y-1.5 text-xs text-muted-foreground mb-4 flex-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {new Date(a.date_atelier).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    {a.heure_debut && ` · ${a.heure_debut.slice(0, 5)}`}
                    {a.duree && ` · ${a.duree}`}
                  </span>
                </div>
                {a.lieu && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{a.lieu}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>{a.places_disponibles}/{a.places_max} places</span>
                </div>
                {(a.tarif_affichage || a.tarif_standard != null) && (
                  <div className="flex items-center gap-1.5">
                    <Euro className="w-3.5 h-3.5 shrink-0" />
                    <span>{a.tarif_affichage ?? `${a.tarif_standard}€`}</span>
                  </div>
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
                <input value={form.titre} onChange={e => f("titre", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description courte</label>
                <input value={form.description_courte} onChange={e => f("description_courte", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description complète</label>
                <textarea value={form.description} onChange={e => f("description", e.target.value)}
                  rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date *</label>
                  <input type="date" value={form.date_atelier} onChange={e => f("date_atelier", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Heure début</label>
                  <input type="time" value={form.heure_debut} onChange={e => f("heure_debut", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Durée</label>
                  <input value={form.duree} onChange={e => f("duree", e.target.value)}
                    placeholder="ex: 2h30" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Lieu</label>
                  <input value={form.lieu} onChange={e => f("lieu", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Places max</label>
                  <input type="number" min={1} value={form.places_max} onChange={e => f("places_max", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Niveau</label>
                  <select value={form.niveau} onChange={e => f("niveau", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">— Non défini —</option>
                    <option value="debutant">Débutant</option>
                    <option value="intermediaire">Intermédiaire</option>
                    <option value="avance">Avancé</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tarif standard (€)</label>
                  <input type="number" min={0} step={0.01} value={form.tarif_standard} onChange={e => f("tarif_standard", e.target.value)}
                    placeholder="25" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tarif premium (€)</label>
                  <input type="number" min={0} step={0.01} value={form.tarif_premium} onChange={e => f("tarif_premium", e.target.value)}
                    placeholder="20" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Tarif affiché</label>
                <input value={form.tarif_affichage} onChange={e => f("tarif_affichage", e.target.value)}
                  placeholder="ex: À partir de 20€" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Lien PayPal</label>
                <input value={form.lien_paypal} onChange={e => f("lien_paypal", e.target.value)}
                  placeholder="https://paypal.me/..." className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                <p className="text-xs text-muted-foreground mt-1">Affiché uniquement aux membres standard</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Statut</label>
                <select value={form.statut} onChange={e => f("statut", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="brouillon">Brouillon</option>
                  <option value="publie">Publié</option>
                  <option value="complet">Complet</option>
                  <option value="annule">Annulé</option>
                  <option value="termine">Terminé</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setModal({ open: false, atelier: null })}
                className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.titre || !form.date_atelier}
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
