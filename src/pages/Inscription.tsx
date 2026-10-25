import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Calendar, Clock, MapPin } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import PreInscriptionModal from "@/components/PreInscriptionModal";
import { Bouton, Surtitre } from "@/components/vitrine";
import { formatDateFr, formatTimeFr, type Workshop } from "@/data/workshops";
import { usePublicAteliers } from "@/hooks/usePublicAteliers";
import { trackVisit } from "@/utils/trackVisit";

const ATELIERS_COLUMNS = "id, titre, date_atelier, heure_debut, duree, places_disponibles, places_max, description, lieu, adresse, tarif_affichage, tarif_standard, statut, date_fin_inscription, espaces(slug)";

// Atelier de remplacement quand la liste des ateliers ne se charge pas : le formulaire reste utilisable
// et la demande est enregistrée avec l'identifiant de l'atelier du lien, jamais perdue.
const atelierDeSecours = (id: string): Workshop => ({
  id,
  titre: "Atelier du lien partagé",
  date_atelier: "",
  heure_debut: "",
  duree: "",
  places_disponibles: 0,
  places_max: 0,
  description: null,
  lieu: null,
  tarif_affichage: null,
  tarif_standard: 0,
  statut: "publie",
});

// Page ouverte par le lien d'inscription d'un atelier (/inscription/<id>) : le formulaire de
// pré-inscription est directement affiché, sans passer par le calendrier.
const Inscription = () => {
  const { id = "" } = useParams();
  const { ateliers, loading, error } = usePublicAteliers(ATELIERS_COLUMNS);

  useEffect(() => {
    trackVisit("/inscription");
  }, []);

  const atelier = useMemo(() => ateliers.find(a => a.id === id) ?? null, [ateliers, id]);
  // Liste indisponible : on garde le formulaire plutôt que de perdre la personne.
  const atelierAffiche = atelier ?? (error ? atelierDeSecours(id) : null);

  return (
    <div className="theme-vitrine flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader actif="Nos événements" />

      <main className="flex-1 pt-24">
        <section className="container mx-auto max-w-xl space-y-6 px-6 py-10">
          <div className="space-y-3 text-center">
            <Surtitre>Pré-inscription</Surtitre>
            {atelierAffiche ? (
              <>
                <h1 className="font-display text-4xl leading-tight sm:text-5xl">{atelier ? atelier.titre : "Rejoignez cet atelier"}</h1>
                {atelier && (
                  <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-1.5"><Calendar className="h-4 w-4" aria-hidden="true" />{formatDateFr(atelier.date_atelier)}</li>
                    <li className="flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" />{formatTimeFr(atelier.heure_debut)}</li>
                    {atelier.lieu && <li className="flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{atelier.lieu}</li>}
                  </ul>
                )}
                {error && !atelier && (
                  <p className="text-sm text-muted-foreground">
                    Les détails de l'atelier ne se chargent pas pour le moment, mais votre demande sera bien enregistrée.
                  </p>
                )}
              </>
            ) : (
              <h1 className="font-display text-4xl leading-tight sm:text-5xl">{loading ? "Chargement…" : "Atelier introuvable"}</h1>
            )}
          </div>

          {atelierAffiche && (
            <PreInscriptionModal
              enPage
              ateliers={[atelierAffiche]}
              atelierId={atelierAffiche.id}
              atelierInitial={atelierAffiche.titre}
              onFermer={() => undefined}
            />
          )}

          {!loading && !atelierAffiche && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Cet atelier n'est plus ouvert aux inscriptions (il est passé ou n'est plus proposé). D'autres rendez-vous vous attendent :
              </p>
              <Bouton to="/calendrier">Voir les prochains ateliers</Bouton>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Inscription;
