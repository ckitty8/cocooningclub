import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AuthLayout from "@/components/auth/AuthLayout";
import { pageAccueilDuRole } from "@/lib/roles";
import { boutonEnvoi, champ, libelle } from "@/components/auth/classes";

// Filet de sécurité : si fetchProfile reste en attente plus longtemps
// que ça après un signIn réussi, on débloque l'UI avec un message clair.
const PROFILE_LOAD_TIMEOUT_MS = 10000;

const Login = () => {
  const { signIn, user, profile, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Marque qu'on a soumis le formulaire avec succès, donc qu'on attend
  // maintenant que le profile soit chargé par AuthContext.
  const awaitingProfileRef = useRef(false);
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInactive = searchParams.get("inactive") === "true";

  const clearStuckTimer = useCallback(() => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
  }, []);

  const stopAwaiting = useCallback(() => {
    awaitingProfileRef.current = false;
    clearStuckTimer();
    setSubmitting(false);
  }, [clearStuckTimer]);

  // Redirection quand profile est chargé. Si on attendait le profile et
  // que AuthContext a fini de charger sans le trouver, on affiche une
  // erreur explicite plutôt que le timeout générique : la session auth
  // est valide mais aucune ligne `utilisateurs` ne correspond à l'id
  // (typiquement un décalage auth.users.id ↔ utilisateurs.id).
  useEffect(() => {
    if (profile) {
      stopAwaiting();
      navigate(pageAccueilDuRole(role), { replace: true });
      return;
    }
    if (awaitingProfileRef.current && user && !authLoading && !profile) {
      stopAwaiting();
      setError("Profil introuvable pour ce compte. Contacte l'administrateur.");
    }
  }, [profile, role, user, authLoading, navigate, stopAwaiting]);

  useEffect(() => () => clearStuckTimer(), [clearStuckTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    awaitingProfileRef.current = true;

    clearStuckTimer();
    stuckTimerRef.current = setTimeout(() => {
      if (!awaitingProfileRef.current) return;
      stopAwaiting();
      setError("Connexion en attente trop longue. Réessaie ou contacte l'administrateur.");
    }, PROFILE_LOAD_TIMEOUT_MS);

    const { error } = await signIn(email, password);
    if (error) {
      stopAwaiting();
      setError("Email ou mot de passe incorrect.");
    }
    // En cas de succès, l'effet sur `profile` / `authLoading` prend le relais.
  };

  return (
    <AuthLayout titre="Bon retour parmi nous" sousTitre="Connectez-vous pour retrouver vos ateliers, vos inscriptions et le magazine du club.">
      {isInactive && (
        <div className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Votre compte est désactivé. Contactez l'administrateur.
        </div>
      )}

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
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="mot-de-passe" className="text-sm font-medium text-foreground">Mot de passe</label>
            <Link to="/forgot-password" className="inline-block py-1 text-xs text-terracotta transition-colors hover:text-foreground">
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <input
              id="mot-de-passe"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={`${champ} pr-12`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button type="submit" disabled={submitting} className={boutonEnvoi}>
          {submitting ? "Connexion en cours…" : "Se connecter"}
        </button>
      </form>

      <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
        Pas encore membre ?{" "}
        <Link to="/#contact" className="font-medium text-terracotta hover:text-foreground">Écrivez-nous</Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
