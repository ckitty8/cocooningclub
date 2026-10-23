import { createContext } from "react";
import type { User, Session } from "@supabase/supabase-js";

// Contexte d'authentification et ses types, séparés du composant
// AuthProvider (Fast Refresh ne gère que les fichiers qui n'exportent que
// des composants).

export type UserRole = "administrateur" | "inscrit" | "membre";

export interface Profile {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  url_avatar: string | null;
  debut_abonnement: string | null;
  fin_abonnement: string | null;
  role: UserRole;
  est_actif: boolean;
  cree_le: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
