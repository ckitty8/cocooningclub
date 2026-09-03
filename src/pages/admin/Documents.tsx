import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { withTimeout } from "@/utils/withTimeout";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, ExternalLink, FileText, BookOpen, Newspaper, Image as ImageIcon, type LucideIcon } from "lucide-react";

type DocType = "magazine" | "guide" | "lien_externe";
type DocAcces = "membres" | "tous";

interface Document {
  id: string;
  titre: string;
  description: string | null;
  type: DocType;
  fichier_url: string | null;
  fichier_chemin: string | null;
  lien_externe: string | null;
  url_image: string | null;
  acces: DocAcces;
  created_at: string;
}

const typeIcon: Record<DocType, LucideIcon> = {
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
  tous:    "Tous les membres",
};

const emptyForm = {
  titre: "", description: "", type: "guide" as DocType,
  lien_externe: "", acces: "membres" as DocAcces, url_image: "",
};

const Documents = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; doc: Document | null }>({ open: false, doc: null });
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.from("documents").select("*").order("created_at", { ascending: false })
      );
      if (error) {
        console.error("[fetchDocs]", error);
        toast.error(`Impossible de charger les documents : ${error.message}`, { duration: 8000 });
      }
      setDocs((data as Document[]) ?? []);
    } catch (err) {
      console.error("[Documents.fetchDocs] error:", err);
      toast.error("Erreur lors du chargement des documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const openAdd = () => { setForm(emptyForm); setFile(null); setModal({ open: true, doc: null }); };
  const openEdit = (d: Document) => {
    setForm({
      titre: d.titre, description: d.description ?? "", type: d.type,
      lien_externe: d.lien_externe ?? "", acces: d.acces,
      url_image: d.url_image ?? "",
    });
    setFile(null);
    setModal({ open: true, doc: d });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("L'image doit faire moins de 5 Mo");
      return;
    }
    setUploadingImage(true);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `documents/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("images").upload(path, f, { contentType: f.type });
    if (error) {
      toast.error(`Erreur upload : ${error.message}`, { duration: 8000 });
      setUploadingImage(false);
      return;
    }
    const { data } = supabase.storage.from("images").getPublicUrl(path);
    setForm(prev => ({ ...prev, url_image: data.publicUrl }));
    setUploadingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    let fichier_url = modal.doc?.fichier_url ?? null;
    let fichier_chemin = modal.doc?.fichier_chemin ?? null;

    if (file && form.type !== "lien_externe") {
      const path = `${Date.now()}-${file.name}`;
      const { data: upload, error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) {
        console.error("[upload]", upErr);
        toast.error(`Erreur upload : ${upErr.message}`, { duration: 8000 });
        setSaving(false);
        return;
      }
      if (upload) {
        fichier_chemin = path;
        // fichier_url conservé pour rétro-compat (lecture via URL signée à la demande)
        fichier_url = path;
      }
    }

    const payload = {
      titre: form.titre,
      description: form.description || null,
      type: form.type,
      fichier_url: form.type !== "lien_externe" ? fichier_url : null,
      fichier_chemin: form.type !== "lien_externe" ? fichier_chemin : null,
      lien_externe: form.type === "lien_externe" ? form.lien_externe || null : null,
      acces: form.acces,
      url_image: form.url_image || null,
    };

    const { error } = modal.doc
      ? await supabase.from("documents").update(payload).eq("id", modal.doc.id)
      : await supabase.from("documents").insert(payload);

    if (error) {
      console.error("[handleSave]", error);
      toast.error(`Erreur : ${error.message}`, { duration: 8000 });
      setSaving(false);
      return;
    }

    logAction(
      modal.doc ? "document.update" : "document.create",
      "documents",
      modal.doc?.id ?? null,
      { titre: payload.titre, type: payload.type, acces: payload.acces }
    );

    toast.success(modal.doc ? "Document mis à jour" : "Document ajouté");
    await fetchDocs();
    setModal({ open: false, doc: null });
    setSaving(false);
  };

  const handleOpen = async (d: Document) => {
    if (d.lien_externe) {
      window.open(d.lien_externe, "_blank", "noopener,noreferrer");
      return;
    }
    if (!d.fichier_chemin) {
      toast.error("Fichier indisponible (chemin manquant)");
      return;
    }
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(d.fichier_chemin, 60 * 5); // 5 min
    if (error || !data?.signedUrl) {
      toast.error(`Impossible d'ouvrir le fichier : ${error?.message ?? "URL non signée"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (id: string) => {
    const doc = docs.find(d => d.id === id);
    if (!confirm("Supprimer ce document ?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      logAction("document.delete", "documents", id, { titre: doc?.titre, type: doc?.type });
      toast.success("Document supprimé");
      fetchDocs();
    }
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
                  {d.url_image ? (
                    <img src={d.url_image} alt="" className="w-12 h-12 rounded-xl object-contain bg-muted/30 shrink-0 border" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                  )}
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
                    {(d.lien_externe || d.fichier_chemin) && (
                      <button onClick={() => handleOpen(d)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ouvrir">
                        <ExternalLink className="w-4 h-4" />
                      </button>
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
                <label className="block text-sm font-medium mb-1.5">Photo de présentation</label>
                <div className="flex items-start gap-3">
                  {form.url_image ? (
                    <img src={form.url_image} alt="" className="w-24 h-24 rounded-xl object-cover border" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}
                      className="text-sm px-3 py-1.5 border rounded-full hover:bg-muted disabled:opacity-50">
                      {uploadingImage ? "Envoi..." : form.url_image ? "Changer" : "Uploader"}
                    </button>
                    {form.url_image && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, url_image: "" }))}
                        className="text-sm text-destructive hover:underline">Retirer</button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WebP. Max 5 Mo.</p>
              </div>
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
                    <option value="tous">Tous les membres</option>
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
                  {modal.doc?.fichier_chemin && !file && (
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
