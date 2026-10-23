import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import ListeParAtelier from "@/components/admin/preinscriptions/ListeParAtelier";
import FenetreInscription from "@/components/admin/preinscriptions/FenetreInscription";
import type { AtelierListe, InfoDroit, Inscription, StatutInscription, StatutPaiement } from "@/components/admin/preinscriptions/types";
import { useAutorisationsImage } from "@/hooks/useAutorisationsImage";
import { useEspaces, useOffresParPersonne } from "@/hooks/useOffres";
import { droitAtelier, euros } from "@/lib/droits";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { logAction } from "@/utils/logAction";
import { inscIdentite } from "@/lib/inscriptionIdentite";
import { grouperParAtelier, periodeDe, type FiltreStatut, type Periode } from "@/lib/preInscriptions";
import { aujourdhuiIso } from "@/lib/adhesions";
import { withTimeout } from "@/utils/withTimeout";
import { toast } from "sonner";
import { Loader2, Pencil, Search, UserPlus, X, CreditCard } from "lucide-react";

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

const PIERRE_ORACLE_TITRE = "Atelier Créatif — Pierre & Oracle";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};

const STATUT_LABELS: Record<StatutInscription, string> = {
  en_attente: "En attente",
  confirme:   "Validées",
  annule:     "Refusées",
};

