import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { fondFormule } from "@/lib/adhesions";
import { economie, lieuSurCarte, montant, prixBarreAffiche, type OffrePublique, type SlugEspaceOffre } from "@/lib/offres";
import { googleMapsSearchUrl } from "@/utils/googleMaps";

// Couleur de la pastille de chaque activité (charte des espaces). Classes écrites en entier pour Tailwind.
const PASTILLE: Record<SlugEspaceOffre, string> = {
  papotages: "bg-espace-papotages",
  creatifs: "bg-espace-creatifs",
  business: "bg-espace-business",
};

interface Props {
  offre: OffrePublique;
  /** Aperçu de l'administration : la carte en cours de modification est entourée. */
  surlignee?: boolean;
  /** Accueil : seulement le prix, le rythme et les activités avec leurs lieux ; le reste est sur la page « Nos offres ». */
  resume?: boolean;
}

/** Carte d'une offre d'adhésion : bandeau, prix, rythme, activités et lieux, puis (sauf en résumé) ce qui est compris et le bouton d'adhésion. */
const CarteOffre = ({ offre, surlignee = false, resume = false }: Props) => {
  const barre = prixBarreAffiche(offre);
  const gain = economie(offre);
  const titreId = `offre-${offre.id || "apercu"}`;

  return (
    <article
      aria-labelledby={titreId}
      className={`relative flex h-full flex-col overflow-hidden rounded-3xl bg-card ${
        offre.mise_en_avant ? "border-2 border-primary shadow-lg" : "border"
      } ${surlignee ? "outline-dashed outline-[3px] outline-offset-4 outline-primary" : ""}`}
    >
      <h3
        id={titreId}
        className="px-4 py-3 text-center font-body text-sm font-semibold uppercase tracking-[0.2em] text-white"
        style={{ backgroundColor: fondFormule(offre.couleur) }}
      >
        {offre.nom || "Nom de l'offre"}
      </h3>

      <div className="flex flex-1 flex-col p-6">
        {offre.mise_en_avant && (
          <p className="-mt-2 mb-1 self-end rounded-full border border-primary bg-white px-3 py-0.5 text-xs font-semibold text-terracotta">
            Le plus complet
          </p>
        )}

        <p className="text-center">
          <span className="font-brand text-5xl font-bold text-foreground">{montant(offre.prix)}</span>
          <span className="text-muted-foreground"> / an</span>
        </p>
        {barre !== null && (
          <p className="mt-1 text-center text-sm text-muted-foreground">
            au lieu de <s>{montant(barre)}</s>
            {gain !== null && (
              <span className="ml-2 inline-block rounded-full bg-[#f3dcd3] px-2.5 py-0.5 text-xs font-semibold text-terracotta">
                {montant(gain)} d'économie
              </span>
            )}
          </p>
        )}
        {offre.rythme && <p className="mt-3 text-center font-brand text-lg italic text-muted-foreground">{offre.rythme}</p>}
        {!offre.rythme && offre.description && <p className="mt-3 text-center text-sm text-muted-foreground">{offre.description}</p>}

        {offre.activites.length > 0 && (
          <ul className="mt-5 divide-y divide-dashed border-y border-dashed" aria-label="Activités">
            {offre.activites.map((a, i) => (
              <li key={`${a.nom}-${i}`} className="flex gap-3 py-3">
                <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${PASTILLE[a.espace]}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{a.nom}</p>
                  {a.lieu && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-terracotta" aria-hidden="true" />
                      {lieuSurCarte(a.lieu) ? (
                        <a
                          href={googleMapsSearchUrl(a.lieu)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-6 items-center text-terracotta underline underline-offset-2"
                        >
                          {a.lieu}
                        </a>
                      ) : (
                        <span>{a.lieu}</span>
                      )}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!resume && offre.compris.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-terracotta">Ce qui est compris</p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground marker:text-primary">
              {offre.compris.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}

        {!resume && (
          <div className="mt-auto pt-6">
            {offre.lien_helloasso ? (
              <a
                href={offre.lien_helloasso}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                J'adhère en ligne
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <Link
                to="/#contact"
                className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                J'adhère
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default CarteOffre;
