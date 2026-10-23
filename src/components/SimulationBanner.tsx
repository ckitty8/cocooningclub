import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLES } from "@/lib/roles";
import { OFFRES_SIMULABLES } from "@/lib/droits";

// Bandeau affiché sur toutes les pages tant que le créateur simule un autre
// rôle, pour qu'il ne l'oublie pas et puisse en sortir en un clic.
const SimulationBanner = () => {
  const { simulation, simuler, offreSimulee } = useAuth();
  const navigate = useNavigate();

  if (!simulation) return null;

  const quitter = () => {
    simuler(null);
    navigate("/admin/createur/simulateur");
  };

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-sm text-background shadow-xl"
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">
        Simulation : vous voyez le site comme <strong>{ROLES[simulation].libelle}</strong>
        {offreSimulee && <> · <strong>{OFFRES_SIMULABLES.find(o => o.code === offreSimulee)?.libelle ?? "sans adhésion"}</strong></>}.
      </p>
      <button
        onClick={quitter}
        className="min-h-9 shrink-0 rounded-full bg-background px-4 font-medium text-foreground transition-opacity hover:opacity-90"
      >
        Quitter
      </button>
    </div>
  );
};

export default SimulationBanner;
