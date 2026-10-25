import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Surtitre } from "@/components/vitrine";
import photoAtelier from "@/assets/hero-workshop-960.webp";

interface AuthLayoutProps {
  titre: string;
  sousTitre?: string;
  /** Lien affiché sous la carte (par défaut : retour au site). */
  retour?: { to: string; libelle: string };
  children: ReactNode;
}

// Mise en page des pages de connexion (connexion, mot de passe oublié,
// nouveau mot de passe) : photo à gauche sur grand écran, carte à droite.
const AuthLayout = ({ titre, sousTitre, retour = { to: "/", libelle: "Retour au site" }, children }: AuthLayoutProps) => (
  <div className="theme-vitrine grid min-h-screen bg-background text-foreground lg:grid-cols-2">
    <div className="relative hidden lg:block">
      <img
        src={photoAtelier}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>

    <main className="flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-3 font-brand text-2xl text-terracotta">
          <img src="/logo-160.webp" alt="" width={56} height={56} className="h-14 w-14" />
          Le Cocooning Club
        </Link>
        <div className="mb-8 mt-10 space-y-3">
          <Surtitre>Espace membre</Surtitre>
          <h1 className="font-display text-5xl leading-tight text-foreground md:text-6xl">{titre}</h1>
          <span className="block h-0.5 w-10 bg-primary" aria-hidden="true" />
          {sousTitre && <p className="text-sm leading-relaxed text-muted-foreground">{sousTitre}</p>}
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-[0_12px_32px_-24px_rgba(99,59,50,0.45)]">
          {children}
        </div>

        <Link
          to={retour.to}
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-terracotta"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {retour.libelle}
        </Link>
      </div>
    </main>
  </div>
);

export default AuthLayout;
