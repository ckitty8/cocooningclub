import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import EvenementsJsonLd from "@/components/EvenementsJsonLd";
import { Bouton, Surtitre, TitreSection } from "@/components/vitrine";
import { ESPACES_PAR_SLUG } from "@/lib/espaces";
import { ORDRE_ESPACES, PAGES_ESPACES, type SlugEspace } from "@/data/pagesEspaces";
import { formatDateFr, formatTimeFr } from "@/data/workshops";
import { usePublicAteliers } from "@/hooks/usePublicAteliers";
import { trackVisit } from "@/utils/trackVisit";

const COLONNES = "id, titre, date_atelier, heure_debut, duree, description, lieu, adresse, tarif_standard, statut, espaces(slug)";

const ETAPES = [
  "Choisis un atelier dans le calendrier.",
  "Remplis la pré-inscription en ligne : elle ne prend que quelques minutes.",
  "L'association valide ta demande et, si l'atelier est payant, t'indique les modalités de règlement.",
];

/** Page de présentation d'un espace (Papotages, Créatifs ou Business) et de ses prochains ateliers. */
const EspacePage = ({ slug }: { slug: SlugEspace }) => {
  const page = PAGES_ESPACES[slug];
  const { ateliers, loading } = usePublicAteliers(COLONNES);
  const ateliersEspace = useMemo(() => ateliers.filter(a => a.espaces?.slug === slug), [ateliers, slug]);

  useEffect(() => {
    trackVisit(page.chemin);
  }, [page.chemin]);

  return (
    <div className="theme-vitrine min-h-screen bg-background text-foreground">
      <SiteHeader actif="Nos espaces" />
      <EvenementsJsonLd ateliers={ateliersEspace} />

      <main className="pt-20">
        <section className="container mx-auto grid items-center gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr] md:py-16">
          <div className="space-y-5">
            <Surtitre>{page.surtitre}</Surtitre>
            <h1 className="font-display text-4xl leading-[1.15] text-foreground sm:text-5xl lg:text-6xl">{page.titre}</h1>
            <p className="text-lg leading-snug text-terracotta md:text-xl">{page.accroche}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Bouton to="/calendrier">Voir le calendrier</Bouton>
              <Bouton to="/notre-histoire" variante="contour">Notre histoire</Bouton>
            </div>
          </div>
          <div className="flex justify-center">
            <img
              src={ESPACES_PAR_SLUG[slug].logo}
              alt={`Logo de l'espace ${page.nom} du Cocooning Club`}
              width={320}
              height={320}
              className="max-h-72 w-auto object-contain"
            />
          </div>
        </section>

        <section className="bg-card">
          <div className="container mx-auto grid gap-8 px-6 py-14 md:grid-cols-3 md:py-16">
            {page.sections.map(section => (
              <div key={section.titre} className="space-y-3">
                <h2 className="font-brand text-2xl text-foreground">{section.titre}</h2>
                {section.paragraphes.map(texte => (
                  <p key={texte} className="text-sm leading-relaxed text-muted-foreground md:text-base">{texte}</p>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-6 py-14 md:py-16">
          <div className="mx-auto max-w-3xl space-y-6">
            <TitreSection>Prochains ateliers {page.nom}</TitreSection>
            {loading ? (
              <p className="text-center text-sm text-muted-foreground" aria-live="polite">Chargement des ateliers…</p>
            ) : ateliersEspace.length === 0 ? (
              <p className="text-center text-sm leading-relaxed text-muted-foreground">
                Aucun atelier n'est programmé pour le moment. Consulte le{" "}
                <Link to="/calendrier" className="text-terracotta underline underline-offset-2">calendrier</Link>{" "}
                ou suis-nous sur Instagram pour être prévenue des prochaines dates.
              </p>
            ) : (
              <ul className="space-y-3">
                {ateliersEspace.map(a => (
                  <li key={a.id} className="rounded-2xl border bg-card p-5">
                    <h3 className="font-brand text-xl text-foreground">{a.titre}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDateFr(a.date_atelier)}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {formatTimeFr(a.heure_debut)} · {a.duree}
                      </span>
                      {a.lieu && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {a.lieu}
                        </span>
                      )}
                    </p>
                    <Link
                      to={`/calendrier?atelier=${a.id}`}
                      className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-terracotta underline underline-offset-2"
                    >
                      Voir l'atelier et me pré-inscrire
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="bg-card">
          <div className="container mx-auto px-6 py-14 md:py-16">
            <div className="mx-auto max-w-3xl space-y-6">
              <TitreSection>Comment s'inscrire ?</TitreSection>
              <ol className="space-y-3">
                {ETAPES.map((etape, i) => (
                  <li key={etape} className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-white" aria-hidden="true">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-sm leading-relaxed text-muted-foreground md:text-base">{etape}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-14 md:py-16">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <h2 className="font-brand text-2xl text-foreground">Découvre aussi nos autres espaces</h2>
            <ul className="flex flex-wrap justify-center gap-3">
              {ORDRE_ESPACES.filter(s => s !== slug).map(autre => (
                <li key={autre}>
                  <Link
                    to={PAGES_ESPACES[autre].chemin}
                    className="inline-flex min-h-11 items-center rounded-full border border-foreground/30 px-6 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-terracotta"
                  >
                    {PAGES_ESPACES[autre].nom}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default EspacePage;
