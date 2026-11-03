import { Bouton, Surtitre, TitreSection } from "@/components/vitrine";
import { questionsPubliees, trierOffres, type OffrePublique, type QuestionBonASavoir } from "@/lib/offres";
import CarteOffre from "./CarteOffre";

interface GrilleProps {
  offres: OffrePublique[];
  /** Aperçu « Mobile » de l'administration : une seule colonne, quelle que soit la largeur de l'écran. */
  mobile?: boolean;
  /** Carte entourée dans l'aperçu. */
  surligneeId?: string | null;
  /** Accueil : cartes réduites au prix et aux lieux (voir `CarteOffre`). */
  resume?: boolean;
}

/** Les cartes d'offre côte à côte (une colonne sur téléphone). Utilisée par la page « Nos offres » et l'accueil. */
export const GrilleOffres = ({ offres, mobile = false, surligneeId = null, resume = false }: GrilleProps) => (
  <div className={`grid items-stretch gap-6 ${mobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
    {trierOffres(offres).map(o => <CarteOffre key={o.id || "nouvelle"} offre={o} surlignee={surligneeId === o.id} resume={resume} />)}
  </div>
);

export const NoteOffres = () => (
  <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
    Prix TTC · Adhésion de 12 mois à compter de sa validation, renouvellement manuel.
    <br />
    *Consommation sur place obligatoire.
  </p>
);

const ETAPES = [
  { titre: "Je remplis le bulletin", texte: "Le bulletin d'adhésion se remplit à la main, sur papier, et se remet à l'une de nous." },
  { titre: "Je règle en ligne", texte: "La cotisation se règle en ligne, en toute sécurité, avec le bouton de l'offre choisie." },
  { titre: "Mon adhésion est validée", texte: "Une administratrice valide l'adhésion : elle est valable 12 mois et je la retrouve dans mon espace membre." },
];

interface Props {
  offres: OffrePublique[];
  questions: QuestionBonASavoir[];
  chargement?: boolean;
  mobile?: boolean;
  surligneeId?: string | null;
}

/** Tout le contenu de la page « Nos offres » (sans l'en-tête ni le pied de page), repris tel quel par l'aperçu. */
const ContenuNosOffres = ({ offres, questions, chargement = false, mobile = false, surligneeId = null }: Props) => {
  const publiees = questionsPubliees(questions);
  const largeur = mobile ? "px-4" : "container mx-auto px-6";

  return (
    <>
      <section className={`${mobile ? "pt-10" : "pt-16 md:pt-20"} pb-8 text-center`}>
        <div className={`${largeur} mx-auto max-w-2xl space-y-4`}>
          <Surtitre>Adhésion annuelle à l'association</Surtitre>
          <h1 className={`font-display leading-tight text-foreground ${mobile ? "text-5xl" : "text-6xl md:text-7xl"}`}>Nos offres</h1>
          <p className="leading-relaxed text-muted-foreground md:text-lg">
            Choisis l'univers qui te ressemble : l'Espace Chill pour souffler et créer, l'Espace Business pour faire
            avancer tes projets, ou les deux réunis.
          </p>
        </div>
      </section>

      <section aria-label="Les offres" className="pb-6">
        <div className={largeur}>
          {chargement ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : offres.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">Nos offres arrivent très bientôt. Écris-nous pour en savoir plus !</p>
          ) : (
            <GrilleOffres offres={offres} mobile={mobile} surligneeId={surligneeId} />
          )}
          <NoteOffres />
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className={largeur}>
          <div className="mb-10 space-y-3 text-center">
            <Surtitre>Comment adhérer ?</Surtitre>
            <TitreSection>En trois étapes</TitreSection>
          </div>
          <ol className={`grid gap-6 ${mobile ? "grid-cols-1" : "md:grid-cols-3"}`}>
            {ETAPES.map((e, i) => (
              <li key={e.titre} className="rounded-2xl border bg-card p-6">
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary font-semibold text-white" aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className="mb-1.5 font-brand text-lg text-foreground">{e.titre}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{e.texte}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {publiees.length > 0 && (
        <section className="pb-16 md:pb-20" aria-labelledby="bon-a-savoir">
          <div className={`${largeur} max-w-3xl`}>
            <div className="mb-8 space-y-3 text-center">
              <Surtitre>Questions fréquentes</Surtitre>
              <TitreSection><span id="bon-a-savoir">Bon à savoir</span></TitreSection>
            </div>
            <div className="space-y-3">
              {publiees.map(q => (
                <details key={q.id} className="group rounded-2xl border bg-card px-5 py-4">
                  <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-3 font-medium text-foreground">
                    {q.question}
                    <span className="text-terracotta transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  {q.reponse && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{q.reponse}</p>}
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className={`${mobile ? "mx-4" : "container mx-auto px-6"} pb-16 md:pb-20`}>
        <div className="rounded-3xl border bg-card p-8 text-center md:p-10">
          <h2 className="mb-2 font-display text-4xl text-foreground md:text-5xl">Une question avant d'adhérer ?</h2>
          <p className="text-muted-foreground">Écris-nous, on te répond avec plaisir.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Bouton to="/#contact">Nous contacter</Bouton>
            <Bouton to="/calendrier" variante="contour">Voir les prochains événements</Bouton>
          </div>
        </div>
      </section>
    </>
  );
};

export default ContenuNosOffres;
