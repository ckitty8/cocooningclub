import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

// Mentions légales exigées par l'article 6 de la loi pour la confiance dans l'économie numérique (LCEN) :
// identité de l'éditeur, directrice de la publication et hébergeurs. À tenir à jour si ces informations changent.
const CONTACT_EMAIL = "le.cocooning.club@gmail.com";

const Mail = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className="text-terracotta underline underline-offset-2">
    {CONTACT_EMAIL}
  </a>
);

const Lien = ({ href, children }: { href: string; children: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-terracotta underline underline-offset-2">
    {children}
  </a>
);

const Rubrique = ({ titre, children }: { titre: string; children: React.ReactNode }) => (
  <section className="space-y-2">
    <h2 className="font-brand text-xl text-foreground">{titre}</h2>
    {children}
  </section>
);

const MentionsLegales = () => (
  <div className="theme-vitrine flex min-h-screen flex-col bg-background text-foreground">
    <SiteHeader />

    <main className="container mx-auto max-w-3xl flex-1 px-6 pb-16 pt-32 md:pb-20 md:pt-36">
      <h1 className="mb-2 font-brand text-3xl text-foreground md:text-5xl">Mentions légales</h1>
      <p className="mb-10 text-sm text-muted-foreground">Dernière mise à jour : 24 octobre 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground md:text-base">
        <Rubrique titre="1. Éditeur du site">
          <p>
            Le site lecocooningclub.fr est édité par l'association <strong className="text-foreground">Le Cocooning Club</strong>,
            association déclarée régie par la loi du 1er juillet 1901.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Siège social : 16 rue Graffan, 93190 Livry-Gargan</li>
            <li>Contact : <Mail /></li>
          </ul>
        </Rubrique>

        <Rubrique titre="2. Directrice de la publication">
          <p>Maëlle Guennanf, représentante de l'association. Contact : <Mail /></p>
        </Rubrique>

        <Rubrique titre="3. Hébergement">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-foreground">Site (pages et application) :</strong> Vercel Inc., 440 N Barranca Ave #4133,
              Covina, CA 91723, États-Unis — <Lien href="https://vercel.com">vercel.com</Lien>
            </li>
            <li>
              <strong className="text-foreground">Base de données (comptes, inscriptions, adhésions) :</strong> Supabase Inc. —{" "}
              <Lien href="https://supabase.com">supabase.com</Lien>. Les données sont hébergées dans l'Union européenne
              (Irlande).
            </li>
          </ul>
        </Rubrique>

        <Rubrique titre="4. Propriété intellectuelle">
          <p>
            Les textes, le logo et les photographies des fondatrices sont la propriété de l'association. Certaines
            photographies d'illustration proviennent de la banque d'images libres de droits{" "}
            <Lien href="https://www.pexels.com/license/">Pexels</Lien>. Toute reproduction, totale ou partielle, du
            contenu du site sans l'autorisation écrite de l'association est interdite.
          </p>
        </Rubrique>

        <Rubrique titre="5. Données personnelles et cookies">
          <p>
            Le traitement de vos données (pré-inscriptions, adhésion, consentement photo, messages) et vos droits
            d'accès, de rectification et de suppression sont décrits dans notre{" "}
            <Link to="/confidentialite" className="text-terracotta underline underline-offset-2">
              politique de confidentialité
            </Link>
            . Vous pouvez aussi nous écrire à <Mail />.
          </p>
        </Rubrique>

        <Rubrique titre="6. Responsabilité">
          <p>
            L'association s'efforce de fournir des informations exactes et à jour, sans pouvoir garantir qu'elles soient
            exhaustives. Elle ne saurait être tenue responsable du contenu des sites externes vers lesquels le site
            renvoie.
          </p>
        </Rubrique>

        <Rubrique titre="7. Droit applicable">
          <p>
            Les présentes mentions sont soumises au droit français. Voir aussi nos{" "}
            <Link to="/cgu" className="text-terracotta underline underline-offset-2">
              conditions générales d'utilisation
            </Link>
            .
          </p>
        </Rubrique>
      </div>
    </main>

    <Footer />
  </div>
);

export default MentionsLegales;
