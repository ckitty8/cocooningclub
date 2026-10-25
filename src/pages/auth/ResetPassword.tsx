import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AuthLayout from "@/components/auth/AuthLayout";
import { boutonEnvoi, champ, libelle } from "@/components/auth/classes";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase envoie le token via le fragment d'URL (#access_token=...)
  // Il faut attendre que la session soit établie
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Erreur lors de la mise à jour. Réessayez.");
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    }
  };

  if (done) {
    return (
      <AuthLayout titre="Mot de passe mis à jour" retour={{ to: "/login", libelle: "Aller à la connexion" }}>
        <div className="space-y-3 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Vous allez être redirigé vers la page de connexion…</p>
        </div>
      </AuthLayout>
    );
  }

  if (!ready) {
    return (
      <AuthLayout titre="Nouveau mot de passe" retour={{ to: "/login", libelle: "Retour à la connexion" }}>
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">Vérification du lien en cours…</p>
          <p className="text-xs text-muted-foreground">
            Si rien ne se passe, le lien a peut-être expiré.{" "}
            <Link to="/forgot-password" className="text-terracotta hover:underline">
              Demander un nouveau lien
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout titre="Nouveau mot de passe" sousTitre="Choisissez un nouveau mot de passe d'au moins 6 caractères.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="mot-de-passe" className={libelle}>Nouveau mot de passe</label>
          <input
            id="mot-de-passe"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={champ}
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="confirmation" className={libelle}>Confirmer le mot de passe</label>
          <input
            id="confirmation"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className={champ}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={loading} className={boutonEnvoi}>
          {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
