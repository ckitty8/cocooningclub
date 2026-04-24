import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAction } from "@/utils/logAction";
import { toast } from "sonner";
import {
  User, Mail, Image as ImageIcon, Save, Upload, Trash2, Loader2, Info, AlertCircle,
} from "lucide-react";

const MAX_AVATAR_MB = 2;

const MonCompte = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
  });
  const [originalEmail, setOriginalEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [emailChangePending, setEmailChangePending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        prenom: profile.prenom ?? "",
        nom:    profile.nom ?? "",
        email:  profile.email ?? "",
      });
      setOriginalEmail(profile.email ?? "");
    }
  }, [profile]);

  if (!profile) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </AdminLayout>
  );

  const initials = ((profile.prenom?.[0] ?? "") + (profile.nom?.[0] ?? "")).toUpperCase() || "A";
  const hasChanges =
    form.prenom !== (profile.prenom ?? "") ||
    form.nom !== (profile.nom ?? "") ||
    form.email !== originalEmail;

  const emailChanged = form.email !== originalEmail;

  // ── Save profile ──
  const handleSave = async () => {
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim()) {
      toast.error("Tous les champs sont obligatoires");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Email invalide");
      return;
    }

    setSaving(true);

    // 1) Si email modifié, on met à jour Supabase Auth (déclenche un email de confirmation)
    if (emailChanged) {
      const { error: authErr } = await supabase.auth.updateUser({ email: form.email.trim() });
      if (authErr) {
        toast.error(`Erreur email : ${authErr.message}`, { duration: 8000 });
        setSaving(false);
        return;
      }
      setEmailChangePending(true);
    }

    // 2) Mise à jour de la table utilisateurs (prenom + nom, email si changé)
    const payload: Record<string, unknown> = {
      prenom: form.prenom.trim(),
      nom:    form.nom.trim(),
    };
    if (emailChanged) payload.email = form.email.trim();

    const { error } = await supabase.from("utilisateurs").update(payload).eq("id", profile.id);
    if (error) {
      toast.error(`Erreur : ${error.message}`, { duration: 8000 });
      setSaving(false);
      return;
    }

    logAction("profil.update", "utilisateurs", profile.id, {
      prenom: form.prenom.trim(),
      nom: form.nom.trim(),
      email_change: emailChanged,
    });

    toast.success(emailChanged
      ? "Profil mis à jour. Vérifie l'email de confirmation envoyé à ta nouvelle adresse."
      : "Profil mis à jour");
    await refreshProfile();
    setSaving(false);
  };

  // ── Upload avatar ──
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
      console.error(upErr);
      toast.error(`Erreur upload : ${upErr.message}`, { duration: 8000 });
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = urlData.publicUrl;

    // Ajoute un paramètre pour casser le cache
    const urlWithCacheBust = `${url}?v=${Date.now()}`;

    const { error: updErr } = await supabase
      .from("utilisateurs")
      .update({ url_avatar: urlWithCacheBust })
      .eq("id", profile.id);

    if (updErr) {
      toast.error(`Erreur : ${updErr.message}`, { duration: 8000 });
    } else {
      logAction("profil.avatar_update", "utilisateurs", profile.id);
      toast.success("Avatar mis à jour ✨");
      await refreshProfile();
    }
    setUploadingAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAvatar = async () => {
    if (!profile.url_avatar) return;
    if (!confirm("Supprimer votre avatar ?")) return;

    const { error } = await supabase
      .from("utilisateurs")
      .update({ url_avatar: null })
      .eq("id", profile.id);

    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      logAction("profil.avatar_remove", "utilisateurs", profile.id);
      toast.success("Avatar supprimé");
      await refreshProfile();
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Mon compte</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gère tes infos personnelles et ton avatar.
        </p>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Avatar */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            Photo de profil
          </h2>

          <div className="flex items-center gap-5 flex-wrap">
            {/* Avatar preview */}
            <div className="relative">
              {profile.url_avatar ? (
                <img
                  src={profile.url_avatar}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover border-2 border-muted"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary text-3xl font-bold">
                  {initials}
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploadingAvatar ? "Envoi..." : "Changer la photo"}
              </button>
              {profile.url_avatar && (
                <button
                  onClick={handleRemoveAvatar}
                  className="flex items-center justify-center gap-2 border border-foreground/20 text-muted-foreground hover:text-destructive px-4 py-2 rounded-xl text-sm font-medium hover:bg-destructive/5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                Formats acceptés : JPG, PNG, GIF. Max {MAX_AVATAR_MB} Mo.
              </p>
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
                <input
                  type="text"
                  value={form.prenom}
                  onChange={e => setForm({ ...form, prenom: e.target.value })}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Nom *</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {emailChanged && (
                <p className="text-xs text-amber-600 mt-1 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Tu recevras un email de confirmation à la nouvelle adresse.
                  Tant que tu ne cliques pas dessus, ta connexion restera avec l'ancien email.
                </p>
              )}
              {emailChangePending && (
                <p className="text-xs text-green-600 mt-1 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Email de confirmation envoyé. Valide-le depuis ta boîte mail.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-5 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </div>

        {/* Infos système (read-only) */}
        <div className="bg-muted/30 border rounded-2xl p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Informations système
          </h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rôle</span>
              <span className="font-medium text-foreground">{profile.role}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ID utilisateur</span>
              <span className="font-mono text-xs text-muted-foreground">{profile.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Membre depuis</span>
              <span className="text-foreground">
                {new Date(profile.cree_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
          {user?.email && user.email !== profile.email && (
            <div className="mt-3 pt-3 border-t flex items-start gap-2 text-xs text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Ton email de connexion ({user.email}) ne correspond pas à l'email de ta fiche ({profile.email}).
                Valide l'email de confirmation pour synchroniser.
              </span>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default MonCompte;
