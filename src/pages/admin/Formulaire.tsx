import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, X, GripVertical, Copy, ArrowLeft, Check } from "lucide-react";

type FieldType = "text" | "email" | "tel" | "textarea" | "select";

interface FormulaireRow {
  id: string;
  nom: string;
  description: string | null;
  est_actif: boolean;
  cree_le: string;
  form_fields: { id: string }[];
}

interface FormField {
  id: string;
  formulaire_id: string;
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

const emptyFieldForm = { label: "", field_type: "text" as FieldType, obligatoire: false, options: "" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ─── List view ───────────────────────────────────────────────────────────────

const FormCard = ({
  f,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleActive,
}: {
  f: FormulaireRow;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) => (
  <div className="bg-card border rounded-2xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-base truncate">{f.nom}</h3>
          {f.est_actif ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium shrink-0">Actif</span>
          ) : (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">Inactif</span>
          )}
        </div>
        {f.description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{f.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {f.form_fields.length} champ{f.form_fields.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2 flex-wrap pt-1 border-t">
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-full hover:bg-muted transition-colors font-medium"
      >
        <Pencil className="w-3 h-3" /> Modifier
      </button>
      <button
        onClick={onDuplicate}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-full hover:bg-muted transition-colors font-medium"
      >
        <Copy className="w-3 h-3" /> Dupliquer
      </button>
      <button
        onClick={onToggleActive}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-full transition-colors font-medium ${
          f.est_actif
            ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            : "hover:bg-green-50 hover:text-green-700 hover:border-green-200"
        }`}
      >
        {f.est_actif ? "Désactiver" : "Activer"}
      </button>
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border rounded-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors ml-auto"
      >
        <Trash2 className="w-3 h-3" /> Supprimer
      </button>
    </div>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

const Formulaire = () => {
  const [view, setView] = useState<"list" | "editor">("list");
  const [formulaires, setFormulaires] = useState<FormulaireRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor
  const [editingForm, setEditingForm] = useState<FormulaireRow | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaSaved, setMetaSaved] = useState(false);

  // Field modal
  const [modal, setModal] = useState<{ open: boolean; field: FormField | null }>({ open: false, field: null });
  const [fieldForm, setFieldForm] = useState(emptyFieldForm);
  const [savingField, setSavingField] = useState(false);

  // New form modal
  const [newModal, setNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // ── Fetch ──
  const fetchFormulaires = async () => {
    const { data } = await db.from("formulaires").select("*, form_fields(id)").order("cree_le");
    setFormulaires((data as FormulaireRow[]) ?? []);
    setLoading(false);
  };

  const fetchFields = async (formulaireId: string) => {
    const { data } = await db.from("form_fields").select("*").eq("formulaire_id", formulaireId).order("position");
    setFields((data as FormField[]) ?? []);
  };

  useEffect(() => { fetchFormulaires(); }, []);

  // ── List actions ──
  const openEditor = async (f: FormulaireRow) => {
    setEditingForm(f);
    setFormName(f.nom);
    setFormDesc(f.description ?? "");
    setView("editor");
    setFieldsLoading(true);
    await fetchFields(f.id);
    setFieldsLoading(false);
  };

  const handleDuplicate = async (f: FormulaireRow) => {
    const { data: newForm } = await db.from("formulaires").insert({
      nom: `${f.nom} (copie)`,
      description: f.description,
      est_actif: false,
    }).select().single();
    if (!newForm) return;
    const { data: origFields } = await db.from("form_fields").select("*").eq("formulaire_id", f.id).order("position");
    if (origFields && origFields.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      await db.from("form_fields").insert(origFields.map(({ id: _id, cree_le: _c, ...rest }: FormField & { cree_le: string }) => ({ ...rest, formulaire_id: newForm.id })));
    }
    fetchFormulaires();
  };

  const handleDelete = async (f: FormulaireRow) => {
    if (!confirm(`Supprimer le formulaire "${f.nom}" et tous ses champs ?`)) return;
    await db.from("formulaires").delete().eq("id", f.id);
    fetchFormulaires();
  };

  const handleToggleActive = async (f: FormulaireRow) => {
    await db.from("formulaires").update({ est_actif: !f.est_actif }).eq("id", f.id);
    fetchFormulaires();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await db.from("formulaires").insert({ nom: newName.trim(), description: newDesc.trim() || null, est_actif: false });
    setNewModal(false);
    setNewName("");
    setNewDesc("");
    setCreating(false);
    fetchFormulaires();
  };

  // ── Editor meta save ──
  const saveFormMeta = async () => {
    if (!editingForm) return;
    setSavingMeta(true);
    await db.from("formulaires").update({ nom: formName, description: formDesc || null }).eq("id", editingForm.id);
    setSavingMeta(false);
    setMetaSaved(true);
    setTimeout(() => setMetaSaved(false), 2000);
  };

  const backToList = () => {
    setView("list");
    setEditingForm(null);
    fetchFormulaires();
  };

  // ── Field CRUD ──
  const handleSaveField = async () => {
    if (!editingForm) return;
    setSavingField(true);
    const options = fieldForm.field_type === "select" && fieldForm.options
      ? fieldForm.options.split(",").map(o => o.trim()).filter(Boolean)
      : null;

    if (modal.field) {
      await db.from("form_fields").update({
        label: fieldForm.label, field_type: fieldForm.field_type,
        obligatoire: fieldForm.obligatoire, options,
      }).eq("id", modal.field.id);
    } else {
      const maxPos = fields.reduce((max, f) => Math.max(max, f.position), 0);
      await db.from("form_fields").insert({
        formulaire_id: editingForm.id,
        label: fieldForm.label, field_type: fieldForm.field_type,
        obligatoire: fieldForm.obligatoire, options,
        position: maxPos + 1, deletable: true,
      });
    }
    await fetchFields(editingForm.id);
    setModal({ open: false, field: null });
    setSavingField(false);
  };

  const handleDeleteField = async (f: FormField) => {
    if (!f.deletable) return;
    if (!confirm(`Supprimer le champ "${f.label}" ?`)) return;
    await db.from("form_fields").delete().eq("id", f.id);
    await fetchFields(editingForm!.id);
  };

  const moveField = async (idx: number, dir: "up" | "down") => {
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= fields.length) return;
    await Promise.all([
      db.from("form_fields").update({ position: fields[swap].position }).eq("id", fields[idx].id),
      db.from("form_fields").update({ position: fields[idx].position }).eq("id", fields[swap].id),
    ]);
    await fetchFields(editingForm!.id);
  };

  // ── Render ──
  return (
    <AdminLayout>
      {view === "list" ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Formulaires de contact</h1>
              <p className="text-muted-foreground text-sm mt-1">Gérez vos formulaires et leurs champs</p>
            </div>
            <button
              onClick={() => setNewModal(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Nouveau formulaire
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : formulaires.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <p className="text-sm">Aucun formulaire. Créez-en un pour commencer.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {formulaires.map(f => (
                <FormCard
                  key={f.id}
                  f={f}
                  onEdit={() => openEditor(f)}
                  onDuplicate={() => handleDuplicate(f)}
                  onDelete={() => handleDelete(f)}
                  onToggleActive={() => handleToggleActive(f)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Editor header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={backToList} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Modifier le formulaire</h1>
            </div>
          </div>

          {/* Form meta */}
          <div className="bg-card border rounded-2xl p-6 mb-6">
            <h2 className="font-semibold mb-4">Informations générales</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nom *</label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <input
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Description optionnelle"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={saveFormMeta}
                disabled={savingMeta || !formName.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {metaSaved ? <><Check className="w-3.5 h-3.5" /> Enregistré</> : savingMeta ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>

          {/* Fields */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Champs du formulaire</h2>
            <button
              onClick={() => { setFieldForm(emptyFieldForm); setModal({ open: true, field: null }); }}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Ajouter un champ
            </button>
          </div>

          <div className="bg-card rounded-2xl border overflow-hidden">
            {fieldsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : fields.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Aucun champ. Ajoutez-en un.
              </div>
            ) : (
              <div className="divide-y">
                {fields.map((f, idx) => (
                  <div key={f.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                    <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                      <button onClick={() => moveField(idx, "up")} disabled={idx === 0}
                        className="text-xs hover:text-foreground disabled:opacity-20 leading-none">▲</button>
                      <GripVertical className="w-4 h-4 opacity-40" />
                      <button onClick={() => moveField(idx, "down")} disabled={idx === fields.length - 1}
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
                      <button
                        onClick={() => { setFieldForm({ label: f.label, field_type: f.field_type, obligatoire: f.obligatoire, options: f.options?.join(", ") ?? "" }); setModal({ open: true, field: f }); }}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {f.deletable && (
                        <button
                          onClick={() => handleDeleteField(f)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* New form modal */}
      {newModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-lg">Nouveau formulaire</h2>
              <button onClick={() => setNewModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nom *</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ex: Formulaire d'inscription"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <input
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description optionnelle"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setNewModal(false)}
                className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleCreate} disabled={creating || !newName.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity">
                {creating ? "Création..." : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-lg">{modal.field ? "Modifier le champ" : "Nouveau champ"}</h2>
              <button onClick={() => setModal({ open: false, field: null })} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Label *</label>
                <input
                  value={fieldForm.label}
                  onChange={e => setFieldForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="ex: Votre message"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Type de champ</label>
                <select
                  value={fieldForm.field_type}
                  onChange={e => setFieldForm(f => ({ ...f, field_type: e.target.value as FieldType }))}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="text">Texte court</option>
                  <option value="email">Email</option>
                  <option value="tel">Téléphone</option>
                  <option value="textarea">Texte long</option>
                  <option value="select">Liste déroulante</option>
                </select>
              </div>
              {fieldForm.field_type === "select" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Options (séparées par des virgules)</label>
                  <input
                    value={fieldForm.options}
                    onChange={e => setFieldForm(f => ({ ...f, options: e.target.value }))}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={fieldForm.obligatoire}
                  onChange={e => setFieldForm(f => ({ ...f, obligatoire: e.target.checked }))}
                  className="rounded"
                />
                Champ obligatoire
              </label>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setModal({ open: false, field: null })}
                className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleSaveField} disabled={savingField || !fieldForm.label}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity">
                {savingField ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Formulaire;
