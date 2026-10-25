import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AuthLayout from "@/components/auth/AuthLayout";
import { boutonEnvoi, champ, libelle } from "@/components/auth/classes";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Toujours rediriger vers la prod pour éviter les soucis de previews Vercel.
    // Override possible via VITE_SITE_URL si besoin (dev local).
    const siteUrl = import.meta.env.VITE_SITE_URL || "https://lecocooningclub.fr";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      titre="Mot de passe oublié"
      sousTitre="Saisissez votre adresse email : vous recevrez un lien pour créer un nouveau mot de passe."
      retour={{ to: "/login", libelle: "Retour à la connexion" }}
    >
      {sent ? (
        <div className="space-y-3 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" aria-hidden="true" />
          <h2 className="font-brand text-2xl text-foreground">Email envoyé !</h2>
          <p className="text-sm text-muted-foreground">
            Vérifiez votre boîte mail à <strong>{email}</strong>.
            Cliquez sur le lien reçu pour choisir un nouveau mot de passe.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className={libelle}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={champ}
              placeholder="votre@email.com"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button type="submit" disabled={loading} className={boutonEnvoi}>
            {loading ? "Envoi en cours…" : "Envoyer le lien"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
