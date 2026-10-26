import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { logAction } from "@/utils/logAction";
import { withTimeout } from "@/utils/withTimeout";
import { toast } from "sonner";
import BadgePhotos from "@/components/BadgePhotos";
import { useAutorisationsImage } from "@/hooks/useAutorisationsImage";
import { useOffresParPersonne } from "@/hooks/useOffres";
import { useNaissancesParPersonne } from "@/hooks/useNaissances";
import ChampDateNaissance from "@/components/ChampDateNaissance";
import { dateFr } from "@/lib/dates";
import OffresPersonne from "@/components/OffrePastille";
import { nomCourtOffre } from "@/lib/droits";
import { Plus, Search, Pencil, Trash2, UserX, UserCheck2, X, Eye, EyeOff } from "lucide-react";
import type { UserRole } from "@/contexts/auth";
import { creerCompte } from "@/lib/creerCompte";
import type { NouveauCompte } from "@/lib/nouveauCompte";

type RoleCreable = NouveauCompte["role"];

interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  url_avatar: string | null;
  debut_abonnement: string | null;
  fin_abonnement: string | null;
  role: UserRole;
  est_actif: boolean;
  cree_le: string;
}

const roleBadgeClass: Record<UserRole, string> = {
  administrateur: "bg-purple-100 text-purple-700",
  inscrit:        "bg-gray-100 text-gray-600",
  membre:         "bg-blue-100 text-blue-700",
};

const roleLabel: Record<UserRole, string> = {
  administrateur: "Admin",
  inscrit:        "Inscrit",
  membre:         "Membre",
};

const AIDE_ROLE_MEMBRE = "Le rôle Membre est attribué à la validation d'une adhésion (Offre & adhésions) : il n'existe pas de membre sans adhésion, hors administrateurs.";

const emptyEditForm = {
  nom: "", prenom: "", email: "", telephone: "", date_naissance: "",
  debut_abonnement: "", fin_abonnement: "",
  role: "inscrit" as UserRole,
  est_actif: false,
};

const emptyCreateForm = {
  nom: "", prenom: "", email: "", telephone: "",
  mot_de_passe: "", role: "inscrit" as RoleCreable,
  debut_abonnement: "", fin_abonnement: "",
  est_actif: false, // Inactif par défaut → pas de mail Supabase envoyé
};

