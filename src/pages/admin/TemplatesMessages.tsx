import { useEffect, useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { withTimeout } from "@/utils/withTimeout";
import { toast } from "sonner";
import { Save, RotateCcw, Info, Loader2, Mail, MessageSquare, CheckCircle2, XCircle } from "lucide-react";

interface Template {
  id: string;
  cle: string;
  libelle: string;
  valeur: string;
  description: string | null;
  modifie_le: string;
}

type Tab = "mail" | "whatsapp";
type Context = "validation" | "refus";

const VARIABLES = [
  { key: "{prenom}", desc: "Prénom du participant" },
  { key: "{nom}",    desc: "Nom du participant" },
  { key: "{titre}",  desc: "Titre de l'atelier" },
  { key: "{date}",   desc: "Date de l'atelier" },
  { key: "{heure}",  desc: "Heure de début" },
  { key: "{lieu}",   desc: "Lieu de l'atelier" },
];

const TemplatesMessages = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingContext, setSavingContext] = useState<string | null>(null); // e.g. "validation_mail"
  const [activeTab, setActiveTab] = useState<Tab>("mail");

  const fetchTemplates = async () => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("parametres_messages")
          .select("*")
          .order("cle")
      );

      if (error) {
        toast.error("Erreur de chargement des templates");
      } else if (data) {
        setTemplates(data as Template[]);
        const initial: Record<string, string> = {};
        (data as Template[]).forEach(t => { initial[t.id] = t.valeur; });
        setEdited(initial);
      }
    } catch (err) {
      console.error("[TemplatesMessages.fetchTemplates] error:", err);
      toast.error("Erreur de chargement des templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  // Récupère le template par sa clé (ex: "validation_mail_sujet")
  const tplByKey = useMemo(() => {
    const map: Record<string, Template> = {};
    templates.forEach(t => { map[t.cle] = t; });
    return map;
  }, [templates]);

  const getSujet = (ctx: Context) => tplByKey[`${ctx}_mail_sujet`];
  const getCorpsMail = (ctx: Context) => tplByKey[`${ctx}_mail_corps`];
  const getWhatsApp = (ctx: Context) => tplByKey[`${ctx}_whatsapp`];

  const hasContextChanges = (ctx: Context, tab: Tab): boolean => {
    if (tab === "mail") {
      const s = getSujet(ctx);
      const c = getCorpsMail(ctx);
      return (
        (s && edited[s.id] !== s.valeur) ||
        (c && edited[c.id] !== c.valeur)
      ) as boolean;
    } else {
      const w = getWhatsApp(ctx);
      return !!(w && edited[w.id] !== w.valeur);
    }
  };

  const handleChange = (id: string, valeur: string) => {
    setEdited(prev => ({ ...prev, [id]: valeur }));
  };

  const handleSaveContext = async (ctx: Context, tab: Tab) => {
    const key = `${ctx}_${tab}`;
    setSavingContext(key);

    const toSave: Template[] = [];
    if (tab === "mail") {
      const s = getSujet(ctx);
      const c = getCorpsMail(ctx);
      if (s && edited[s.id] !== s.valeur) toSave.push(s);
      if (c && edited[c.id] !== c.valeur) toSave.push(c);
    } else {
      const w = getWhatsApp(ctx);
      if (w && edited[w.id] !== w.valeur) toSave.push(w);
    }

    // Valide que rien n'est vide
    for (const tpl of toSave) {
      if (!edited[tpl.id].trim()) {
        toast.error(`"${tpl.libelle}" ne peut pas être vide`);
        setSavingContext(null);
        return;
      }
    }

    // Enregistre en parallèle
    const results = await Promise.all(
      toSave.map(tpl =>
        supabase.from("parametres_messages").update({ valeur: edited[tpl.id] }).eq("id", tpl.id)
      )
    );

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success(`Message de ${ctx === "validation" ? "validation" : "refus"} enregistré`);
      setTemplates(prev =>
        prev.map(t => {
          const upd = toSave.find(x => x.id === t.id);
          return upd ? { ...t, valeur: edited[upd.id] } : t;
        })
      );
      // Log : un log par template modifié
      toSave.forEach(tpl => {
        logAction("template_message.update", "parametres_messages", tpl.id, {
          cle: tpl.cle, libelle: tpl.libelle,
        });
      });
    }
    setSavingContext(null);
  };

  const handleResetContext = (ctx: Context, tab: Tab) => {
    const tpls: Template[] = [];
    if (tab === "mail") {
      const s = getSujet(ctx); if (s) tpls.push(s);
      const c = getCorpsMail(ctx); if (c) tpls.push(c);
    } else {
      const w = getWhatsApp(ctx); if (w) tpls.push(w);
    }
    setEdited(prev => {
      const next = { ...prev };
      tpls.forEach(t => { next[t.id] = t.valeur; });
      return next;
    });
  };

  const insertVariable = (tplId: string, variable: string) => {
    const el = document.getElementById(`tpl-${tplId}`) as HTMLTextAreaElement | HTMLInputElement | null;
    if (!el) return;
    const start = el.selectionStart ?? (edited[tplId]?.length ?? 0);
    const end = el.selectionEnd ?? (edited[tplId]?.length ?? 0);
    const current = edited[tplId] ?? "";
    const newValue = current.substring(0, start) + variable + current.substring(end);
    setEdited(prev => ({ ...prev, [tplId]: newValue }));
    setTimeout(() => {
      el.focus();
      const pos = start + variable.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  // ──────────────────────────────────────────
  // Composant carte de contexte (validation / refus)
  // ──────────────────────────────────────────
  const ContextCard = ({ ctx, tab }: { ctx: Context; tab: Tab }) => {
    const isValidation = ctx === "validation";
    const headerBg = isValidation ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200";
    const titleColor = isValidation ? "text-green-700" : "text-red-700";
    const IconHead = isValidation ? CheckCircle2 : XCircle;
    const ctxLabel = isValidation ? "Validation" : "Refus";
    const ctxDesc = isValidation
      ? "Envoyé quand tu valides une pré-inscription."
      : "Envoyé quand tu refuses une pré-inscription.";

    const hasChanges = hasContextChanges(ctx, tab);
    const saveKey = `${ctx}_${tab}`;
    const isSaving = savingContext === saveKey;

    // Templates concernés
    const sujet = tab === "mail" ? getSujet(ctx) : null;
    const corps = tab === "mail" ? getCorpsMail(ctx) : getWhatsApp(ctx);

    if (!corps) return null;

    return (
      <div className="bg-card border rounded-2xl overflow-hidden flex flex-col">
        {/* Header coloré */}
        <div className={`${headerBg} border-b px-5 py-4`}>
          <div className="flex items-center gap-2">
            <IconHead className={`w-5 h-5 ${titleColor}`} />
            <h3 className={`font-semibold ${titleColor}`}>{ctxLabel}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{ctxDesc}</p>
        </div>

        {/* Corps */}
        <div className="p-5 flex-1 flex flex-col gap-4">
          {/* Variables rapides (communes à tous les champs de cette carte) */}
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map(v => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(corps.id, v.key)}
                className="text-xs font-mono px-2 py-0.5 bg-muted hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                title={`Insérer ${v.key} dans le corps`}
              >
                {v.key}
              </button>
            ))}
          </div>

          {/* Objet (mail uniquement) */}
          {sujet && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Objet
              </label>
              <input
                id={`tpl-${sujet.id}`}
                type="text"
                value={edited[sujet.id] ?? ""}
                onChange={e => handleChange(sujet.id, e.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {/* Corps (mail) ou Message (whatsapp) */}
          <div className="flex-1 flex flex-col">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              {tab === "mail" ? "Corps" : "Message"}
            </label>
            <textarea
              id={`tpl-${corps.id}`}
              value={edited[corps.id] ?? ""}
              onChange={e => handleChange(corps.id, e.target.value)}
              rows={tab === "mail" ? 8 : 5}
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono flex-1"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Dernière modif : {new Date(corps.modifie_le).toLocaleString("fr-FR")}
          </p>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t bg-muted/30 flex items-center justify-end gap-2">
          {hasChanges && (
            <button
              onClick={() => handleResetContext(ctx, tab)}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium text-muted-foreground hover:bg-background transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Annuler
            </button>
          )}
          <button
            onClick={() => handleSaveContext(ctx, tab)}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Enregistrer
          </button>
        </div>
      </div>
    );
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
              Clique sur une variable pour l'insérer dans le message. Elles seront remplacées automatiquement :
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

      {/* Onglets */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("mail")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "mail"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Mail className="w-4 h-4" />
          Mail
        </button>
        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "whatsapp"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          WhatsApp
        </button>
      </div>

      {/* 2 cartes côte à côte : Validation + Refus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ContextCard ctx="validation" tab={activeTab} />
        <ContextCard ctx="refus"      tab={activeTab} />
      </div>
    </AdminLayout>
  );
};

export default TemplatesMessages;
