import { useEffect, useState, useRef } from "react";
import MembrePremiumLayout from "@/components/membre-premium/MembrePremiumLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  User, Mail, Phone, Image as ImageIcon, Save, Upload, Trash2, Loader2,
  Info, Lock, Crown, CalendarRange, Receipt, KeyRound,
} from "lucide-react";

const MAX_AVATAR_MB = 2;

interface PaiementHistorique {
  id: string;
  paypal_transaction_id: string;
  montant: number;
  devise: string;
  statut: "en_attente" | "complete" | "rembourse" | "echoue";
  paypal_cree_le: string | null;
  enregistre_le: string;
  inscription: { atelier: { titre: string } | null } | null;
}

const MonCompte = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", telephone: "" });
  const [originalEmail, setOriginalEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [emailChangePending, setEmailChangePending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mot de passe
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);

  // Historique paiements
  const [paiements, setPaiements] = useState<PaiementHistorique[]>([]);
  const [loadingPaiements, setLoadingPaiements] = useState(true);

  useEffect(() => {
    if (profile) {
      setForm({
        prenom: profile.prenom ?? "",
        nom: profile.nom ?? "",
        email: profile.email ?? "",
        telephone: profile.telephone ?? "",
      });
      setOriginalEmail(profile.email ?? "");
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const loadPaiements = async () => {
      const { data } = await supabase
        .from("transactions_paypal")
        .select("id, paypal_transaction_id, montant, devise, statut, paypal_cree_le, enregistre_le, inscription:inscriptions!inner(utilisateur_id, atelier:ateliers(titre))")
        .eq("inscriptions.utilisateur_id", profile.id)
        .order("enregistre_le", { ascending: false });
      setPaiements(((data ?? []) as unknown as PaiementHistorique[]));
      setLoadingPaiements(false);
    };
    loadPaiements();
  }, [profile]);

  if (!profile) {
    return (
      <MembrePremiumLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MembrePremiumLayout>
    );
  }

  const initials = ((profile.prenom?.[0] ?? "") + (profile.nom?.[0] ?? "")).toUpperCase() || "M";
  const hasChanges =
    form.prenom !== (profile.prenom ?? "") ||
    form.nom !== (profile.nom ?? "") ||
    form.email !== originalEmail ||
    form.telephone !== (profile.telephone ?? "");
  const emailChanged = form.email !== originalEmail;

  const handleSave = async () => {
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim()) {
      toast.error("Prénom, nom et email sont obligatoires");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Email invalide");
      return;
    }
    setSaving(true);

    if (emailChanged) {
      const { error: authErr } = await supabase.auth.updateUser({ email: form.email.trim() });
      if (authErr) {
        toast.error(`Erreur email : ${authErr.message}`, { duration: 8000 });
        setSaving(false);
        return;
      }
      setEmailChangePending(true);
    }

    const payload: Record<string, unknown> = {
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
      telephone: form.telephone.trim() || null,
    };
    if (emailChanged) payload.email = form.email.trim();

    const { error } = await supabase.from("utilisateurs").update(payload).eq("id", profile.id);
    if (error) {
      toast.error(`Erreur : ${error.message}`, { duration: 8000 });
      setSaving(false);
      return;
    }

    toast.success(emailChanged
      ? "Profil mis à jour. Vérifiez l'email de confirmation envoyé à votre nouvelle adresse."
      : "Profil mis à jour ✨");
    await refreshProfile();
    setSaving(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      toast.error(`L'image doit faire moins de ${MAX_AVATAR_MB} Mo`);
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${profile.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (upErr) {
      toast.error(`Erreur upload : ${upErr.message}`, { duration: 8000 });
      setUploadingAvatar(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${urlData.publicUrl}?v=${Date.now()}`;
    const { error: updErr } = await supabase.from("utilisateurs").update({ url_avatar: url }).eq("id", profile.id);
    if (updErr) {
      toast.error(`Erreur : ${updErr.message}`);
    } else {
      toast.success("Avatar mis à jour ✨");
      await refreshProfile();
    }
    setUploadingAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAvatar = async () => {
    if (!profile.url_avatar) return;
    if (!confirm("Supprimer votre avatar ?")) return;
    const { error } = await supabase.from("utilisateurs").update({ url_avatar: null }).eq("id", profile.id);
    if (error) toast.error(`Erreur : ${error.message}`);
    else { toast.success("Avatar supprimé"); await refreshProfile(); }
  };

  const handlePasswordChange = async () => {
    if (pwd.next.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success("Mot de passe mis à jour");
      setPwd({ next: "", confirm: "" });
    }
    setPwdSaving(false);
  };

  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—";

  const subscriptionEnd = profile.fin_abonnement ? new Date(profile.fin_abonnement) : null;
  const subscriptionActive = subscriptionEnd && subscriptionEnd >= new Date();

  const roleLabel: Record<string, string> = {
    administrateur: "Administrateur",
    inscrit: "Inscrit",
    membre: "Membre",
    membre_premium: "Membre Premium",
  };

  return (
    <MembrePremiumLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Mon compte</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez vos infos personnelles, votre abonnement et l'historique de vos paiements.
        </p>
      </div>

      <div className="max-w-3xl space-y-5">
        {/* Avatar */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            Photo de profil
          </h2>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="relative">
              {profile.url_avatar ? (
                <img src={profile.url_avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-muted" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary text-3xl font-bold">{initials}</div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                <Upload className="w-4 h-4" />
                {uploadingAvatar ? "Envoi..." : "Changer la photo"}
              </button>
              {profile.url_avatar && (
                <button onClick={handleRemoveAvatar} className="flex items-center justify-center gap-2 border border-foreground/20 text-muted-foreground hover:text-destructive px-4 py-2 rounded-xl text-sm font-medium hover:bg-destructive/5 transition-colors">
                  <Trash2 className="w-4 h-4" /> Supprimer
                </button>
              )}
              <p className="text-xs text-muted-foreground">Formats acceptés : JPG, PNG, GIF. Max {MAX_AVATAR_MB} Mo.</p>
            </div>
          </div>
        </div>

        {/* Infos perso */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Informations personnelles
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Prénom *</label>
                <input type="text" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Nom *</label>
                <input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Téléphone</label>
                <input type="tel" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            {emailChanged && (
              <p className="text-xs text-amber-600 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Vous recevrez un email de confirmation à la nouvelle adresse. Tant que vous ne cliquez pas dessus, votre connexion reste avec l'ancien email.
              </p>
            )}
            {emailChangePending && (
              <p className="text-xs text-green-600 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Email de confirmation envoyé.
              </p>
            )}
          </div>
          <div className="flex justify-end mt-5 pt-4 border-t">
            <button onClick={handleSave} disabled={!hasChanges || saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </div>

        {/* Mot de passe */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            Mot de passe
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nouveau mot de passe</label>
              <input type="password" value={pwd.next} onChange={e => setPwd({ ...pwd, next: e.target.value })} autoComplete="new-password" className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirmer</label>
              <input type="password" value={pwd.confirm} onChange={e => setPwd({ ...pwd, confirm: e.target.value })} autoComplete="new-password" className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="••••••••" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={handlePasswordChange} disabled={!pwd.next || pwdSaving} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
              {pwdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Changer
            </button>
          </div>
        </div>

        {/* Abonnement */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-primary" />
            Mon abonnement
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Statut</span>
              <span className="inline-flex items-center gap-1 font-medium">
                {profile.role === "membre_premium" && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                {roleLabel[profile.role] ?? profile.role}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Début</span>
              <span className="font-medium">{fmtDate(profile.debut_abonnement)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Fin</span>
              <span className="font-medium">{fmtDate(profile.fin_abonnement)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">État</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${subscriptionActive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {subscriptionActive ? "Actif" : subscriptionEnd ? "Expiré" : "Sans abonnement"}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Pour modifier votre abonnement, contactez l'équipe via la page de contact.
          </p>
        </div>

        {/* Historique paiements */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Historique des paiements
          </h2>
          {loadingPaiements ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : paiements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun paiement enregistré.</p>
          ) : (
            <ul className="divide-y">
              {paiements.map(p => (
                <li key={p.id} className="py-3 flex items-center gap-3 text-sm flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {p.inscription?.atelier?.titre ?? "Atelier"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(p.paypal_cree_le ?? p.enregistre_le)} · {p.paypal_transaction_id}
                    </p>
                  </div>
                  <span className="font-medium text-foreground">
                    {p.montant.toFixed(2)} {p.devise}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.statut === "complete" ? "bg-emerald-100 text-emerald-700" :
                    p.statut === "rembourse" ? "bg-blue-100 text-blue-700" :
                    p.statut === "echoue" ? "bg-destructive/10 text-destructive" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {p.statut === "complete" ? "Payé" : p.statut === "rembourse" ? "Remboursé" : p.statut === "echoue" ? "Échoué" : "En attente"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Infos système */}
        <div className="bg-muted/30 border rounded-2xl p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Informations système
          </h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Membre depuis</span>
              <span className="text-foreground">{fmtDate(profile.cree_le)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ID utilisateur</span>
              <span className="font-mono text-xs text-muted-foreground">{profile.id.slice(0, 8)}…</span>
            </div>
          </div>
          {user?.email && user.email !== profile.email && (
            <div className="mt-3 pt-3 border-t flex items-start gap-2 text-xs text-amber-700">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Votre email de connexion ({user.email}) ne correspond pas à votre fiche ({profile.email}). Validez l'email de confirmation pour synchroniser.</span>
            </div>
          )}
        </div>
      </div>
    </MembrePremiumLayout>
  );
};

export default MonCompte;
