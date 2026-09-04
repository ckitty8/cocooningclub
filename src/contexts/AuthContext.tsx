import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/utils/withTimeout";

export type UserRole = "administrateur" | "inscrit" | "membre";

export interface Profile {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
  url_avatar: string | null;
  debut_abonnement: string | null;
  fin_abonnement: string | null;
  role: UserRole;
  est_actif: boolean;
  cree_le: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      // maybeSingle() : pas d'erreur PGRST116 si aucune ligne (cas
      // auth.users.id ≠ utilisateurs.id), on récupère juste data = null.
      const { data, error } = await withTimeout(
        supabase
          .from("utilisateurs")
          .select("*")
          .eq("id", userId)
          .maybeSingle()
      );
      if (error) console.error("fetchProfile error:", error.message, error.code);
      setProfile((data as Profile) ?? null);
    } catch (err) {
      console.error("[AuthContext.fetchProfile] error:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // onAuthStateChange est la source unique de vérité
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // TOKEN_REFRESHED se déclenche automatiquement (ex: quand l'onglet
        // reprend le focus après être resté en arrière-plan) sans que
        // l'utilisateur ou son profil n'aient changé. Ne pas repasser
        // `loading` à true dans ce cas : RoleGuard démonterait la page en
        // cours (et donc toute modale ouverte / saisie en cours) le temps
        // du rechargement, alors que rien n'a réellement changé.
        if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          return;
        }
        // Marque le profile comme en cours de chargement pour que le
        // Login (et tout autre consumer) puisse savoir qu'on attend
        // encore le résultat du fetchProfile.
        setLoading(true);
        // Defer hors du callback pour éviter les deadlocks Supabase
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
