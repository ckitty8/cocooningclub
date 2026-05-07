import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { withTimeout } from "@/utils/withTimeout";
import { toast } from "sonner";
import {
  Check, X, Mail, MessageSquare, Clock, Calendar, MapPin, Phone, User,
  CheckCircle2, XCircle, Loader2, UserPlus, Pencil, CreditCard
} from "lucide-react";

interface Inscription {
  id: string;
  atelier_id: string;
  utilisateur_id: string | null;
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
  utilisateurs?: {
    prenom: string | null;
    nom: string | null;
    email: string | null;
    telephone: string | null;
    role: "administrateur" | "inscrit" | "membre" | "membre_premium" | null;
  } | null;
}

// Récupère prénom / nom / email / téléphone effectifs d'une inscription :
// pour une inscription faite depuis l'espace membre, les champs invite sont
// vides ; on retombe alors sur la fiche utilisateurs liée via utilisateur_id.
const inscIdentite = (insc: Inscription) => ({
  prenom: insc.prenom_invite ?? insc.utilisateurs?.prenom ?? "",
  nom: insc.nom_invite ?? insc.utilisateurs?.nom ?? "",
  email: insc.email_invite ?? insc.utilisateurs?.email ?? null,
  telephone: insc.telephone_invite ?? insc.utilisateurs?.telephone ?? null,
});

interface Template {
  cle: string;
  valeur: string;
}

interface AtelierMinimal {
  id: string;
  titre: string;
  date_atelier: string;
  heure_debut: string | null;
  statut: string;
  tarif_standard: number | null;
}

type FilterStatut = "en_attente" | "confirme" | "annule" | "tous";

