import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, ExternalLink, FileText, BookOpen, Newspaper } from "lucide-react";

type DocType = "magazine" | "guide" | "lien_externe";
type DocAcces = "membres" | "premium" | "tous";

interface Document {
  id: string;
  titre: string;
  description: string | null;
  type: DocType;
  fichier_url: string | null;
  lien_externe: string | null;
  acces: DocAcces;
  created_at: string;
}

const typeIcon: Record<DocType, any> = {
  magazine:     Newspaper,
  guide:        BookOpen,
  lien_externe: ExternalLink,
};

const typeLabel: Record<DocType, string> = {
  magazine:     "Magazine",
  guide:        "Guide",
  lien_externe: "Lien externe",
};

const accesLabel: Record<DocAcces, string> = {
  membres: "Membres uniquement",
  premium: "Premium uniquement",
  tous:    "Membres + Premium",
};

const emptyForm = {
  titre: "", description: "", type: "guide" as DocType,
  lien_externe: "", acces: "membres" as DocAcces,
};

const Documents = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; doc: Document | null }>({ open: false, doc: null });
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchDocs = async () => {
    const { data } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    setDocs((data as Document[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const openAdd = () => { setForm(emptyForm); setFile(null); setModal({ open: true, doc: null }); };
  const openEdit = (d: Document) => {
    setForm({ titre: d.titre, description: d.description ?? "", type: d.type, lien_externe: d.lien_externe ?? "", acces: d.acces });
    setFile(null);
    setModal({ open: true, doc: d });
  };

  const handleSave = async () => {
    setSaving(true);
    let fichier_url = modal.doc?.fichier_url ?? null;

    if (file && form.type !== "lien_externe") {
      const path = `${Date.now()}-${file.name}`;
      const { data: upload } = await supabase.storage.from("documents").upload(path, file);
      if (upload) {
        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
        fichier_url = urlData.publicUrl;
      }
    }

    const payload = {
      titre: form.titre,
      description: form.description || null,
      type: form.type,
      fichier_url: form.type !== "lien_externe" ? fichier_url : null,
      lien_externe: form.type === "lien_externe" ? form.lien_externe || null : null,
      acces: form.acces,
    };

    if (modal.doc) {
      await supabase.from("documents").update(payload).eq("id", modal.doc.id);
    } else {
      await supabase.from("documents").insert(payload);
    }
    await fetchDocs();
    setModal({ open: false, doc: null });
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce document ?")) return;
    await supabase.from("documents").delete().eq("id", id);
    fetchDocs();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents & Ressources</h1>
          <p className="text-muted-foreground text-sm mt-1">{docs.length} document(s)</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      <div className="bg-card rounded-2xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Aucun document publié</p>
          </div>
        ) : (
          <div className="divide-y">
            {docs.map(d => {
              const Icon = typeIcon[d.type];
              return (
                <div key={d.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{d.titre}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{typeLabel[d.type]}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        {accesLabel[d.acces]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(d.lien_externe || d.fichier_url) && (
                      <a href={d.lien_externe ?? d.fichier_url ?? "#"} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ouvrir">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => openEdit(d)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(d.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-lg">{modal.doc ? "Modifier" : "Ajouter un document"}</h2>
              <button onClick={() => setModal({ open: false, doc: null })}
                className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Titre *</label>
                <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DocType }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="magazine">Magazine</option>
                    <option value="guide">Guide</option>
                    <option value="lien_externe">Lien externe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Accès</label>
                  <select value={form.acces} onChange={e => setForm(f => ({ ...f, acces: e.target.value as DocAcces }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="membres">Membres uniquement</option>
                    <option value="premium">Premium uniquement</option>
                    <option value="tous">Membres + Premium</option>
                  </select>
                </div>
              </div>
              {form.type === "lien_externe" ? (
                <div>
                  <label className="block text-sm font-medium mb-1.5">URL</label>
                  <input value={form.lien_externe} onChange={e => setForm(f => ({ ...f, lien_externe: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Fichier PDF</label>
                  <input type="file" accept=".pdf" onChange={e => setFile(e.target.files?.[0] ?? null)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none" />
                  {modal.doc?.fichier_url && !file && (
                    <p className="text-xs text-muted-foreground mt-1">Fichier actuel conservé si aucun nouveau fichier sélectionné</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setModal({ open: false, doc: null })}
                className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.titre}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Documents;