const PreInscriptions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Arrivée depuis « Inscrits » (écran Ateliers) : ?atelier=<id>.
  const cible = searchParams.get("atelier");

  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  // Consentement photo de chaque personne connectée : lu par relation (dernier bulletin d'adhésion).
  const autorisations = useAutorisationsImage(inscriptions.map(i => i.utilisateur_id));
  // Offre de chaque personne et droit de l'atelier (gratuit / inclus / à payer) : visibles après la migration des offres.
  const espaces = useEspaces();
  const { parPersonne: offres, disponible: offresDisponibles } = useOffresParPersonne(null);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [ateliersDispo, setAteliersDispo] = useState<AtelierMinimal[]>([]);
  const [ateliersListe, setAteliersListe] = useState<AtelierListe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FiltreStatut>(cible ? "tous" : "en_attente");
  const [periode, setPeriode] = useState<Periode>("avenir");
  const [recherche, setRecherche] = useState("");
  const [ouvertsManuels, setOuvertsManuels] = useState<Record<string, boolean>>({});
  const [fenetreId, setFenetreId] = useState<string | null>(null);
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
      const [inscRes, tplRes, atelRes, listeRes] = await withTimeout(Promise.all([
        supabase
          .from("inscriptions")
          .select("*, ateliers(id, titre, date_atelier, heure_debut, lieu, adresse), utilisateurs(prenom, nom, email, telephone, date_naissance, role)")
          .order("inscrit_le", { ascending: false }),
        supabase
          .from("parametres_messages")
          .select("cle, valeur"),
        // Liste des ateliers proposables : tous sauf annulés / terminés.
        supabase
          .from("ateliers")
          .select("id, titre, date_atelier, heure_debut, statut, tarif_standard")
          .in("statut", ["brouillon", "publie", "complet"])
          .gte("date_atelier", today)
          .order("date_atelier"),
        // Tous les ateliers : un bloc par atelier dans l'accordéon.
        supabase
          .from("ateliers")
          .select("id, titre, date_atelier, heure_debut, lieu, statut, tarif_standard, places_max, places_disponibles, antenne_id")
          .order("date_atelier"),
      ]));

      if (inscRes.data) {
        const insc = inscRes.data as unknown as Inscription[];

        // Pour les inscriptions invité (utilisateur_id null) dont l'email
        // correspond pourtant à un compte existant, on rapatrie la fiche
        // utilisateurs côté client pour afficher le bon badge (Admin /
        // Membre) et le bon nom dans inscIdentite().
        const guestEmails = Array.from(new Set(
          insc
            .filter(i => !i.utilisateur_id && i.email_invite)
            .map(i => (i.email_invite as string).toLowerCase())
        ));
        if (guestEmails.length) {
          const { data: matched } = await supabase
            .from("utilisateurs")
            .select("prenom, nom, email, telephone, date_naissance, role")
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
      if (listeRes.data) setAteliersListe(listeRes.data as AtelierListe[]);
    } catch (err) {
      console.error("[PreInscriptions.fetchAll] error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const aujourdhui = aujourdhuiIso();

  // Arrivée sur un atelier passé : on affiche directement l'onglet « Passés ».
  const atelierCible = ateliersListe.find(a => a.id === cible);
  useEffect(() => {
    if (atelierCible) setPeriode(periodeDe(atelierCible.date_atelier, aujourdhui));
  }, [atelierCible?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupes = useMemo(
    () => grouperParAtelier(inscriptions, ateliersListe, {
      filtre: filter, periode, aujourdhui, recherche, cible,
      texte: i => {
        const id = inscIdentite(i);
        return `${id.prenom} ${id.nom} ${id.email ?? ""} ${i.ateliers?.titre ?? ""}`;
      },
    }),
    [inscriptions, ateliersListe, filter, periode, aujourdhui, recherche, cible],
  );

  // Ouvert par défaut : l'atelier visé, sinon ceux qui ont des demandes à traiter.
  const ouverts = useMemo(
    () => Object.fromEntries(groupes.map(g => [g.atelier.id, ouvertsManuels[g.atelier.id] ?? (cible ? g.atelier.id === cible : g.aTraiter > 0)])),
    [groupes, ouvertsManuels, cible],
  );

  const counts = useMemo(() => ({
    en_attente: inscriptions.filter(i => i.statut === "en_attente").length,
    confirme:   inscriptions.filter(i => i.statut === "confirme").length,
    annule:     inscriptions.filter(i => i.statut === "annule").length,
    tous:       inscriptions.length,
  }), [inscriptions]);

  const droits = useMemo(() => {
    if (!offresDisponibles || espaces.length === 0) return undefined;
    const carte = new Map<string, InfoDroit>();
    for (const i of inscriptions) {
      const atelier = ateliersListe.find(a => a.id === i.atelier_id);
      if (!atelier) continue;
      const offresPersonne = i.utilisateur_id ? offres.get(i.utilisateur_id) ?? [] : [];
      carte.set(i.id, { droit: droitAtelier(atelier, espaces, offresPersonne), offres: offresPersonne });
    }
    return carte;
  }, [inscriptions, ateliersListe, espaces, offres, offresDisponibles]);

  const lignesVisibles = useMemo(() => groupes.flatMap(g => g.items), [groupes]);
  const fenetre = inscriptions.find(i => i.id === fenetreId) ?? null;

  const handleChangeStatut = async (insc: Inscription, next: Inscription["statut"]): Promise<boolean> => {
    if (insc.statut === next) return false;
    const id = inscIdentite(insc);
    if (next === "annule" && !confirm(`Refuser la pré-inscription de ${id.prenom} ${id.nom} ?`)) return false;
    // Atelier à payer et règlement non enregistré : simple avertissement, la décision reste à l'équipe.
    const info = droits?.get(insc.id);
    if (next === "confirme" && info?.droit.etat === "a_payer" && insc.statut_paiement !== "paye"
      && !confirm(`${info.droit.montant > 0 ? euros(info.droit.montant) : "Le tarif"} non réglé pour ${id.prenom} ${id.nom}. Valider quand même ?`)) return false;

    setActingOn(insc.id);
    const payload: TablesUpdate<"inscriptions"> = { statut: next };
    payload.annule_le = next === "annule" ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("inscriptions")
      .update(payload)
      .eq("id", insc.id);

    setActingOn(null);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
      return false;
    }
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
    return true;
  };

  const handlePaiement = async (insc: Inscription, paiement: StatutPaiement) => {
    if (insc.statut_paiement === paiement) return;
    const { error } = await supabase.from("inscriptions").update({ statut_paiement: paiement }).eq("id", insc.id);
    if (error) { toast.error(`Erreur : ${error.message}`); return; }
    setInscriptions(prev => prev.map(i => i.id === insc.id ? { ...i, statut_paiement: paiement } : i));
    logAction("inscription.paiement", "inscriptions", insc.id, { paiement_avant: insc.statut_paiement, paiement_apres: paiement });
    toast.success("Paiement mis à jour");
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
      const payload: TablesUpdate<"inscriptions"> = {
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
            Les demandes, regroupées par atelier : validez, refusez et contactez.
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

      {cible && atelierCible && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary bg-primary/5 px-4 py-3 text-sm">
          <span className="flex-1">
            Vous arrivez depuis <b>Ateliers › Inscrits</b> : l'atelier <b>{atelierCible.titre}</b> est ouvert.
          </span>
          <button
            onClick={() => { setSearchParams({}); setOuvertsManuels({}); }}
            className="shrink-0 rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Tout afficher
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div role="group" aria-label="Filtrer par statut" className="inline-flex flex-wrap rounded-full border bg-card p-0.5">
          {(["en_attente", "confirme", "annule", "tous"] as FiltreStatut[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {f === "tous" ? "Toutes" : STATUT_LABELS[f]} <span className="opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            aria-label="Rechercher une personne ou un atelier"
            placeholder="Rechercher une personne, un atelier…"
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div role="group" aria-label="Période" className="inline-flex rounded-full border bg-card p-0.5">
          {([["avenir", "À venir"], ["passes", "Passés"]] as [Periode, string][]).map(([cle, libelle]) => (
            <button
              key={cle}
              onClick={() => setPeriode(cle)}
              aria-pressed={periode === cle}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${periode === cle ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {libelle}
            </button>
          ))}
        </div>
      </div>

      {groupes.length === 0 ? (
        <div className="bg-card rounded-2xl border p-12 text-center text-muted-foreground">
          Aucune pré-inscription {filter !== "tous" ? `« ${STATUT_LABELS[filter].toLowerCase()} »` : ""} {periode === "avenir" ? "pour les ateliers à venir" : "pour les ateliers passés"}.
        </div>
      ) : (
        <ListeParAtelier
          groupes={groupes}
          ouverts={ouverts}
          onBasculer={atelierId => setOuvertsManuels(prev => ({ ...prev, [atelierId]: !ouverts[atelierId] }))}
          autorisations={autorisations}
          droits={droits}
          actingOn={actingOn}
          onOuvrir={insc => setFenetreId(insc.id)}
          onStatut={handleChangeStatut}
        />
      )}

      {fenetre && (
        <FenetreInscription
          insc={fenetre}
          liste={lignesVisibles}
          atelier={ateliersListe.find(a => a.id === fenetre.atelier_id)}
          autorisation={fenetre.utilisateur_id ? autorisations.get(fenetre.utilisateur_id) : undefined}
          info={droits?.get(fenetre.id)}
          templates={templates}
          occupe={actingOn === fenetre.id}
          onClose={() => setFenetreId(null)}
          onNavigate={insc => setFenetreId(insc.id)}
          onStatut={handleChangeStatut}
          onPaiement={handlePaiement}
          onModifier={insc => openEditModal(insc)}
        />
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