const PIERRE_ORACLE_TITRE = "Atelier Créatif — Pierre & Oracle";

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
  const id = inscIdentite(insc);
  return tpl
    .replaceAll("{prenom}", id.prenom)
    .replaceAll("{nom}", id.nom)
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
  const [ateliersDispo, setAteliersDispo] = useState<AtelierMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatut>("en_attente");
  const [actingOn, setActingOn] = useState<string | null>(null);

  // Modal ajout / édition
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingInscription, setEditingInscription] = useState<Inscription | null>(null);
  const [newForm, setNewForm] = useState({
    atelier_id: "",
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    date_naissance: "",
    statut: "confirme" as "confirme" | "en_attente" | "annule",
    statut_paiement: "non_requis" as "non_requis" | "en_attente" | "paye",
  });
  const [newSaving, setNewSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [inscRes, tplRes, atelRes] = await withTimeout(Promise.all([
        supabase
          .from("inscriptions")
          .select("*, ateliers(id, titre, date_atelier, heure_debut, lieu), utilisateurs(prenom, nom, email, telephone, role)")
          .order("inscrit_le", { ascending: false }),
        supabase
          .from("parametres_messages")
          .select("cle, valeur"),
        // Liste des ateliers proposables : tous sauf annulés / terminés.
        // On utilise .in() avec les statuts à inclure (plus lisible et
        // moins risqué côté typage que .not("statut", "in", ...)).
        supabase
          .from("ateliers")
          .select("id, titre, date_atelier, heure_debut, statut, tarif_standard")
          .in("statut", ["brouillon", "publie", "complet"])
          .gte("date_atelier", today)
          .order("date_atelier"),
      ]));

      if (inscRes.data) {
        const insc = inscRes.data as unknown as Inscription[];

        // Pour les inscriptions invité (utilisateur_id null) dont l'email
        // correspond pourtant à un compte existant, on rapatrie la fiche
        // utilisateurs côté client pour afficher le bon badge (Admin /
        // Premium / Membre) et le bon nom dans inscIdentite().
        const guestEmails = Array.from(new Set(
          insc
            .filter(i => !i.utilisateur_id && i.email_invite)
            .map(i => (i.email_invite as string).toLowerCase())
        ));
        if (guestEmails.length) {
          const { data: matched } = await supabase
            .from("utilisateurs")
            .select("prenom, nom, email, telephone, role")
            .in("email", guestEmails);
          const byEmail = new Map<string, NonNullable<Inscription["utilisateurs"]>>(
            (matched ?? []).map(u => [String(u.email).toLowerCase(), u as NonNullable<Inscription["utilisateurs"]>])
          );
          for (const i of insc) {
            if (!i.utilisateur_id && i.email_invite && !i.utilisateurs) {
              const u = byEmail.get(i.email_invite.toLowerCase());
              if (u) i.utilisateurs = u;
            }
          }
        }

        setInscriptions(insc);
      }
      if (tplRes.data) {
        const map: Record<string, string> = {};
        (tplRes.data as Template[]).forEach(t => { map[t.cle] = t.valeur; });
        setTemplates(map);
      }
      if (atelRes.data) setAteliersDispo(atelRes.data as AtelierMinimal[]);
    } catch (err) {
      console.error("[PreInscriptions.fetchAll] error:", err);
    } finally {
      setLoading(false);
    }
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

  const handleChangeStatut = async (insc: Inscription, next: Inscription["statut"]) => {
    if (insc.statut === next) return;
    const id = inscIdentite(insc);
    if (next === "annule" && !confirm(`Refuser la pré-inscription de ${id.prenom} ${id.nom} ?`)) return;

    setActingOn(insc.id);
    const payload: Record<string, unknown> = { statut: next };
    payload.annule_le = next === "annule" ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("inscriptions")
      .update(payload)
      .eq("id", insc.id);

    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      const action = next === "confirme" ? "validate" : next === "annule" ? "refuse" : "reset";
      toast.success(
        next === "confirme" ? `Pré-inscription de ${id.prenom} validée`
        : next === "annule"  ? "Pré-inscription refusée"
                             : "Pré-inscription remise en attente"
      );
      setInscriptions(prev => prev.map(i => i.id === insc.id ? { ...i, statut: next } : i));
      logAction(`inscription.${action}`, "inscriptions", insc.id, {
        prenom: id.prenom, nom: id.nom,
        atelier: insc.ateliers?.titre, email: id.email,
        statut_avant: insc.statut, statut_apres: next,
      });
    }
    setActingOn(null);
  };


  const openMail = (insc: Inscription) => {
    const email = inscIdentite(insc).email;
    if (!email) {
      toast.error("Pas d'email renseigné");
      return;
    }
    const isValidated = insc.statut === "confirme";
    const sujetKey = isValidated ? "validation_mail_sujet" : "refus_mail_sujet";
    const corpsKey = isValidated ? "validation_mail_corps" : "refus_mail_corps";
    const sujet = fillTemplate(templates[sujetKey] ?? "", insc);
    const corps = fillTemplate(templates[corpsKey] ?? "", insc);

    const url = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}`;
    window.location.href = url;
  };

  const openAddModal = () => {
    setEditingInscription(null);
    setNewForm({
      atelier_id: ateliersDispo[0]?.id ?? "",
      prenom: "", nom: "", email: "", telephone: "", date_naissance: "",
      statut: "confirme",
      statut_paiement: "non_requis",
    });
    setAddModalOpen(true);
  };

  const openEditModal = (insc: Inscription) => {
    const id = inscIdentite(insc);
    setEditingInscription(insc);
    setNewForm({
      atelier_id: insc.atelier_id,
      prenom: id.prenom,
      nom: id.nom,
      email: id.email ?? "",
      telephone: id.telephone ?? "",
      date_naissance: insc.date_naissance ?? "",
      statut: insc.statut,
      statut_paiement: insc.statut_paiement ?? "non_requis",
    });
    setAddModalOpen(true);
  };

  const handleSaveInscription = async () => {
    if (!newForm.atelier_id) { toast.error("Choisis un atelier"); return; }
    if (!newForm.prenom.trim() || !newForm.nom.trim()) {
      toast.error("Prénom et nom sont obligatoires"); return;
    }
    if (!newForm.email.trim()) { toast.error("Email obligatoire"); return; }

    const atelier = ateliersDispo.find(a => a.id === newForm.atelier_id)
                 ?? (editingInscription?.ateliers ? {
                      id: editingInscription.ateliers.id,
                      titre: editingInscription.ateliers.titre,
                      tarif_standard: null,
                    } as AtelierMinimal : undefined);
    if (atelier?.titre === PIERRE_ORACLE_TITRE && !newForm.date_naissance) {
      toast.error("Date de naissance requise pour cet atelier");
      return;
    }

    setNewSaving(true);

    if (editingInscription) {
      // Si l'inscription n'est pas encore liée à un compte mais que
      // l'email match désormais un utilisateur, on relie. Inversement,
      // si l'admin a changé l'email pour un autre qui ne match plus,
      // on conserve la liaison existante (pas de débranchement
      // automatique pour ne pas casser un historique volontairement).
      let utilisateurId = editingInscription.utilisateur_id;
      if (!utilisateurId) {
        const { data: matchedUser } = await supabase
          .from("utilisateurs")
          .select("id")
          .ilike("email", newForm.email.trim())
          .maybeSingle();
        if (matchedUser?.id) utilisateurId = matchedUser.id;
      }

      // UPDATE : on conserve la liaison utilisateur_id si elle existe
      // (édition d'une inscription membre). Les champs invite sont
      // mis à jour quoi qu'il arrive — ils prennent le pas sur
      // utilisateurs.* dans l'affichage côté admin.
      const payload: Record<string, unknown> = {
        atelier_id: newForm.atelier_id,
        utilisateur_id: utilisateurId,
        prenom_invite: newForm.prenom.trim(),
        nom_invite: newForm.nom.trim(),
        email_invite: newForm.email.trim(),
        telephone_invite: newForm.telephone.trim() || null,
        date_naissance: newForm.date_naissance || null,
        statut: newForm.statut,
        statut_paiement: newForm.statut_paiement,
      };
      if (newForm.statut === "annule" && editingInscription.statut !== "annule") {
        payload.annule_le = new Date().toISOString();
      } else if (newForm.statut !== "annule") {
        payload.annule_le = null;
      }

      const { error } = await supabase
        .from("inscriptions")
        .update(payload)
        .eq("id", editingInscription.id);

      if (error) {
        toast.error(`Erreur : ${error.message}`, { duration: 8000 });
      } else {
        toast.success(`Inscription de ${newForm.prenom} mise à jour`);
        logAction("inscription.update", "inscriptions", editingInscription.id, {
          prenom: newForm.prenom.trim(), nom: newForm.nom.trim(),
          atelier: atelier?.titre,
          statut_avant: editingInscription.statut, statut_apres: newForm.statut,
          paiement_avant: editingInscription.statut_paiement, paiement_apres: newForm.statut_paiement,
        });
        setAddModalOpen(false);
        setEditingInscription(null);
        fetchAll();
      }
    } else {
      // INSERT : statut_paiement initial dérivé du tarif si non explicitement
      // forcé via la liste déroulante.
      const isPaid = (atelier?.tarif_standard ?? 0) > 0;
      const statutPaiement = newForm.statut_paiement !== "non_requis"
        ? newForm.statut_paiement
        : (isPaid ? "en_attente" : "non_requis");

      // Si l'email correspond à un compte existant, on lie l'inscription
      // au compte. L'admin a la policy utilisateurs_admin_tout, donc le
      // SELECT par email est autorisé (privilege admin uniquement).
      const { data: matchedUser } = await supabase
        .from("utilisateurs")
        .select("id")
        .ilike("email", newForm.email.trim())
        .maybeSingle();

      const { data: ins, error } = await supabase.from("inscriptions").insert({
        atelier_id: newForm.atelier_id,
        utilisateur_id: matchedUser?.id ?? null,
        prenom_invite: newForm.prenom.trim(),
        nom_invite: newForm.nom.trim(),
        email_invite: newForm.email.trim(),
        telephone_invite: newForm.telephone.trim() || null,
        date_naissance: newForm.date_naissance || null,
        statut: newForm.statut,
        statut_paiement: statutPaiement,
      }).select("id").single();

      if (error) {
        console.error("[handleSaveInscription]", error);
        toast.error(`Erreur : ${error.message}`, { duration: 8000 });
      } else {
        toast.success(`Inscription de ${newForm.prenom} ajoutée`);
        logAction("inscription.create_manual", "inscriptions", ins?.id ?? null, {
          prenom: newForm.prenom.trim(), nom: newForm.nom.trim(),
          email: newForm.email.trim(),
          atelier_id: newForm.atelier_id,
          atelier: atelier?.titre,
          statut: newForm.statut,
        });
        setAddModalOpen(false);
        fetchAll();
      }
    }

    setNewSaving(false);
  };

  const openWhatsApp = (insc: Inscription) => {
    const tel = inscIdentite(insc).telephone;
    if (!tel) {
      toast.error("Pas de téléphone renseigné");
      return;
    }
    const isValidated = insc.statut === "confirme";
    const tplKey = isValidated ? "validation_whatsapp" : "refus_whatsapp";
    const message = fillTemplate(templates[tplKey] ?? "", insc);

    const phone = normalizePhoneForWhatsApp(tel);
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
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pré-inscriptions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Validez ou refusez les demandes d'inscription aux ateliers.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <UserPlus className="w-4 h-4" />
          Nouvelle inscription
        </button>
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
          {filtered.map(insc => {
            const identite = inscIdentite(insc);
            const fullName = `${identite.prenom} ${identite.nom}`.trim();
            return (
            <div key={insc.id} className="bg-card rounded-2xl border p-5">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {fullName || <span className="text-muted-foreground italic">Sans nom</span>}
                    </h3>
                    {(() => {
                      const role = insc.utilisateurs?.role;
                      if (!role) return null;
                      const map: Record<string, { label: string; cls: string }> = {
                        administrateur: { label: "Admin",   cls: "bg-purple-100 text-purple-700" },
                        membre_premium: { label: "Premium", cls: "bg-amber-100 text-amber-700" },
                        membre:         { label: "Membre",  cls: "bg-primary/10 text-primary" },
                        inscrit:        { label: "Inscrit", cls: "bg-gray-100 text-gray-600" },
                      };
                      const r = map[role];
                      return r ? (
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${r.cls}`}>
                          {r.label}
                        </span>
                      ) : null;
                    })()}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutBadge[insc.statut]}`}>
                      {statutLabel[insc.statut]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Reçu le {formatDateTime(insc.inscrit_le)}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    {identite.email && (
                      <div className="flex items-center gap-2 text-muted-foreground truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{identite.email}</span>
                      </div>
                    )}
                    {identite.telephone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{identite.telephone}</span>
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
                  <div className="flex gap-1.5 lg:flex-col w-full">
                    <button
                      onClick={() => handleChangeStatut(insc, "confirme")}
                      disabled={actingOn === insc.id || insc.statut === "confirme"}
                      title="Valider la pré-inscription"
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed flex-1 lg:flex-none ${
                        insc.statut === "confirme"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                      }`}
                    >
                      {actingOn === insc.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                        insc.statut === "confirme" ? <CheckCircle2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      {insc.statut === "confirme" ? "Validé" : "Valider"}
                    </button>
                    <button
                      onClick={() => handleChangeStatut(insc, "annule")}
                      disabled={actingOn === insc.id || insc.statut === "annule"}
                      title="Refuser la pré-inscription"
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed flex-1 lg:flex-none ${
                        insc.statut === "annule"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                      }`}
                    >
                      {insc.statut === "annule" ? <XCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      {insc.statut === "annule" ? "Refusé" : "Refuser"}
                    </button>
                  </div>
                  {insc.statut !== "en_attente" && (
                    <button
                      onClick={() => handleChangeStatut(insc, "en_attente")}
                      disabled={actingOn === insc.id}
                      className="flex items-center justify-center gap-2 border border-foreground/20 text-muted-foreground hover:bg-muted px-3 py-1.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                      title="Remettre en attente"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Remettre en attente
                    </button>
                  )}

                  <button
                    onClick={() => openEditModal(insc)}
                    className="flex items-center justify-center gap-2 border border-foreground/20 text-foreground px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-muted transition-colors"
                    title="Modifier l'inscription"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Modifier
                  </button>

                  <div className="flex gap-2 lg:flex-col w-full">
                    <button
                      onClick={() => openMail(insc)}
                      disabled={!identite.email || insc.statut === "en_attente"}
                      className="flex items-center justify-center gap-2 border border-foreground/20 text-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-1 lg:flex-none"
                      title={insc.statut === "en_attente" ? "Validez ou refusez d'abord" : !identite.email ? "Pas d'email" : "Envoyer un mail"}
                    >
                      <Mail className="w-4 h-4" />
                      Mail
                    </button>
                    <button
                      onClick={() => openWhatsApp(insc)}
                      disabled={!identite.telephone || insc.statut === "en_attente"}
                      className="flex items-center justify-center gap-2 border border-foreground/20 text-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-1 lg:flex-none"
                      title={insc.statut === "en_attente" ? "Validez ou refusez d'abord" : !identite.telephone ? "Pas de téléphone" : "Envoyer WhatsApp"}
                    >
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Modal nouvelle inscription */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={() => { setAddModalOpen(false); setEditingInscription(null); }}
        >
          <div
            className="bg-background border rounded-2xl shadow-2xl w-full max-w-lg p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { setAddModalOpen(false); setEditingInscription(null); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
              {editingInscription ? <Pencil className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
              {editingInscription ? "Modifier l'inscription" : "Nouvelle inscription"}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {editingInscription
                ? "Mets à jour les informations de cette inscription."
                : "Ajoute manuellement une personne à un atelier (par ex. inscription reçue par téléphone)."}
            </p>
            {editingInscription?.utilisateur_id && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4 text-xs text-amber-800">
                Inscription liée à un compte membre. Les modifications ici ne touchent pas la fiche du membre (à modifier dans <span className="font-medium">Membres</span>).
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Atelier *</label>
                <select
                  value={newForm.atelier_id}
                  onChange={e => setNewForm({ ...newForm, atelier_id: e.target.value })}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Choisir un atelier —</option>
                  {/* En édition, l'atelier d'origine peut être passé/annulé et donc absent de ateliersDispo : on l'ajoute en première ligne. */}
                  {editingInscription?.ateliers && !ateliersDispo.some(a => a.id === editingInscription.atelier_id) && (
                    <option value={editingInscription.atelier_id}>
                      {editingInscription.ateliers.titre} — {formatDate(editingInscription.ateliers.date_atelier)} (atelier passé)
                    </option>
                  )}
                  {ateliersDispo.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.titre} — {formatDate(a.date_atelier)}
                    </option>
                  ))}
                </select>
                {ateliersDispo.length === 0 && !editingInscription && (
                  <p className="text-xs text-amber-600 mt-1">
                    Aucun atelier publié à venir. Crée d'abord un atelier dans "Ateliers".
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Prénom *</label>
                  <input
                    type="text"
                    value={newForm.prenom}
                    onChange={e => setNewForm({ ...newForm, prenom: e.target.value })}
                    placeholder="Marie"
                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nom *</label>
                  <input
                    type="text"
                    value={newForm.nom}
                    onChange={e => setNewForm({ ...newForm, nom: e.target.value })}
                    placeholder="Dupont"
                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Email *</label>
                <input
                  type="email"
                  value={newForm.email}
                  onChange={e => setNewForm({ ...newForm, email: e.target.value })}
                  placeholder="marie@email.com"
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Téléphone <span className="text-muted-foreground font-normal">(optionnel — pour WhatsApp)</span>
                </label>
                <input
                  type="tel"
                  value={newForm.telephone}
                  onChange={e => setNewForm({ ...newForm, telephone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Date de naissance si atelier = Pierre & Oracle */}
              {(() => {
                const atelier = ateliersDispo.find(a => a.id === newForm.atelier_id);
                if (atelier?.titre === PIERRE_ORACLE_TITRE) {
                  return (
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Date de naissance *</label>
                      <input
                        type="date"
                        value={newForm.date_naissance}
                        onChange={e => setNewForm({ ...newForm, date_naissance: e.target.value })}
                        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Requis pour cet atelier.</p>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block text-sm font-medium mb-1.5">Statut</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setNewForm({ ...newForm, statut: "confirme" })}
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      newForm.statut === "confirme"
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    ✓ Validé
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewForm({ ...newForm, statut: "en_attente" })}
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      newForm.statut === "en_attente"
                        ? "bg-amber-50 border-amber-500 text-amber-700"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    ⏳ En attente
                  </button>
                  {editingInscription && (
                    <button
                      type="button"
                      onClick={() => setNewForm({ ...newForm, statut: "annule" })}
                      className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        newForm.statut === "annule"
                          ? "bg-red-50 border-red-500 text-red-700"
                          : "bg-background border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      ✗ Refusé
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Paiement
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setNewForm({ ...newForm, statut_paiement: "non_requis" })}
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      newForm.statut_paiement === "non_requis"
                        ? "bg-muted border-foreground/30 text-foreground"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Gratuit
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewForm({ ...newForm, statut_paiement: "en_attente" })}
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      newForm.statut_paiement === "en_attente"
                        ? "bg-amber-50 border-amber-500 text-amber-700"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Non payé
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewForm({ ...newForm, statut_paiement: "paye" })}
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      newForm.statut_paiement === "paye"
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Payé
                  </button>
                </div>
                {!editingInscription && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Pour un nouvel ajout, "Gratuit" se transforme automatiquement en "Non payé" si l'atelier a un tarif.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setAddModalOpen(false); setEditingInscription(null); }}
                className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveInscription}
                disabled={newSaving || !newForm.atelier_id || !newForm.prenom.trim() || !newForm.nom.trim() || !newForm.email.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {newSaving ? <Loader2 className="w-4 h-4 animate-spin" />
                  : editingInscription ? <Pencil className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {editingInscription ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default PreInscriptions;
