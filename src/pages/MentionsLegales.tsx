import { Link } from "react-router-dom";
import Footer from "@/components/Footer";

const MentionsLegales = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto flex flex-col items-center py-6 px-6 relative">
          <Link to="/" className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-[0.08em] uppercase leading-tight text-center">
            Cocooning Club
          </Link>
          <div className="flex gap-8 mt-4 font-body text-sm tracking-[0.12em] uppercase text-foreground/80">
            <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
            <Link to="/calendrier" className="hover:text-primary transition-colors">Calendrier</Link>
            <Link to="/connexion" className="hover:text-primary transition-colors">Connexion</Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-12">
          Mentions légales
        </h1>

        <div className="space-y-10 text-sm text-foreground/80 leading-relaxed">

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Éditeur du site</h2>
            <p>
              <strong>Cocooning Club</strong><br />
              Association loi 1901<br />
              Siège social : Gagny, 93220 – Île-de-France<br />
              Antennes : Chelles (77500) et Le Raincy (93340)<br />
              Email : <a href="mailto:hello@cocooningclub.fr" className="text-primary hover:underline">hello@cocooningclub.fr</a><br />
              Téléphone : 01 23 45 67 89
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Hébergement</h2>
            <p>
              Ce site est hébergé par <strong>Supabase Inc.</strong><br />
              970 Toa Payoh North, #07-04, Singapore 318992<br />
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://supabase.com</a>
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu de ce site (textes, images, logos, icônes) est la propriété exclusive de Cocooning Club,
              sauf mention contraire. Toute reproduction, distribution ou utilisation sans autorisation préalable est interdite.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Protection des données personnelles</h2>
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés,
              vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données personnelles.
            </p>
            <p className="mt-2">
              Les données collectées (nom, prénom, email, téléphone) sont utilisées exclusivement dans le cadre de la gestion
              des adhésions et des réservations d'ateliers. Elles ne sont ni vendues ni cédées à des tiers.
            </p>
            <p className="mt-2">
              Pour exercer vos droits, contactez-nous à :{" "}
              <a href="mailto:hello@cocooningclub.fr" className="text-primary hover:underline">hello@cocooningclub.fr</a>
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Cookies</h2>
            <p>
              Ce site utilise des cookies techniques strictement nécessaires au fonctionnement de l'authentification.
              Aucun cookie de traçage publicitaire n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Responsabilité</h2>
            <p>
              Cocooning Club s'efforce de maintenir les informations de ce site à jour et exactes. Cependant, l'association
              ne saurait être tenue responsable des erreurs ou omissions présentes sur le site, ni des dommages directs ou
              indirects résultant de l'utilisation des informations publiées.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">Droit applicable</h2>
            <p>
              Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français
              seront seuls compétents.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MentionsLegales;
