import { useEffect, type ReactNode } from "react";
import { MessagesSquare, Pencil, Sprout, Users } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { Bouton, GrilleValeurs, Surtitre, TitreSection, type Valeur } from "@/components/vitrine";
import { trackVisit } from "@/utils/trackVisit";
import photoGroupe from "@/assets/histoire/groupe-chapeau.webp";
import photoCarnet from "@/assets/histoire/carnet.webp";
import photoRencontres from "@/assets/histoire/rencontres.webp";
import photoIdees from "@/assets/histoire/idees.webp";
import photoAventure from "@/assets/histoire/aventure.webp";
import photoNeon from "@/assets/histoire/neon.webp";

// Photos « polaroïd » : légende manuscrite et légère rotation.
const SOUVENIRS = [
  { photo: photoRencontres, legende: "Des rencontres", alt: "Femmes réunies autour d'une table et de tasses de café", rotation: "-rotate-6" },
  { photo: photoIdees, legende: "Des idées", alt: "Mains au travail sur une table d'atelier créatif", rotation: "rotate-2 translate-y-6" },
  { photo: photoAventure, legende: "Une aventure collective", alt: "Femmes de dos, bras levés face au coucher de soleil", rotation: "rotate-3" },
];

const FONDATRICES = [
  { prenom: "Maëlle", role: "L'initiatrice du projet", description: "Celle qui a lancé l'aventure et rassemble les femmes autour d'une envie commune." },
  { prenom: "Coraline", role: "La voix du club", description: "Celle qui fait parler de nous et fait rayonner notre aventure." },
  { prenom: "Aurélie", role: "La boîte à idées", description: "La créative du groupe, qui imagine et concrétise de nouveaux projets comme notre magazine." },
  { prenom: "Fabienne", role: "Les mains créatives", description: "Celle qui nous fait créer et partage son savoir-faire au travers des ateliers." },
  { prenom: "Christelle", role: "La magicienne du web", description: "Celle qui donne vie à nos idées et met en place les outils qui font grandir le club." },
];

const VALEURS: Valeur[] = [
  { icone: Users, titre: "La convivialité", description: "Se retrouver et partager de bons moments." },
  { icone: MessagesSquare, titre: "Le partage", description: "Des expériences qui nous enrichissent." },
  { icone: Pencil, titre: "La créativité", description: "Oser découvrir et imaginer ensemble." },
  { icone: Sprout, titre: "L'entraide", description: "Un coup de main peut faire la différence." },
];

const paragraphe = "text-sm leading-relaxed text-muted-foreground md:text-base";

/** Section texte à gauche, photo à droite (en dessous sur téléphone). */
const Chapitre = ({ surtitre, titre, photo, alt, children }: {
  surtitre: string;
  titre: string;
  photo: string;
  alt: string;
  children: ReactNode;
}) => (
  <section className="container mx-auto grid items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-20">
    <div className="space-y-5">
      <Surtitre>{surtitre}</Surtitre>
      <TitreSection className="text-left">{titre}</TitreSection>
      {children}
    </div>
    <img src={photo} alt={alt} loading="lazy" decoding="async" className="h-64 w-full rounded-2xl object-cover shadow-md sm:h-80" />
  </section>
);

