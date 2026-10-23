import { useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/utils/withTimeout";
import { AuthContext, type Profile } from "@/contexts/auth";
import { estRoleSimulable, roleEffectif, roleReelDe, type RoleSimulable } from "@/lib/roles";

// La simulation est propre à l'onglet (elle s'efface en le fermant).
const CLE_SIMULATION = "createur.simulation";

const lireSimulation = (): RoleSimulable | null => {
  try {
    const valeur = sessionStorage.getItem(CLE_SIMULATION);
    return estRoleSimulable(valeur) ? valeur : null;
  } catch {
    return null;
  }
};

const ecrireSimulation = (role: RoleSimulable | null) => {
  try {
    if (role) sessionStorage.setItem(CLE_SIMULATION, role);
    else sessionStorage.removeItem(CLE_SIMULATION);
  } catch {
    // Stockage indisponible (navigation privée stricte) : la simulation reste en mémoire.
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulationDemandee, setSimulationDemandee] = useState<RoleSimulable | null>(lireSimulation);

  // Seul le créateur peut simuler : pour tout autre compte, la valeur est ignorée.
  const roleReel = profile ? roleReelDe(profile, user?.email) : null;
  const simulation = roleReel === "createur" ? simulationDemandee : null;
  const role = roleEffectif(roleReel, simulation);

  const simuler = (nouveauRole: RoleSimulable | null) => {
    if (roleReel !== "createur") return;
    setSimulationDemandee(nouveauRole);
    ecrireSimulation(nouveauRole);
  };

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
    setSimulationDemandee(null);
    ecrireSimulation(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, roleReel, role, simulation, simuler, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