const Membres = () => {
  const { profile: me } = useAuth();
  const [members, setMembers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("tous");
  const [filterActif, setFilterActif] = useState("tous");

  // Modal édition
  const [editModal, setEditModal] = useState<{ open: boolean; member: Utilisateur | null }>({ open: false, member: null });
  const [editForm, setEditForm] = useState(emptyEditForm);

  // Modal création
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [showPassword, setShowPassword] = useState(false);
  const [createError, setCreateError] = useState("");

  const [saving, setSaving] = useState(false);

    // Consentement photo : lu par relation (dernier bulletin d'adhésion de chaque personne).
  const autorisations = useAutorisationsImage(null);
  // Offre en cours de chaque personne (adhésion → formule). Absente tant que la migration n'est pas appliquée.
  const { parPersonne: offres, disponible: offresDisponibles } = useOffresParPersonne(null);
  const [filtreOffre, setFiltreOffre] = useState<string>("toutes");
  // Date de naissance : portée par l'adhésion (saisie avec le bulletin).
  const { parPersonne: naissances, disponible: naissancesDisponibles, recharger: rechargerNaissances } = useNaissancesParPersonne();

  const fetchMembers = async () => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("utilisateurs")
          .select("*")
          .order("cree_le", { ascending: false })
      );
      if (error) throw error;
      setMembers((data as Utilisateur[]) ?? []);
    } catch (err) {
      console.error("[Membres.fetchMembers] error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || [m.nom, m.prenom, m.email].some(v => v?.toLowerCase().includes(q));
    const matchRole = filterRole === "tous" || m.role === filterRole;
    const matchActif = filterActif === "tous" || (filterActif === "actif" ? m.est_actif : !m.est_actif);
    const offresDe = offres.get(m.id) ?? [];
    const matchOffre = !offresDisponibles || filtreOffre === "toutes"
      || (filtreOffre === "aucune" ? offresDe.length === 0 : offresDe.some(o => nomCourtOffre(o.nom) === filtreOffre));
    return matchSearch && matchRole && matchActif && matchOffre;
  });
  const nomsOffres = Array.from(new Set(Array.from(offres.values()).flat().map(o => nomCourtOffre(o.nom)))).sort();
  const nbColonnes = 6 + (offresDisponibles ? 1 : 0) + (naissancesDisponibles ? 1 : 0);

  // ── Création ──────────────────────────────────────────────
  const handleCreate = async () => {
    setCreateError("");
    setSaving(true);
    const resultat = await creerCompte(createForm);
    if (resultat.erreur) {
      setCreateError(resultat.erreur);
      setSaving(false);
      return;
    }

    await fetchMembers();
    setCreateModal(false);
    setCreateForm(emptyCreateForm);
    setSaving(false);
  };

  // ── Édition ───────────────────────────────────────────────
  const openEdit = (m: Utilisateur) => {
    setEditForm({
      nom: m.nom, prenom: m.prenom, email: m.email,
      telephone: m.telephone ?? "",
      date_naissance: naissances.get(m.id)?.date ?? "",
      debut_abonnement: m.debut_abonnement ?? "",
      fin_abonnement: m.fin_abonnement ?? "", role: m.role,
      est_actif: m.est_actif,
    });
    setEditModal({ open: true, member: m });
  };

  const handleSave = async () => {
    setSaving(true);
    const isSelf = editModal.member?.id === me?.id;
    const before = editModal.member!;
    const activating = !isSelf && !before.est_actif && editForm.est_actif;

    // Si on passe de inactif → actif, envoyer un magic link (cf. toggleActif).
    if (activating) {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: editForm.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (otpError) {
        toast.error(`Erreur envoi du lien d'invitation : ${otpError.message}`, { duration: 8000 });
        setSaving(false);
        return;
      }
    }

    const payload: TablesUpdate<"utilisateurs"> = {
      nom: editForm.nom, prenom: editForm.prenom, email: editForm.email,
      telephone: editForm.telephone || null,
      debut_abonnement: editForm.debut_abonnement || null,
      fin_abonnement: editForm.fin_abonnement || null,
    };
    if (!isSelf) {
      payload.role = editForm.role;
      payload.est_actif = editForm.est_actif;
    }
    const { error } = await supabase.from("utilisateurs").update(payload).eq("id", before.id);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
      setSaving(false);
      return;
    }

    // Date de naissance : écrite sur l'adhésion la plus récente (pas de fiche sans adhésion pour la porter).
    const naissance = naissances.get(before.id);
    if (naissancesDisponibles && naissance && editForm.date_naissance !== (naissance.date ?? "")) {
      const { error: errNaissance } = await supabase.from("adhesions")
        .update({ date_naissance: editForm.date_naissance || null }).eq("id", naissance.adhesionId);
      if (errNaissance) toast.error("La fiche est enregistrée, mais pas la date de naissance.");
      else { logAction("membre.naissance", "adhesions", naissance.adhesionId, { utilisateur_id: before.id }); rechargerNaissances(); }
    }

    // Log spécifique si le rôle a changé (action sensible)
    if (!isSelf && before.role !== editForm.role) {
      logAction("membre.role_change", "utilisateurs", before.id, {
        email: before.email, prenom: before.prenom, nom: before.nom,
        role_avant: before.role, role_apres: editForm.role,
      });
    } else {
      logAction("membre.update", "utilisateurs", before.id, {
        email: before.email, prenom: before.prenom, nom: before.nom,
        est_actif_avant: before.est_actif, est_actif_apres: editForm.est_actif,
      });
    }

    if (activating) {
      toast.success(`Lien d'invitation envoyé à ${editForm.email}.`);
    }

    await fetchMembers();
    setEditModal({ open: false, member: null });
    setSaving(false);
  };

  const toggleActif = async (m: Utilisateur) => {
    if (m.id === me?.id) return;
    const activating = !m.est_actif;

    // Si on passe de inactif → actif, on envoie un magic link.
    // signInWithOtp avec shouldCreateUser:true :
    //   - crée le compte Supabase Auth s'il n'existe pas (cas membre créé "inactif")
    //   - envoie un email avec un lien de connexion
    // emailRedirectTo : on cible l'origine courante pour que le lien
    // pointe toujours vers le déploiement actif (sinon Supabase retombe
    // sur la Site URL configurée côté dashboard, qui peut être périmée).
    // Le trigger SQL on_auth_user_created_link_utilisateur rebranche
    // ensuite utilisateurs.id sur le nouvel auth.users.id par email.
    if (activating) {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: m.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (otpError) {
        toast.error(`Erreur envoi du lien d'invitation : ${otpError.message}`, { duration: 8000 });
        return;
      }
    }

    const { error } = await supabase
      .from("utilisateurs")
      .update({ est_actif: activating })
      .eq("id", m.id);

    if (error) {
      toast.error(`Erreur : ${error.message}`);
      return;
    }

    logAction(activating ? "membre.activate" : "membre.deactivate", "utilisateurs", m.id, {
      email: m.email, prenom: m.prenom, nom: m.nom, magic_link_sent: activating,
    });
    toast.success(
      activating
        ? `Membre activé. Lien d'invitation envoyé à ${m.email}.`
        : "Membre désactivé.",
    );
    fetchMembers();
  };

  const handleDelete = async (m: Utilisateur) => {
    if (m.id === me?.id) return;
    if (!confirm(`Supprimer définitivement ${m.prenom} ${m.nom} ?`)) return;
    // Supprime le profil ET le compte de connexion (fonction SQL réservée aux admins).
    const { error } = await supabase.rpc("supprimer_membre", { p_id: m.id });
    if (error) {
      toast.error("La suppression a échoué.");
      return;
    }
    logAction("membre.delete", "utilisateurs", m.id, {
      email: m.email, prenom: m.prenom, nom: m.nom, role: m.role,
    });
    fetchMembers();
  };

  const fieldClass = "w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Membres</h1>
          <p className="text-muted-foreground text-sm mt-1">{members.length} profil(s) au total</p>
        </div>
        <button onClick={() => { setCreateForm(emptyCreateForm); setCreateError(""); setCreateModal(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Créer un membre
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="pl-9 pr-4 py-2 border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary w-52" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="tous">Tous les rôles</option>
          <option value="inscrit">Inscrits</option>
          <option value="membre">Membres</option>
          <option value="administrateur">Admins</option>
        </select>
        {offresDisponibles && (
          <select value={filtreOffre} onChange={e => setFiltreOffre(e.target.value)} aria-label="Filtrer par offre"
            className="border rounded-xl px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="toutes">Toutes les offres</option>
            {nomsOffres.map(n => <option key={n} value={n}>{n}</option>)}
            <option value="aucune">Sans adhésion</option>
          </select>
        )}
        <select value={filterActif} onChange={e => setFilterActif(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="tous">Tous statuts</option>
          <option value="actif">Actifs</option>
          <option value="inactif">Inactifs</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Membre</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Rôle</th>
                {offresDisponibles && <th className="text-left px-5 py-3 font-medium text-muted-foreground">Offre en cours</th>}
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">Statut</th>
                {naissancesDisponibles && <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">Naissance</th>}
                <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">Consentement</th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden lg:table-cell">Abonnement</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={nbColonnes} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={nbColonnes} className="text-center py-12 text-muted-foreground">Aucun résultat</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{m.prenom} {m.nom}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                    <div className="mt-1 md:hidden"><BadgePhotos autorisation={autorisations.get(m.id)} /></div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass[m.role]}`}>
                      {roleLabel[m.role]}
                    </span>
                  </td>
                  {offresDisponibles && (
                    <td className="px-5 py-3.5">
                      {m.role === "administrateur" ? <span className="text-muted-foreground">—</span> : <OffresPersonne offres={offres.get(m.id) ?? []} />}
                    </td>
                  )}
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.est_actif ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {m.est_actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  {naissancesDisponibles && (
                    <td className="px-5 py-3.5 hidden md:table-cell text-xs text-muted-foreground">
                      {naissances.get(m.id)?.date ? dateFr(naissances.get(m.id)!.date) : "—"}
                    </td>
                  )}
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <BadgePhotos autorisation={autorisations.get(m.id)} avecLibelle={false} />
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-muted-foreground">
                    {m.debut_abonnement
                      ? `${new Date(m.debut_abonnement).toLocaleDateString("fr-FR")} → ${m.fin_abonnement ? new Date(m.fin_abonnement).toLocaleDateString("fr-FR") : "∞"}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(m)} title="Modifier"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {m.id !== me?.id && (
                        <>
                          <button onClick={() => toggleActif(m)} title={m.est_actif ? "Désactiver" : "Activer"}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            {m.est_actif ? <UserX className="w-3.5 h-3.5" /> : <UserCheck2 className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => handleDelete(m)} title="Supprimer"
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal création ── */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-lg">Créer un membre</h2>
              <button onClick={() => setCreateModal(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Prénom *</label>
                  <input value={createForm.prenom} onChange={e => setCreateForm(f => ({ ...f, prenom: e.target.value }))} className={fieldClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nom *</label>
                  <input value={createForm.nom} onChange={e => setCreateForm(f => ({ ...f, nom: e.target.value }))} className={fieldClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email *</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className={fieldClass} />
              </div>

              {/* Toggle Actif / Inactif — contrôle l'envoi du mail de confirmation */}
              <div className="flex items-start gap-3 bg-muted/40 border rounded-xl p-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={createForm.est_actif}
                  onClick={() => setCreateForm(f => ({ ...f, est_actif: !f.est_actif }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    createForm.est_actif ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      createForm.est_actif ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {createForm.est_actif ? "Compte actif" : "Compte inactif"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {createForm.est_actif
                      ? "Le compte Supabase est créé et un mail de confirmation est envoyé."
                      : "Aucun compte Supabase créé, aucun mail envoyé. Tu pourras activer le compte plus tard."}
                  </p>
                </div>
              </div>

              {createForm.est_actif && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Mot de passe temporaire *</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={createForm.mot_de_passe}
                      onChange={e => setCreateForm(f => ({ ...f, mot_de_passe: e.target.value }))}
                      className={`${fieldClass} pr-10`} placeholder="6 caractères minimum" />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Le membre pourra le changer via "Mot de passe oublié"</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">Téléphone</label>
                <input value={createForm.telephone} onChange={e => setCreateForm(f => ({ ...f, telephone: e.target.value }))} className={fieldClass} />
                <p className="text-xs text-muted-foreground mt-1">La date de naissance se saisit avec l'adhésion (Offre &amp; adhésions → Ajouter une adhésion).</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Rôle</label>
                <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as RoleCreable }))} className={fieldClass}>
                  <option value="inscrit">Inscrit</option>
                  <option value="administrateur">Administrateur</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">{AIDE_ROLE_MEMBRE}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Début abonnement</label>
                  <input type="date" value={createForm.debut_abonnement} onChange={e => setCreateForm(f => ({ ...f, debut_abonnement: e.target.value }))} className={fieldClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Fin abonnement</label>
                  <input type="date" value={createForm.fin_abonnement} onChange={e => setCreateForm(f => ({ ...f, fin_abonnement: e.target.value }))} className={fieldClass} />
                </div>
              </div>
              {createError && <p className="text-destructive text-sm">{createError}</p>}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setCreateModal(false)} className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleCreate} disabled={saving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Création en cours..." : "Créer le membre"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal édition ── */}
      {editModal.open && editModal.member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-lg">Modifier le membre</h2>
              <button onClick={() => setEditModal({ open: false, member: null })} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Prénom</label>
                  <input value={editForm.prenom} onChange={e => setEditForm(f => ({ ...f, prenom: e.target.value }))} className={fieldClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nom</label>
                  <input value={editForm.nom} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} className={fieldClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Téléphone</label>
                <input value={editForm.telephone} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} className={fieldClass} />
              </div>
              {naissancesDisponibles && (
                <div>
                  <label htmlFor="m-naissance" className="block text-sm font-medium mb-1.5">Date de naissance</label>
                  <ChampDateNaissance id="m-naissance" value={editForm.date_naissance}
                    disabled={!naissances.get(editModal.member.id)}
                    onChange={date_naissance => setEditForm(f => ({ ...f, date_naissance }))} className={`${fieldClass} disabled:opacity-60`} />
                  <p className="text-xs text-muted-foreground mt-1">
                    {naissances.get(editModal.member.id)
                      ? "Enregistrée sur son adhésion la plus récente."
                      : "Pas encore d'adhésion : la date se saisit avec l'adhésion (Offre & adhésions)."}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Début abonnement</label>
                  <input type="date" value={editForm.debut_abonnement} onChange={e => setEditForm(f => ({ ...f, debut_abonnement: e.target.value }))} className={fieldClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Fin abonnement</label>
                  <input type="date" value={editForm.fin_abonnement} onChange={e => setEditForm(f => ({ ...f, fin_abonnement: e.target.value }))} className={fieldClass} />
                </div>
              </div>
              {editModal.member.id !== me?.id && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Rôle</label>
                    <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as UserRole }))} className={fieldClass}>
                      <option value="inscrit">Inscrit</option>
                      {editModal.member.role === "membre" && <option value="membre">Membre</option>}
                      <option value="administrateur">Administrateur</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">{AIDE_ROLE_MEMBRE}</p>
                  </div>

                  {/* Toggle Actif / Inactif — passer à actif envoie un magic link */}
                  <div className="flex items-start gap-3 bg-muted/40 border rounded-xl p-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={editForm.est_actif}
                      onClick={() => setEditForm(f => ({ ...f, est_actif: !f.est_actif }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        editForm.est_actif ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          editForm.est_actif ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {editForm.est_actif ? "Compte actif" : "Compte inactif"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {!editModal.member.est_actif && editForm.est_actif
                          ? "En enregistrant, un lien d'invitation magique sera envoyé par email."
                          : editForm.est_actif
                            ? "Le membre peut se connecter à son espace."
                            : "Le membre ne peut pas se connecter."}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setEditModal({ open: false, member: null })} className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleSave} disabled={saving}
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

export default Membres;
