import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NouveauMotDePasse = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Erreur lors de la mise à jour. Le lien a peut-être expiré.");
      return;
    }
    toast.success("Mot de passe mis à jour ! Vous êtes connecté(e).");
    navigate("/membre");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-3xl font-bold text-foreground tracking-[0.08em] uppercase">
            Cocooning Club
          </Link>
          <p className="text-muted-foreground mt-2">Nouveau mot de passe</p>
        </div>

        <div className="bg-card rounded-2xl border p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Choisir un nouveau mot de passe</h2>
          <p className="text-sm text-muted-foreground mb-6">Entrez votre nouveau mot de passe ci-dessous.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum 6 caractères</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : "Enregistrer le mot de passe"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NouveauMotDePasse;
