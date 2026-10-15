import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

const CONTACT_EMAIL = "le.cocooning.club@gmail.com";

const Mail = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-2">
    {CONTACT_EMAIL}
  </a>
);

const Cgu = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-10 md:py-16 max-w-3xl">
        <h1 className="font-brand text-3xl md:text-4xl font-bold text-foreground tracking-[0.04em] mb-2">
          Conditions générales d'utilisation
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : 15 octobre 2026</p>

        <div className="space-y-8 text-sm md:text-base text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">1. Objet</h2>
            <p>
              Les présentes conditions générales d'utilisation (CGU) encadrent l'utilisation du site
              lecocooningclub.fr, édité par l'association Cocooning Club. Le site permet de découvrir les ateliers
              du club (Papotages, Créatifs et Business), de s'y pré-inscrire, de nous contacter et, pour les
              membres, d'accéder à un espace personnel.
            </p>
            <p>
              Utiliser le site, envoyer une pré-inscription ou se connecter à l'espace membre implique
              l'acceptation des présentes CGU.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">2. Accès au site</h2>
            <p>
              Le site est accessible gratuitement à toute personne disposant d'un accès à internet. Les frais
              de connexion restent à la charge de l'utilisatrice ou de l'utilisateur. Nous nous efforçons de
              maintenir le site accessible en permanence, mais il peut être interrompu, notamment pour
              maintenance, sans que cela n'ouvre droit à indemnisation.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">3. Pré-inscription aux ateliers</h2>
            <p>
              Le formulaire de pré-inscription permet de signaler votre souhait de participer à un atelier.
              Une pré-inscription ne vaut pas inscription définitive : elle est confirmée par le club, dans la
              limite des places disponibles et avant la date limite d'inscription indiquée pour chaque atelier.
            </p>
            <p>
              Vous vous engagez à fournir des informations exactes (nom, email, téléphone et, pour certains
              ateliers, date de naissance) et à les mettre à jour si elles changent.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">4. Tarifs et paiement</h2>
            <p>
              Le tarif de chaque atelier est indiqué sur sa fiche. Lorsqu'un atelier est payant, le paiement
              s'effectue en ligne via PayPal à l'aide du lien communiqué par le club ; l'inscription est
              définitive à réception du paiement. Le club ne collecte ni ne conserve vos coordonnées bancaires :
              le paiement est entièrement traité par PayPal, selon ses propres conditions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">5. Annulation</h2>
            <p>
              <span className="text-foreground font-medium">De votre part :</span> vous pouvez annuler une
              inscription depuis votre espace membre ou en nous écrivant à <Mail />. Merci de nous prévenir le
              plus tôt possible afin de libérer la place pour une autre personne. Toute demande de
              remboursement est étudiée au cas par cas.
            </p>
            <p>
              <span className="text-foreground font-medium">De la part du club :</span> si un atelier est
              annulé par le club (nombre de participantes insuffisant, empêchement de l'intervenante, cas de
              force majeure…), les personnes inscrites sont prévenues et les sommes versées pour cet atelier
              sont intégralement remboursées.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">6. Espace membre</h2>
            <p>
              Les comptes de l'espace membre sont créés par le club. Vos identifiants sont personnels et
              confidentiels : vous êtes responsable de leur conservation et de l'usage qui en est fait. En cas
              de doute sur la sécurité de votre compte, modifiez votre mot de passe et prévenez-nous.
            </p>
            <p>
              Vous pouvez demander la fermeture de votre compte à tout moment en écrivant à <Mail />. Le club
              peut suspendre ou fermer un compte en cas de non-respect des présentes CGU.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">7. Avis et boîte à idées</h2>
            <p>
              Les membres peuvent laisser un avis sur les ateliers auxquels elles ont participé et proposer des
              idées via la boîte à idées. Les avis sont relus par le club avant toute publication sur le site ;
              les idées ne sont visibles que par leur autrice et les administratrices.
            </p>
            <p>
              Chacune s'engage à rester courtoise et bienveillante, et à ne publier aucun contenu injurieux,
              discriminatoire, diffamatoire, publicitaire ou contraire à la loi. Le club se réserve le droit de
              ne pas publier ou de supprimer tout contenu qui ne respecterait pas ces règles.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">8. Propriété intellectuelle</h2>
            <p>
              Les textes, photos, logos, visuels et documents du site (dont ceux du magazine de l'espace membre)
              appartiennent au Cocooning Club ou à leurs auteurs. Toute reproduction ou diffusion, totale ou
              partielle, sans autorisation écrite préalable est interdite. Les documents mis à disposition des
              membres sont réservés à un usage personnel.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">9. Responsabilité</h2>
            <p>
              Le club veille à l'exactitude des informations publiées (dates, lieux, tarifs) mais ne peut
              garantir l'absence d'erreur ; en cas de doute, n'hésitez pas à nous contacter. Les liens vers des
              sites extérieurs (PayPal, Google Maps, Instagram…) sont fournis pour votre confort : le club n'est
              pas responsable de leur contenu.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">10. Données personnelles</h2>
            <p>
              Le traitement de vos données personnelles est décrit dans notre{" "}
              <Link to="/confidentialite" className="text-primary underline underline-offset-2">
                politique de confidentialité
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">11. Modification des CGU</h2>
            <p>
              Le club peut faire évoluer les présentes CGU ; la version applicable est celle en ligne au moment
              de votre visite. La date de dernière mise à jour figure en haut de cette page.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">12. Droit applicable et contact</h2>
            <p>
              Les présentes CGU sont soumises au droit français. En cas de difficulté, nous vous invitons à
              nous écrire à <Mail /> afin de trouver une solution à l'amiable avant toute autre démarche.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cgu;
