import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";

// Briques de mise en page partagées par les pages vitrine (accueil, notre
// histoire), sur le thème crème `.theme-creme`.

/** Petit intitulé en capitales au-dessus des titres de section. */
export const Surtitre = ({ children }: { children: ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">{children}</p>
);

/** Titre de section (serif, centré par défaut). */
export const TitreSection = ({ children, className = "text-center" }: { children: ReactNode; className?: string }) => (
  <h2 className={`font-brand text-3xl leading-tight text-foreground md:text-5xl ${className}`}>{children}</h2>
);

interface BoutonProps {
  to: string;
  children: ReactNode;
  /** "plein" : terracotta ; "contour" : bordure seule. */
  variante?: "plein" | "contour";
}

/** Lien en forme de bouton, suivi d'une flèche. */
export const Bouton = ({ to, children, variante = "plein" }: BoutonProps) => (
  <Link
    to={to}
    className={`inline-flex min-h-11 items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-colors ${
      variante === "plein"
        ? "bg-primary text-white hover:bg-primary/90"
        : "border border-foreground/30 text-foreground hover:border-primary hover:text-primary"
    }`}
  >
    {children}
    <ArrowRight className="h-4 w-4" aria-hidden="true" />
  </Link>
);

export interface Valeur {
  icone: LucideIcon;
  titre: string;
  description: string;
}

/** Valeurs du club : pictogramme rond, titre et phrase courte. */
export const GrilleValeurs = ({ valeurs }: { valeurs: Valeur[] }) => (
  <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
    {valeurs.map(({ icone: Icone, titre, description }) => (
      <div key={titre} className="mx-auto max-w-xs space-y-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-card text-terracotta">
          <Icone className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h3 className="font-brand text-xl text-foreground">{titre}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    ))}
  </div>
);
