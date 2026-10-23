import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { RoleSite } from "@/lib/roles";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: readonly RoleSite[];
  redirectTo?: string;
  /**
   * Teste le rôle réel plutôt que le rôle simulé. Réservé aux outils du
   * créateur, qui doivent rester accessibles pendant une simulation.
   */
  reel?: boolean;
}

const RoleGuard = ({ children, allowedRoles, redirectTo = "/login", reel = false }: RoleGuardProps) => {
  const { user, profile, loading, role, roleReel } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) return <Navigate to={redirectTo} replace />;
  if (!profile.est_actif) return <Navigate to="/login?inactive=true" replace />;
  const roleTeste = reel ? roleReel : role;
  if (!roleTeste || !allowedRoles.includes(roleTeste)) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default RoleGuard;
