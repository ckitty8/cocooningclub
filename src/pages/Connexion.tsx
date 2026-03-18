import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Connexion = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    toast.success("Connexion réussie !");

    // Fetch profile to determine redirect destination
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/membre");
      }
    } else {
      navigate("/membre");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    });
    setResetLoading(false);
    if (error) {
      toast.error("Erreur lors de l'envoi. Vérifiez l'adresse email.");
      return;
    }
    toast.success("Email envoyé ! Consultez votre boîte mail pour réinitialiser votre mot de passe.");
    setForgotMode(false);
    setResetEmail("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-3xl font-bold text-foreground tracking-[0.08em] uppercase">
            Cocooning Club
          </Link>
          <p className="text-muted-foreground mt-2">
            {forgotMode ? "Réinitialisation du mot de passe" : "Connectez-vous à votre espace"}
          </p>
        </div>

        <div className="bg-card rounded-2xl border p-8 shadow-sm">
          {forgotMode ? (
            <>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">Mot de passe oublié</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Entrez votre email et nous vous enverrons un lien pour créer un nouveau mot de passe.
              </p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="marie@email.com"
                    required
                    className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {resetLoading ? "Envoi..." : "Envoyer le lien"}
                </button>
              </form>
              <p className="text-center text-sm text-muted-foreground mt-6">
                <button onClick={() => setForgotMode(false)} className="text-primary hover:underline font-medium">
                  Retour à la connexion
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">Connexion</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marie@email.com"
                    required
                    className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-foreground">Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  {loading ? "Connexion..." : "Se connecter"}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Pas encore de compte ?{" "}
                <Link to="/inscription" className="text-primary hover:underline font-medium">
                  S'inscrire
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Connexion;
