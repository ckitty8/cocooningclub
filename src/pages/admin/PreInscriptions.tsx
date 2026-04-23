import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Check, X, Mail, MessageSquare, Clock, Calendar, MapPin, Phone, User,
  CheckCircle2, XCircle, Loader2
} from "lucide-react";

interface Inscription {
  id: string;
  atelier_id: string;
  prenom_invite: string | null;
  nom_invite: string | null;
  email_invite: string | null;
  telephone_invite: string | null;
  date_naissance: string | null;
  statut: "en_attente" | "confirme" | "annule";
  inscrit_le: string;
  ateliers?: {
    id: string;
    titre: string;
    date_atelier: string;
    heure_debut: string;
    lieu: string | null;
  } | null;
}

interface Template {
  cle: string;
  valeur: string;
}

type FilterStatut = "en_attente" | "confirme" | "annule" | "tous";

// Formatage des dates
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};

const formatHeure = (h: string) => h.substring(0, 5);

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

// Remplace les variables dans un template
const fillTemplate = (tpl: string, insc: Inscription): string => {
  const a = insc.ateliers;
  return tpl
    .replaceAll("{prenom}", insc.prenom_invite ?? "")
    .replaceAll("{nom}", insc.nom_invite ?? "")
    .replaceAll("{titre}", a?.titre ?? "")
    .replaceAll("{date}", a?.date_atelier ? formatDate(a.date_atelier) : "")
    .replaceAll("{heure}", a?.heure_debut ? formatHeure(a.heure_debut) : "")
    .replaceAll("{lieu}", a?.lieu ?? "");
};

// Normalise un numéro de téléphone FR pour wa.me
const normalizePhoneForWhatsApp = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("33")) return digits;
  if (digits.startsWith("0")) return "33" + digits.substring(1);
  return digits;
};

const statutBadge: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-700",
  confirme:   "bg-green-100 text-green-700",
  annule:     "bg-red-100 text-red-700",
};

const statutLabel: Record<string, string> = {
  en_attente: "En attente",
  confirme:   "Validé",
  annule:     "Refusé",
};

