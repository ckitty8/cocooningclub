import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Filet de sécurité : si fetchProfile reste en attente plus longtemps
// que ça après un signIn réussi, on débloque l'UI avec un message clair.
const PROFILE_LOAD_TIMEOUT_MS = 10000;

const Login = () => {
  const { signIn, user, profile, loading: authLoading } = useAuth();
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

  const clearStuckTimer = () => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
  };

  const stopAwaiting = () => {
    awaitingProfileRef.current = false;
    clearStuckTimer();
    setSubmitting(false);
  };

  // Redirection quand profile est chargé. Si on attendait le profile et
  // que AuthContext a fini de charger sans le trouver, on affiche une
  // erreur explicite plutôt que le timeout générique : la session auth
  // est valide mais aucune ligne `utilisateurs` ne correspond à l'id
  // (typiquement un décalage auth.users.id ↔ utilisateurs.id).
  useEffect(() => {
    if (profile) {
      stopAwaiting();
      if (profile.role === "administrateur") navigate("/admin/dashboard", { replace: true });
      else if (profile.role === "membre_premium") navigate("/espace-membre-premium", { replace: true });
      else navigate("/espace-membre", { replace: true });
      return;
    }
    if (awaitingProfileRef.current && user && !authLoading && !profile) {
      stopAwaiting();
      setError("Profil introuvable pour ce compte. Contacte l'administrateur.");
    }
  }, [profile, user, authLoading, navigate]);

  useEffect(() => () => clearStuckTimer(), []);

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
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="font-display text-3xl font-bold text-foreground tracking-[0.08em] uppercase hover:opacity-80 transition-opacity">
            Cocooning Club
          </Link>
          <p className="text-muted-foreground mt-2 text-sm">Connexion à votre espace</p>
        </div>

        <div className="bg-card rounded-2xl border p-8 shadow-sm">
          {isInactive && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3 mb-6">
              Votre compte est désactivé. Contactez l'administrateur.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Mot de passe</label>
                <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/" className="hover:text-primary transition-colors">← Retour au site</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
