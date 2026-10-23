import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const LIENS = [
  { libelle: "Accueil", to: "/" },
  { libelle: "Nos espaces", to: "/#espaces" },
  { libelle: "Nos événements", to: "/calendrier" },
  { libelle: "À propos", to: "/notre-histoire" },
  { libelle: "Contact", to: "/#contact" },
] as const;

export type LienActif = (typeof LIENS)[number]["libelle"];

interface SiteHeaderProps {
  /** Lien mis en avant comme page courante (aucun pour les pages hors menu). */
  actif?: LienActif;
}

// En-tête fixe des pages vitrine et du calendrier. Sous 768 px,
// les liens passent dans un menu déroulant.
const SiteHeader = ({ actif }: SiteHeaderProps) => {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const fermerMenu = () => setMenuOuvert(false);

  const lien = (libelle: LienActif, to: string, classes: string) => (
    <Link
      key={libelle}
      to={to}
      onClick={fermerMenu}
      aria-current={libelle === actif ? "page" : undefined}
      className={`${classes} transition-colors hover:text-primary ${
        libelle === actif ? "text-primary" : "text-foreground/80"
      }`}
    >
      {libelle}
    </Link>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/95 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        <Link to="/" onClick={fermerMenu} className="flex items-center gap-3 font-brand text-2xl text-primary md:text-[1.7rem]">
          <img src="/logo-160.webp" alt="" width={64} height={64} className="h-16 w-16" />
          Le Cocooning Club
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 text-sm md:flex">
          {LIENS.map(({ libelle, to }) =>
            lien(libelle, to, `border-b py-1 ${libelle === actif ? "border-primary" : "border-transparent"}`),
          )}
          <Link
            to="/login"
            className="rounded-full border border-foreground/30 px-4 py-1.5 text-foreground/80 transition-colors hover:border-primary hover:text-primary"
          >
            Espace membre
          </Link>
        </nav>

        <button
          onClick={() => setMenuOuvert(o => !o)}
          aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOuvert}
          aria-controls="menu-mobile"
          className="-mr-2 flex h-11 w-11 items-center justify-center text-foreground md:hidden"
        >
          {menuOuvert ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOuvert && (
        <nav id="menu-mobile" aria-label="Navigation principale" className="border-t px-6 pb-4 md:hidden">
          {LIENS.map(({ libelle, to }) => lien(libelle, to, "flex min-h-11 items-center"))}
          <Link to="/login" onClick={fermerMenu} className="flex min-h-11 items-center text-foreground/80 hover:text-primary">
            Espace membre
          </Link>
        </nav>
      )}
    </header>
  );
};

export default SiteHeader;
