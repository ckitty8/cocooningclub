import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Coordonnées */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold">Cocooning Club</h3>
            <div className="space-y-2 text-sm text-background/70">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>Gagny, Chelles, Le Raincy</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a href="mailto:hello@cocooningclub.fr" className="hover:text-background transition-colors">
                  hello@cocooningclub.fr
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>01 23 45 67 89</span>
              </div>
            </div>
          </div>

          {/* Liens */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold">Liens rapides</h3>
            <div className="flex flex-col gap-2 text-sm text-background/70">
              <Link to="/" className="hover:text-background transition-colors">Accueil</Link>
              <Link to="/calendrier" className="hover:text-background transition-colors">Calendrier</Link>
              <Link to="/connexion" className="hover:text-background transition-colors">Connexion</Link>
            </div>
          </div>

          {/* Mentions légales */}
          <div className="space-y-4">
            <h3 className="font-display text-xl font-semibold">Informations</h3>
            <div className="flex flex-col gap-2 text-sm text-background/70">
              <Link to="/mentions-legales" className="hover:text-background transition-colors">Mentions légales</Link>
              <p className="mt-4 text-xs text-background/50">
                Ateliers créatifs en Île-de-France. Tous niveaux bienvenus.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 text-center text-sm text-background/50">
          © 2026 Cocooning Club · Tous droits réservés
        </div>
      </div>
    </footer>
  );
};

export default Footer;
