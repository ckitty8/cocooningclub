import { Link } from "react-router-dom";
import { Heart, Instagram, Mail } from "lucide-react";
import { ouvrirChoixCookies } from "@/lib/consentement";

const Footer = () => {
  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto px-6 py-10 md:py-16">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 mb-8 md:mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3 font-brand text-2xl text-terracotta">
              <img src="/logo-160.webp" alt="" width={56} height={56} className="h-14 w-14 shrink-0" loading="lazy" />
              Le Cocooning Club
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Papotages, ateliers créatifs et business : des rendez-vous pour déconnecter, échanger et grandir ensemble dans une ambiance douce et bienveillante.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Fait avec</span>
              <Heart className="w-3 h-3 text-terracotta fill-primary" />
              <span>en Seine-Saint-Denis</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h4 className="text-2xl md:text-3xl font-display font-bold text-foreground">Navigation</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/notre-histoire" className="hover:text-terracotta transition-colors">Notre histoire</Link>
              </li>
              <li>
                <Link to="/#ateliers" className="hover:text-terracotta transition-colors">Nos Ateliers</Link>
              </li>
              <li>
                <Link to="/calendrier" className="hover:text-terracotta transition-colors">Calendrier</Link>
              </li>
              <li>
                <Link to="/#contact" className="hover:text-terracotta transition-colors">Contact</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-terracotta transition-colors">Espace Membre</Link>
              </li>
            </ul>
          </div>

          {/* Contact & Réseaux */}
          <div className="space-y-4">
            <h4 className="text-2xl md:text-3xl font-display font-bold text-foreground">Nous suivre</h4>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/cocooningclub?igsh=d2xkcWYxM3B6YTJo"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-terracotta hover:border-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="mailto:le.cocooning.club@gmail.com"
                className="w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-terracotta hover:border-primary transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              <a href="mailto:le.cocooning.club@gmail.com" className="hover:text-terracotta transition-colors">
                le.cocooning.club@gmail.com
              </a>
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 Cocooning Club · Tous droits réservés</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <button type="button" onClick={ouvrirChoixCookies} className="inline-block py-1 hover:text-terracotta transition-colors">
              Gérer mes cookies
            </button>
            <Link to="/mentions-legales" className="inline-block py-1 hover:text-terracotta transition-colors">
              Mentions légales
            </Link>
            <Link to="/cgu" className="inline-block py-1 hover:text-terracotta transition-colors">
              CGU
            </Link>
            <Link to="/confidentialite" className="inline-block py-1 hover:text-terracotta transition-colors">
              Paramètres de confidentialité
            </Link>
            <p>Gagny · Chelles · Le Raincy</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
