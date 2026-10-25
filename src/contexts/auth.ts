import { createContext } from "react";
import type { User, Session } from "@supabase/supabase-js";
import type { RoleSimulable, RoleSite } from "@/lib/roles";
import type { OffreSimulee } from "@/lib/droits";

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
  date_naissance: string | null;
  commune?: string | null;
  activite?: string | null;
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
  /** Rôle réel du compte (le créateur est distinct de l'administrateur). */
  roleReel: RoleSite | null;
  /** Rôle avec lequel le site se comporte : celui simulé par le créateur, sinon le rôle réel. */
  role: RoleSite | null;
  /** Rôle simulé par le créateur, ou null. */
  simulation: RoleSimulable | null;
  /** Démarre (rôle) ou arrête (null) la simulation. Sans effet pour un autre compte que le créateur. */
  simuler: (role: RoleSimulable | null) => void;
  /** Offre simulée (Business, Créatif, Complet ou aucune) : n'a d'effet que pendant la simulation d'une adhérente. */
  offreSimulee: OffreSimulee | null;
  simulerOffre: (offre: OffreSimulee | null) => void;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
