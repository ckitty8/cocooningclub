import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Info } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { MATRICE, ROLES, ROLES_SIMULABLES, pageAccueilDuRole, type RoleSimulable } from "@/lib/roles";
import { OFFRES_SIMULABLES, type OffreSimulee } from "@/lib/droits";

// Zones du site que voit chaque rôle, déduites de la matrice des rôles.
const zonesDuRole = (role: RoleSimulable) =>
  MATRICE.filter(section => section.lignes.some(l => l.acces.includes(role))).map(section => section.titre);

const Simulateur = () => {
  const { simulation, simuler, simulerOffre, offreSimulee, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Simulateur de rôle · Cocooning Club";
  }, []);

  const commencer = (role: RoleSimulable) => {
    simuler(role);
    navigate(pageAccueilDuRole(role));
  };

  // Adhérente d'une offre précise : on arrive sur les ateliers, où l'on voit ce qui est inclus ou à régler.
  const commencerAvecOffre = (offre: OffreSimulee) => {
    simuler("membre");
    simulerOffre(offre);
    navigate("/espace-membre/ateliers");
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Simulateur de rôle</h1>
        <p className="mt-1 text-muted-foreground">
          Parcourez le site avec les droits d'un autre rôle, sans changer de compte.
        </p>
      </div>

      {simulation && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-5 py-4">
          <Eye className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="flex-1 text-sm">
            Simulation en cours : <strong>{ROLES[simulation].libelle}</strong>.
          </p>
          <button
            onClick={() => simuler(null)}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Revenir au créateur
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {ROLES_SIMULABLES.map(role => {
          const actif = simulation === role;
          return (
            <section
              key={role}
              aria-labelledby={`role-${role}`}
              className={`flex flex-col rounded-2xl border bg-card p-5 ${actif ? "ring-2 ring-primary" : ""}`}
            >
              <h2 id={`role-${role}`} className="font-body text-lg font-semibold text-foreground">{ROLES[role].libelle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{ROLES[role].description}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Accès</p>
              <ul className="mt-1 flex-1 list-disc space-y-0.5 pl-5 text-sm text-foreground">
                {zonesDuRole(role).map(zone => <li key={zone}>{zone}</li>)}
              </ul>
              <button
                onClick={() => commencer(role)}
                disabled={actif}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                {actif ? "Simulation en cours" : `Voir le site comme ${ROLES[role].libelle.toLowerCase()}`}
              </button>
              {role === "membre" && (
                <div className="mt-3 border-t pt-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Selon l'offre</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {OFFRES_SIMULABLES.map(o => (
                      <button
                        key={o.code}
                        onClick={() => commencerAvecOffre(o.code)}
                        aria-pressed={actif && offreSimulee === o.code}
                        className={`min-h-9 rounded-full border px-3 text-xs font-medium transition-colors hover:bg-muted ${actif && offreSimulee === o.code ? "border-primary bg-primary/10" : ""}`}
                      >
                        {o.libelle}
                      </button>
                    ))}
                    <button
                      onClick={() => commencerAvecOffre("aucune")}
                      aria-pressed={actif && offreSimulee === "aucune"}
                      className={`min-h-9 rounded-full border px-3 text-xs font-medium transition-colors hover:bg-muted ${actif && offreSimulee === "aucune" ? "border-primary bg-primary/10" : ""}`}
                    >
                      Sans adhésion
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-6 flex gap-3 rounded-2xl border bg-muted/40 p-5 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="space-y-1.5">
          <p>
            La simulation ne change que l'affichage : menus et pages accessibles. Les données restent celles de votre
            compte ({profile?.email}) et les règles de sécurité de la base de données ne changent pas.
          </p>
          <p>
            Un bandeau reste affiché en bas de l'écran pendant la simulation, et elle s'arrête à la fermeture de
            l'onglet. Pour voir le site comme un visiteur non connecté, ouvrez-le dans une fenêtre de navigation privée.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Simulateur;