const NotreHistoire = () => {
  useEffect(() => {
    trackVisit("/notre-histoire");
  }, []);

  return (
    <div className="theme-creme min-h-screen bg-background text-foreground">
      <SiteHeader actif="À propos" />

      <main>
        {/* Hero : photo de groupe et carte titre */}
        <section className="relative pt-20">
          <img
            src={photoGroupe}
            width={548}
            height={284}
            alt="Cinq femmes de dos, bras dessus bras dessous, face à un coucher de soleil"
            className="h-64 w-full object-cover object-left sm:h-80 md:h-[26rem] md:w-[68%]"
          />
          <div className="relative mx-6 -mt-12 rounded-2xl bg-background p-8 shadow-lg md:absolute md:bottom-12 md:right-10 md:top-32 md:mx-0 md:mt-0 md:flex md:w-[40%] md:flex-col md:justify-center lg:p-12">
            <Surtitre>À propos</Surtitre>
            <h1 className="mt-3 font-brand text-4xl text-foreground md:text-6xl">Notre histoire</h1>
            <span className="my-5 block h-0.5 w-10 bg-primary" aria-hidden="true" />
            <p className="font-display text-2xl leading-snug text-terracotta md:text-3xl">
              Des rencontres, de la créativité, de l'entraide et surtout, de belles aventures entre femmes{"\u00a0"}!
            </p>
          </div>
        </section>

        <Chapitre
          surtitre="Une belle aventure humaine"
          titre="Tout a commencé par une envie simple"
          photo={photoCarnet}
          alt="Carnet ouvert sur « Une idée… Le Cocooning Club », à côté d'un café"
        >
          <p className={paragraphe}>
            Le Cocooning Club est né d'une envie simple, mais essentielle : créer du lien entre femmes, provoquer de
            belles rencontres et imaginer un espace où chacune pourrait se sentir bien, accueillie et à sa place.
          </p>
          <p className={paragraphe}>
            À l'origine du projet, il y a Maëlle, avec cette volonté de rassembler, de sortir de l'isolement du
            quotidien et de proposer quelque chose de vrai, de chaleureux et de vivant.
          </p>
        </Chapitre>

        {/* Au fil des rencontres : souvenirs en polaroïds */}
        <section className="overflow-hidden bg-card">
          <div className="container mx-auto grid items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-20">
            <div className="flex justify-center pb-6">
              {SOUVENIRS.map(({ photo, legende, alt, rotation }) => (
                <figure key={legende} className={`-mx-1 w-28 bg-white p-2 pb-1 shadow-lg sm:-mx-2 sm:w-44 ${rotation}`}>
                  <img src={photo} alt={alt} loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover" />
                  <figcaption className="py-2 text-center font-display text-lg leading-tight text-terracotta sm:text-xl">{legende}</figcaption>
                </figure>
              ))}
            </div>
            <div className="space-y-5">
              <Surtitre>Au fil des rencontres</Surtitre>
              <TitreSection className="text-left">Une idée qui a grandi à plusieurs</TitreSection>
              <p className={paragraphe}>
                Petit à petit, les échanges se sont multipliés, les envies aussi… et ce qui n'était au départ qu'une
                intuition est devenu un projet collectif.
              </p>
              <p className={paragraphe}>
                Très vite, d'autres femmes ont rejoint l'aventure, chacune avec sa personnalité, son énergie, ses idées
                et ses talents.
              </p>
              <p className={paragraphe}>
                C'est ainsi que le Cocooning Club s'est construit : à plusieurs, dans le partage, l'enthousiasme et
                l'envie commune de créer quelque chose qui nous ressemble.
              </p>
            </div>
          </div>
        </section>

        <Chapitre
          surtitre="Aujourd'hui"
          titre="Une communauté qui grandit chaque jour"
          photo={photoNeon}
          alt="Néon « Plus qu'un club, une communauté de femmes inspirantes » au-dessus d'une table de café fleurie"
        >
          <p className={paragraphe}>
            Au fil des rencontres, le projet a pris forme naturellement. Il est devenu un lieu d'échange, de
            créativité, d'inspiration et d'entraide, où l'on peut autant venir pour rencontrer d'autres femmes que
            pour partager ses idées, ses passions ou simplement passer un bon moment.
          </p>
          <p className={paragraphe}>
            Le Cocooning Club continue d'évoluer, de grandir et de se construire au fil des femmes qui le
            rejoignent. Et c'est sûrement ça, le plus beau dans cette histoire : elle ne fait que commencer !
          </p>
        </Chapitre>

        {/* Les fondatrices */}
        <section className="bg-card py-16 md:py-20">
          <div className="container mx-auto px-6">
            <div className="mx-auto mb-12 max-w-3xl space-y-4 text-center">
              <Surtitre>Les femmes derrière le Cocooning Club</Surtitre>
              <TitreSection>Cinq femmes, une même envie</TitreSection>
              <p className={paragraphe}>
                Cinq personnalités, cinq talents, une même envie de faire vivre une aventure humaine, créative et
                inspirante. Découvrez celles qui imaginent, construisent et font grandir le Cocooning Club au
                quotidien.
              </p>
            </div>
            <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
              {FONDATRICES.map(({ prenom, role, description }) => (
                <li key={prenom} className="mx-auto max-w-xs text-center">
                  {/* En attendant les portraits : initiale sur fond pêche. */}
                  <div
                    className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-background font-brand text-5xl text-terracotta shadow-inner"
                    aria-hidden="true"
                  >
                    {prenom[0]}
                  </div>
                  <h3 className="relative z-10 mx-auto -mt-4 w-fit -rotate-2 rounded-sm bg-espace-papotages/50 px-5 font-display text-3xl text-foreground">
                    {prenom}
                  </h3>
                  <p className="mt-2 font-display text-xl text-terracotta">{role}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="container mx-auto px-6 py-16 md:py-20">
          <TitreSection className="mb-12 text-center">Ce qui nous unit</TitreSection>
          <GrilleValeurs valeurs={VALEURS} />
        </section>

        <section className="container mx-auto px-6 pb-20">
          <div className="mx-auto flex max-w-4xl flex-col items-start gap-6 rounded-3xl bg-card p-8 shadow-md md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <TitreSection className="text-left md:text-4xl">Et si la prochaine belle rencontre, c'était toi{"\u00a0"}?</TitreSection>
              <span className="mt-4 block h-0.5 w-10 bg-primary" aria-hidden="true" />
            </div>
            <div className="shrink-0">
              <Bouton to="/calendrier">Découvrir nos événements</Bouton>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default NotreHistoire;
