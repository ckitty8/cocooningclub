import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, GripVertical } from "lucide-react";

type FieldType = "text" | "email" | "tel" | "textarea" | "select";

interface FormField {
  id: string;
  label: string;
  field_type: FieldType;
  obligatoire: boolean;
  position: number;
  deletable: boolean;
  options: string[] | null;
}

const typeLabel: Record<FieldType, string> = {
  text:     "Texte court",
  email:    "Email",
  tel:      "Téléphone",
  textarea: "Texte long",
  select:   "Liste déroulante",
};

const emptyForm = { label: "", field_type: "text" as FieldType, obligatoire: false, options: "" };

const Formulaire = () => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; field: FormField | null }>({ open: false, field: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchFields = async () => {
    const { data } = await supabase.from("form_fields").select("*").order("position");
    setFields((data as FormField[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchFields(); }, []);

  const openAdd = () => { setForm(emptyForm); setModal({ open: true, field: null }); };
  const openEdit = (f: FormField) => {
    setForm({
      label: f.label, field_type: f.field_type,
      obligatoire: f.obligatoire, options: f.options?.join(", ") ?? "",
    });
    setModal({ open: true, field: f });
  };

  const handleSave = async () => {
    setSaving(true);
    const options = form.field_type === "select" && form.options
      ? form.options.split(",").map(o => o.trim()).filter(Boolean)
      : null;

    if (modal.field) {
      await supabase.from("form_fields").update({
        label: form.label, field_type: form.field_type,
        obligatoire: form.obligatoire, options,
      }).eq("id", modal.field.id);
    } else {
      const maxPos = fields.reduce((max, f) => Math.max(max, f.position), 0);
      await supabase.from("form_fields").insert({
        label: form.label, field_type: form.field_type,
        obligatoire: form.obligatoire, options,
        position: maxPos + 1, deletable: true,
      });
    }
    await fetchFields();
    setModal({ open: false, field: null });
    setSaving(false);
  };

  const handleDelete = async (f: FormField) => {
    if (!f.deletable) return;
    if (!confirm(`Supprimer le champ "${f.label}" ?`)) return;
    await supabase.from("form_fields").delete().eq("id", f.id);
    fetchFields();
  };

  const move = async (idx: number, dir: "up" | "down") => {
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= fields.length) return;
    await Promise.all([
      supabase.from("form_fields").update({ position: fields[swap].position }).eq("id", fields[idx].id),
      supabase.from("form_fields").update({ position: fields[idx].position }).eq("id", fields[swap].id),
    ]);
    fetchFields();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Formulaire de contact</h1>
          <p className="text-muted-foreground text-sm mt-1">Gérez les champs du formulaire public</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Ajouter un champ
        </button>
      </div>

      <div className="bg-card rounded-2xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y">
            {fields.map((f, idx) => (
              <div key={f.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                {/* Ordre */}
                <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                  <button onClick={() => move(idx, "up")} disabled={idx === 0}
                    className="text-xs hover:text-foreground disabled:opacity-20 leading-none">▲</button>
                  <GripVertical className="w-4 h-4 opacity-40" />
                  <button onClick={() => move(idx, "down")} disabled={idx === fields.length - 1}
                    className="text-xs hover:text-foreground disabled:opacity-20 leading-none">▼</button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{f.label}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{typeLabel[f.field_type]}</span>
                    {f.obligatoire && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Obligatoire</span>
                    )}
                    {!f.deletable && (
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Champ fixe</span>
                    )}
                    {f.options && f.options.length > 0 && (
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        Options : {f.options.join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(f)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {f.deletable && (
                    <button onClick={() => handleDelete(f)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-lg">{modal.field ? "Modifier le champ" : "Nouveau champ"}</h2>
              <button onClick={() => setModal({ open: false, field: null })}
                className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Label *</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="ex: Votre message"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Type de champ</label>
                <select value={form.field_type} onChange={e => setForm(f => ({ ...f, field_type: e.target.value as FieldType }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="text">Texte court</option>
                  <option value="email">Email</option>
                  <option value="tel">Téléphone</option>
                  <option value="textarea">Texte long</option>
                  <option value="select">Liste déroulante</option>
                </select>
              </div>
              {form.field_type === "select" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Options (séparées par des virgules)</label>
                  <input value={form.options} onChange={e => setForm(f => ({ ...f, options: e.target.value }))}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={form.obligatoire}
                  onChange={e => setForm(f => ({ ...f, obligatoire: e.target.checked }))} className="rounded" />
                Champ obligatoire
              </label>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setModal({ open: false, field: null })}
                className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.label}
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

export default Formulaire;
