import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronRight, MapPin, Clock, Users, Euro, X, Calendar, CalendarPlus, Link2 } from "lucide-react";
import { FRENCH_MONTHS, formatDateFr, formatTimeFr, parseDateAtelier } from "@/data/workshops";
import type { Workshop } from "@/data/workshops";
import { toast } from "sonner";
import PreInscriptionModal from "@/components/PreInscriptionModal";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Bouton, Surtitre, TitreSection } from "@/components/vitrine";
import photoAtelier from "@/assets/hero-workshop-960.webp";
import { googleMapsSearchUrl } from "@/utils/googleMaps";
import { trackVisit } from "@/utils/trackVisit";
import { usePublicAteliers } from "@/hooks/usePublicAteliers";
import { espaceDe } from "@/lib/espaces";
import AjouterAgenda from "@/components/AjouterAgenda";

const ATELIERS_COLUMNS = "id, titre, date_atelier, heure_debut, duree, places_disponibles, places_max, description, lieu, adresse, tarif_affichage, tarif_standard, statut, date_fin_inscription, espaces(slug)";

const FRENCH_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];


const Calendrier = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { ateliers, loading: ateliersLoading, error: ateliersError, reload: reloadAteliers } =
    usePublicAteliers(ATELIERS_COLUMNS);
  // Titre de l'atelier en cours de pré-inscription, ou null si la fenêtre est fermée.
  const [preInscription, setPreInscription] = useState<string | null>(null);

  useEffect(() => {
    trackVisit("/calendrier");
  }, []);

  // La pop-in est pilotée par l'URL (?atelier=<id>) pour que le lien soit
  // partageable.
  const atelierId = searchParams.get("atelier");
  const popinWorkshop = atelierId ? ateliers.find((a) => a.id === atelierId) ?? null : null;
  const openPopin = (ws: Workshop) => setSearchParams({ atelier: ws.id });
  const closePopin = () => setSearchParams({}, { replace: true });

  const copyWorkshopLink = async (ws: Workshop) => {
    const url = `${window.location.origin}/calendrier?atelier=${ws.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié dans le presse-papiers");
    } catch {
      window.prompt("Copiez le lien de l'atelier :", url);
    }
  };



  const selectedDate = popinWorkshop ? parseDateAtelier(popinWorkshop.date_atelier) : null;

  // Regroupe les ateliers par mois (clé "YYYY-MM") en gardant l'ordre
  // chronologique. Plus facile à scanner qu'une grille mensuelle classique.
  const ateliersParMois = ateliers.reduce<Record<string, Workshop[]>>((acc, ws) => {
    const d = parseDateAtelier(ws.date_atelier);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ws);
    return acc;
  }, {});
  const moisOrdonnes = Object.keys(ateliersParMois).sort();

  return (
    <div className="theme-creme min-h-screen bg-background text-foreground">
      <SiteHeader actif="Nos événements" />

      <main className="pt-20">
        {/* En-tête de page */}
        <section className="container mx-auto grid items-center gap-10 px-6 py-12 md:grid-cols-2 md:py-16">
          <div className="space-y-5">
            <Surtitre>Nos événements</Surtitre>
            <h1 className="font-brand text-4xl leading-[1.1] text-foreground sm:text-5xl">Calendrier des ateliers</h1>
            <span className="block h-0.5 w-10 bg-primary" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              Papotages, ateliers créatifs ou rencontres business : tous nos rendez-vous à venir, regroupés par
              mois. Choisissez un atelier pour voir le détail et vous pré-inscrire.
            </p>
          </div>
          <img
            src={photoAtelier}
            width={1600}
            height={900}
            alt="Table d'atelier en bois avec papiers, ciseaux et ficelle"
            className="h-56 w-full rounded-2xl object-cover shadow-md sm:h-72"
          />
        </section>

        <div className="container mx-auto max-w-3xl px-6 pb-16">

          {/* Liste chronologique des ateliers groupés par mois */}
          {ateliers.length === 0 ? (
            <div className="rounded-2xl bg-card py-16 text-center">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-terracotta/40" aria-hidden="true" />
              {ateliersLoading ? (
                <p className="text-muted-foreground">Chargement des ateliers…</p>
              ) : ateliersError ? (
                <>
                  <p className="text-muted-foreground mb-4">
                    Impossible de charger les ateliers pour le moment. Vérifie ta connexion puis réessaie.
                  </p>
                  <button
                    onClick={reloadAteliers}
                    className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                  >
                    Réessayer
                  </button>
                </>
              ) : (
                <p className="text-muted-foreground">Aucun atelier programmé pour le moment.</p>
              )}
            </div>
          ) : (
            <div className="space-y-12">
              {moisOrdonnes.map(moisKey => {
                const [year, monthIdx] = moisKey.split("-").map(Number);
                const ateliersMois = ateliersParMois[moisKey];
                return (
                  <section key={moisKey}>
                    {/* Bandeau mois */}
                    <div className="mb-5 flex items-baseline gap-3 border-b pb-3">
                      <h2 className="font-brand text-3xl capitalize text-foreground">
                        {FRENCH_MONTHS[monthIdx]}
                      </h2>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">
                        {year}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {ateliersMois.length} atelier{ateliersMois.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Cartes ateliers */}
                    <div className="space-y-3">
                      {ateliersMois.map(ws => {
                        const d = parseDateAtelier(ws.date_atelier);
                        const isSelected = selectedDate &&
                          selectedDate.getTime() === d.getTime() &&
                          popinWorkshop?.id === ws.id;
                        const full = ws.statut === "complet" || ws.places_disponibles <= 0;
                        const espace = espaceDe(ws);
                        return (
                          <button
                            key={ws.id}
                            onClick={() => openPopin(ws)}
                            className={`flex w-full items-stretch gap-4 rounded-2xl border bg-white/70 p-4 text-left shadow-[0_12px_32px_-24px_rgba(99,59,50,0.45)] transition-all hover:shadow-md ${
                              isSelected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/30"
                            }`}
                          >
                            {/* Bloc date à gauche */}
                            <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-card py-2 text-terracotta md:w-20">
                              <span className="text-xs font-semibold tracking-[0.1em] uppercase">
                                {FRENCH_DAYS[(d.getDay() + 6) % 7]}
                              </span>
                              <span className="mt-1 font-brand text-2xl leading-none md:text-3xl">
                                {d.getDate()}
                              </span>
                              <span className="text-[10px] tracking-[0.1em] uppercase mt-0.5">
                                {FRENCH_MONTHS[d.getMonth()].slice(0, 3)}
                              </span>
                            </div>

                            {/* Contenu */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                              {/* Sur téléphone, le logo passe au-dessus du titre pour lui laisser la largeur. */}
                              {espace && (
                                <img
                                  src={espace.logo}
                                  alt={`Espace ${espace.nom}`}
                                  loading="lazy"
                                  decoding="async"
                                  className="h-10 w-16 self-start rounded-lg bg-white object-contain p-0.5 shadow-sm sm:hidden"
                                />
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-brand text-lg text-foreground">
                                  {ws.titre}
                                </h3>
                                {full && (
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-terracotta">
                                    Complet
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> {formatTimeFr(ws.heure_debut)} · {ws.duree}
                                </span>
                                {ws.lieu && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {ws.adresse ? (
                                      <a
                                        href={googleMapsSearchUrl(ws.adresse)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="inline-block py-1 hover:underline"
                                      >
                                        {ws.lieu}
                                      </a>
                                    ) : ws.lieu}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5" /> {ws.places_disponibles}/{ws.places_max}
                                </span>
                                {ws.tarif_affichage && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Euro className="w-3.5 h-3.5" /> {ws.tarif_affichage}
                                  </span>
                                )}
                              </div>
                            </div>

                            {espace && (
                              <img
                                src={espace.logo}
                                alt={`Espace ${espace.nom}`}
                                loading="lazy"
                                decoding="async"
                                className="hidden h-20 w-32 shrink-0 self-center rounded-xl bg-white object-contain p-1 shadow-sm sm:block"
                              />
                            )}

                            {/* Flèche */}
                            <ChevronRight className="w-4 h-4 self-center text-muted-foreground shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* Appel au contact */}
        <section className="container mx-auto px-6 pb-20">
          <div className="mx-auto flex max-w-4xl flex-col items-start gap-6 rounded-3xl bg-card p-8 shadow-md md:flex-row md:items-center md:justify-between md:p-12">
            <div className="space-y-3">
              <TitreSection className="text-left md:text-4xl">Une question sur un atelier{"\u00a0"}?</TitreSection>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Écrivez-nous, on vous répond avec plaisir. Et pour mieux nous connaître, découvrez notre histoire.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Bouton to="/#contact">Nous écrire</Bouton>
              <Bouton to="/notre-histoire" variante="contour">Notre histoire</Bouton>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Workshop detail pop-in */}
      {popinWorkshop && preInscription === null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={closePopin}
          />
          <div role="dialog" aria-modal="true" aria-label={popinWorkshop.titre} className="relative bg-background rounded-2xl shadow-2xl w-full max-w-md border overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b bg-card px-6 py-5">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-terracotta">
                  {formatDateFr(popinWorkshop.date_atelier)} · {formatTimeFr(popinWorkshop.heure_debut)}
                </p>
                <h3 className="font-brand text-2xl text-foreground">
                  {popinWorkshop.titre}
                </h3>
              </div>
              <button
                onClick={closePopin}
                aria-label="Fermer"
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                {popinWorkshop.description}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="w-4 h-4 text-terracotta flex-shrink-0" />
                  {popinWorkshop.adresse ? (
                    <a
                      href={googleMapsSearchUrl(popinWorkshop.adresse)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block py-1 hover:underline"
                    >
                      {popinWorkshop.lieu}
                    </a>
                  ) : (
                    <span>{popinWorkshop.lieu}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock className="w-4 h-4 text-terracotta flex-shrink-0" />
                  <span>{formatTimeFr(popinWorkshop.heure_debut)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Users className="w-4 h-4 text-terracotta flex-shrink-0" />
                  <span>{popinWorkshop.places_disponibles} places restantes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Euro className="w-4 h-4 text-terracotta flex-shrink-0" />
                  <span>{popinWorkshop.tarif_affichage}</span>
                </div>
                {popinWorkshop.date_fin_inscription && (
                  <div className="flex items-center gap-2 text-sm text-foreground col-span-2">
                    <CalendarPlus className="w-4 h-4 text-terracotta flex-shrink-0" />
                    <span>Inscriptions jusqu'au {formatDateFr(popinWorkshop.date_fin_inscription)}</span>
                  </div>
                )}
              </div>
              {popinWorkshop.date_fin_inscription && new Date(popinWorkshop.date_fin_inscription + "T23:59:59") < new Date() ? (
                <button disabled className="w-full cursor-not-allowed rounded-full bg-muted py-3 text-sm font-medium text-muted-foreground">
                  Inscriptions closes
                </button>
              ) : (
                <button
                  onClick={() => setPreInscription(popinWorkshop.titre)}
                  className="w-full rounded-full bg-primary py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  Pré-inscription
                </button>
              )}
              <AjouterAgenda atelier={popinWorkshop} />
              <button
                onClick={() => copyWorkshopLink(popinWorkshop)}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Link2 className="w-4 h-4" />
                Copier le lien de l'atelier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation modal */}
      {preInscription !== null && (
        <PreInscriptionModal
          ateliers={ateliers}
          atelierInitial={preInscription}
          onFermer={() => setPreInscription(null)}
        />
      )}
    </div>
  );
};

export default Calendrier;
