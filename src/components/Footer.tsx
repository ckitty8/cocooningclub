import { Heart, Instagram, Facebook, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto px-6 py-10 md:py-16">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 mb-8 md:mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="font-display text-2xl font-bold text-foreground tracking-[0.08em] uppercase">
              Cocooning Club
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Des ateliers créatifs pour déconnecter, créer et partager dans une ambiance douce et bienveillante.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Fait avec</span>
              <Heart className="w-3 h-3 text-primary fill-primary" />
              <span>en Seine-et-Marne</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.25em] uppercase text-foreground">Navigation</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="#apropos" className="hover:text-primary transition-colors">À propos</a>
              </li>
              <li>
                <a href="#ateliers" className="hover:text-primary transition-colors">Nos Ateliers</a>
              </li>
              <li>
                <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
              </li>
              <li>
                <a href="#contact" className="hover:text-primary transition-colors">Espace Membre</a>
              </li>
            </ul>
          </div>

          {/* Contact & Réseaux */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold tracking-[0.25em] uppercase text-foreground">Nous suivre</h4>
            <div className="flex gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="mailto:hello@cocooningclub.fr"
                className="w-9 h-9 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              <a href="mailto:hello@cocooningclub.fr" className="hover:text-primary transition-colors">
                hello@cocooningclub.fr
              </a>
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 Cocooning Club · Tous droits réservés</p>
          <p>Gagny · Chelles · Le Raincy</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
