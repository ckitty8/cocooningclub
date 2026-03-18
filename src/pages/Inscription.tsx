import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Inscription = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const nomParam = searchParams.get("nom") || "";
  const nomParts = nomParam.trim().split(" ");
  const firstNameParam = nomParts[0] || "";
  const lastNameParam = nomParts.slice(1).join(" ") || "";

  const [firstName, setFirstName] = useState(firstNameParam);
  const [lastName, setLastName] = useState(lastNameParam);
  const [email, setEmail] = useState(emailParam);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      phone,
    });

    if (error) {
      toast.error(error.message || "Erreur lors de l'inscription.");
      setLoading(false);
      return;
    }

    toast.success("Inscription réussie ! Vous pouvez maintenant vous connecter.");
    navigate("/connexion");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-3xl font-bold text-foreground tracking-[0.08em] uppercase">
            Cocooning Club
          </Link>
          <p className="text-muted-foreground mt-2">Créez votre compte membre</p>
        </div>

        <div className="bg-card rounded-2xl border p-8 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6">Inscription</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Marie"
                  required
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                  required
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

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
              <label className="block text-sm font-medium text-foreground mb-1.5">Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                required
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Mot de passe</label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Inscription..." : "Créer mon compte"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Déjà un compte ?{" "}
            <Link to="/connexion" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Inscription;
