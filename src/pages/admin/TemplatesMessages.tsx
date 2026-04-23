import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, RotateCcw, Info, Loader2, Mail, MessageSquare } from "lucide-react";

interface Template {
  id: string;
  cle: string;
  libelle: string;
  valeur: string;
  description: string | null;
  modifie_le: string;
}

const VARIABLES = [
  { key: "{prenom}", desc: "Prénom du participant" },
  { key: "{nom}", desc: "Nom du participant" },
  { key: "{titre}", desc: "Titre de l'atelier" },
  { key: "{date}", desc: "Date de l'atelier (ex: 15 mai 2026)" },
  { key: "{heure}", desc: "Heure de début (ex: 14:30)" },
  { key: "{lieu}", desc: "Lieu de l'atelier" },
];

// Groupe les templates par contexte
const getContextLabel = (cle: string): { label: string; isMail: boolean; isWhatsApp: boolean } => {
  if (cle.startsWith("validation_")) {
    return {
      label: "Validation",
      isMail: cle.includes("mail"),
      isWhatsApp: cle.includes("whatsapp"),
    };
  }
  if (cle.startsWith("refus_")) {
    return {
      label: "Refus",
      isMail: cle.includes("mail"),
      isWhatsApp: cle.includes("whatsapp"),
    };
  }
  return { label: cle, isMail: false, isWhatsApp: false };
};

const TemplatesMessages = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("parametres_messages")
      .select("*")
      .order("cle");

    if (error) {
      toast.error("Erreur de chargement des templates");
    } else if (data) {
      setTemplates(data as Template[]);
      const initial: Record<string, string> = {};
      (data as Template[]).forEach(t => { initial[t.id] = t.valeur; });
      setEdited(initial);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleChange = (id: string, valeur: string) => {
    setEdited(prev => ({ ...prev, [id]: valeur }));
  };

  const handleSave = async (tpl: Template) => {
    const nouvelleValeur = edited[tpl.id];
    if (nouvelleValeur === tpl.valeur) return;
    if (!nouvelleValeur.trim()) {
      toast.error("Le template ne peut pas être vide");
      return;
    }

    setSaving(tpl.id);
    const { error } = await supabase
      .from("parametres_messages")
      .update({ valeur: nouvelleValeur })
      .eq("id", tpl.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success(`"${tpl.libelle}" mis à jour`);
      setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, valeur: nouvelleValeur } : t));
    }
    setSaving(null);
  };

  const handleReset = (tpl: Template) => {
    setEdited(prev => ({ ...prev, [tpl.id]: tpl.valeur }));
  };

  const insertVariable = (tplId: string, variable: string) => {
    const textarea = document.getElementById(`tpl-${tplId}`) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart ?? edited[tplId].length;
    const end = textarea.selectionEnd ?? edited[tplId].length;
    const current = edited[tplId];
    const newValue = current.substring(0, start) + variable + current.substring(end);
    setEdited(prev => ({ ...prev, [tplId]: newValue }));
    // Remet le focus avec le curseur après la variable insérée
    setTimeout(() => {
      textarea.focus();
      const pos = start + variable.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

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
        <h1 className="text-2xl font-bold text-foreground">Modèles de messages</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Personnalisez les messages envoyés par email ou WhatsApp lors de la validation ou du refus des pré-inscriptions.
        </p>
      </div>

      {/* Aide variables */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-foreground mb-2">Variables disponibles</p>
            <p className="text-sm text-muted-foreground mb-3">
              Utilisez ces variables dans vos messages, elles seront automatiquement remplacées :
            </p>
            <div className="flex flex-wrap gap-2">
              {VARIABLES.map(v => (
                <div key={v.key} className="bg-background border rounded-lg px-3 py-1.5 text-xs">
                  <code className="font-mono text-primary font-medium">{v.key}</code>
                  <span className="text-muted-foreground ml-2">→ {v.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Liste des templates */}
      <div className="space-y-4">
        {templates.map(tpl => {
          const ctx = getContextLabel(tpl.cle);
          const hasChanges = edited[tpl.id] !== tpl.valeur;
          const isSubject = tpl.cle.endsWith("_sujet");

          return (
            <div key={tpl.id} className="bg-card border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    ctx.isWhatsApp ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {ctx.isWhatsApp ? <MessageSquare className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{tpl.libelle}</h3>
                    {tpl.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {hasChanges && (
                    <button
                      onClick={() => handleReset(tpl)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Annuler
                    </button>
                  )}
                  <button
                    onClick={() => handleSave(tpl)}
                    disabled={!hasChanges || saving === tpl.id}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {saving === tpl.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Save className="w-3.5 h-3.5" />
                    }
                    Enregistrer
                  </button>
                </div>
              </div>

              {/* Variables rapides */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {VARIABLES.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(tpl.id, v.key)}
                    className="text-xs font-mono px-2 py-0.5 bg-muted hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                    title={`Insérer ${v.key}`}
                  >
                    {v.key}
                  </button>
                ))}
              </div>

              {/* Input / Textarea */}
              {isSubject ? (
                <input
                  id={`tpl-${tpl.id}`}
                  type="text"
                  value={edited[tpl.id]}
                  onChange={e => handleChange(tpl.id, e.target.value)}
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <textarea
                  id={`tpl-${tpl.id}`}
                  value={edited[tpl.id]}
                  onChange={e => handleChange(tpl.id, e.target.value)}
                  rows={ctx.isWhatsApp ? 3 : 7}
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono"
                />
              )}

              <p className="text-xs text-muted-foreground mt-2">
                Dernière modification : {new Date(tpl.modifie_le).toLocaleString("fr-FR")}
              </p>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
};

export default TemplatesMessages;