const PreInscriptions = () => {
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatut>("en_attente");
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchAll = async () => {
    const [inscRes, tplRes] = await Promise.all([
      supabase
        .from("inscriptions")
        .select("*, ateliers(id, titre, date_atelier, heure_debut, lieu)")
        .order("inscrit_le", { ascending: false }),
      supabase
        .from("parametres_messages")
        .select("cle, valeur"),
    ]);

    if (inscRes.data) setInscriptions(inscRes.data as unknown as Inscription[]);
    if (tplRes.data) {
      const map: Record<string, string> = {};
      (tplRes.data as Template[]).forEach(t => { map[t.cle] = t.valeur; });
      setTemplates(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    if (filter === "tous") return inscriptions;
    return inscriptions.filter(i => i.statut === filter);
  }, [inscriptions, filter]);

  const counts = useMemo(() => ({
    en_attente: inscriptions.filter(i => i.statut === "en_attente").length,
    confirme:   inscriptions.filter(i => i.statut === "confirme").length,
    annule:     inscriptions.filter(i => i.statut === "annule").length,
    tous:       inscriptions.length,
  }), [inscriptions]);

  const handleValidate = async (insc: Inscription) => {
    setActingOn(insc.id);
    const { error } = await supabase
      .from("inscriptions")
      .update({ statut: "confirme" })
      .eq("id", insc.id);

    if (error) {
      toast.error("Erreur lors de la validation");
    } else {
      toast.success(`Pré-inscription de ${insc.prenom_invite} validée`);
      setInscriptions(prev => prev.map(i => i.id === insc.id ? { ...i, statut: "confirme" as const } : i));
    }
    setActingOn(null);
  };

  const handleRefuse = async (insc: Inscription) => {
    if (!confirm(`Refuser la pré-inscription de ${insc.prenom_invite} ${insc.nom_invite} ?`)) return;
    setActingOn(insc.id);
    const { error } = await supabase
      .from("inscriptions")
      .update({ statut: "annule", annule_le: new Date().toISOString() })
      .eq("id", insc.id);

    if (error) {
      toast.error("Erreur lors du refus");
    } else {
      toast.success(`Pré-inscription refusée`);
      setInscriptions(prev => prev.map(i => i.id === insc.id ? { ...i, statut: "annule" as const } : i));
    }
    setActingOn(null);
  };

  const openMail = (insc: Inscription) => {
    if (!insc.email_invite) {
      toast.error("Pas d'email renseigné");
      return;
    }
    const isValidated = insc.statut === "confirme";
    const sujetKey = isValidated ? "validation_mail_sujet" : "refus_mail_sujet";
    const corpsKey = isValidated ? "validation_mail_corps" : "refus_mail_corps";
    const sujet = fillTemplate(templates[sujetKey] ?? "", insc);
    const corps = fillTemplate(templates[corpsKey] ?? "", insc);

    const url = `mailto:${encodeURIComponent(insc.email_invite)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
    window.location.href = url;
  };

  const openWhatsApp = (insc: Inscription) => {
    if (!insc.telephone_invite) {
      toast.error("Pas de téléphone renseigné");
      return;
    }
    const isValidated = insc.statut === "confirme";
    const tplKey = isValidated ? "validation_whatsapp" : "refus_whatsapp";
    const message = fillTemplate(templates[tplKey] ?? "", insc);

    const phone = normalizePhoneForWhatsApp(insc.telephone_invite);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
        <h1 className="text-2xl font-bold text-foreground">Pré-inscriptions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Validez ou refusez les demandes d'inscription aux ateliers.
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["en_attente", "confirme", "annule", "tous"] as FilterStatut[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card border text-foreground hover:bg-muted"
            }`}
          >
            {f === "tous" ? "Toutes" : statutLabel[f]}
            <span className="ml-2 text-xs opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border p-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">Aucune pré-inscription {filter !== "tous" ? `avec le statut "${statutLabel[filter]}"` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(insc => (
            <div key={insc.id} className="bg-card rounded-2xl border p-5">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {insc.prenom_invite} {insc.nom_invite}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutBadge[insc.statut]}`}>
                      {statutLabel[insc.statut]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Reçu le {formatDateTime(insc.inscrit_le)}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    {insc.email_invite && (
                      <div className="flex items-center gap-2 text-muted-foreground truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{insc.email_invite}</span>
                      </div>
                    )}
                    {insc.telephone_invite && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{insc.telephone_invite}</span>
                      </div>
                    )}
                    {insc.ateliers && (
                      <>
                        <div className="flex items-center gap-2 text-foreground font-medium mt-1 sm:col-span-2">
                          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{insc.ateliers.titre}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{formatDate(insc.ateliers.date_atelier)} — {formatHeure(insc.ateliers.heure_debut)}</span>
                        </div>
                        {insc.ateliers.lieu && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{insc.ateliers.lieu}</span>
                          </div>
                        )}
                      </>
                    )}
                    {insc.date_naissance && (
                      <div className="text-xs text-muted-foreground sm:col-span-2 mt-1">
                        Date de naissance : {formatDate(insc.date_naissance)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 lg:flex-col lg:w-48 shrink-0">
                  {insc.statut === "en_attente" && (
                    <>
                      <button
                        onClick={() => handleValidate(insc)}
                        disabled={actingOn === insc.id}
                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex-1 lg:flex-none"
                      >
                        {actingOn === insc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Valider
                      </button>
                      <button
                        onClick={() => handleRefuse(insc)}
                        disabled={actingOn === insc.id}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex-1 lg:flex-none"
                      >
                        <X className="w-4 h-4" />
                        Refuser
                      </button>
                    </>
                  )}
                  {(insc.statut === "confirme" || insc.statut === "annule") && (
                    <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                      insc.statut === "confirme" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    } lg:flex-none`}>
                      {insc.statut === "confirme" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {statutLabel[insc.statut]}
                    </div>
                  )}

                  <div className="flex gap-2 lg:flex-col w-full">
                    <button
                      onClick={() => openMail(insc)}
                      disabled={!insc.email_invite || insc.statut === "en_attente"}
                      className="flex items-center justify-center gap-2 border border-foreground/20 text-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-1 lg:flex-none"
                      title={insc.statut === "en_attente" ? "Validez ou refusez d'abord" : !insc.email_invite ? "Pas d'email" : "Envoyer un mail"}
                    >
                      <Mail className="w-4 h-4" />
                      Mail
                    </button>
                    <button
                      onClick={() => openWhatsApp(insc)}
                      disabled={!insc.telephone_invite || insc.statut === "en_attente"}
                      className="flex items-center justify-center gap-2 border border-foreground/20 text-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-1 lg:flex-none"
                      title={insc.statut === "en_attente" ? "Validez ou refusez d'abord" : !insc.telephone_invite ? "Pas de téléphone" : "Envoyer WhatsApp"}
                    >
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default PreInscriptions;
