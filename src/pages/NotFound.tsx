import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, CalendarDays, Home, Mail } from "lucide-react";
import Footer from "@/components/Footer";

const NotFound = () => {
  const { pathname } = useLocation();

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

      <main className="flex-1 container mx-auto px-6 py-16 md:py-24 max-w-2xl text-center">
        <img
          src="/logo-160.webp"
          alt="Logo Cocooning Club"
          width={80}
          height={80}
          className="mx-auto mb-6 w-20 h-auto"
        />
        <p className="font-brand text-6xl md:text-7xl font-bold text-primary mb-4">404</p>
        <h1 className="font-display text-4xl md:text-5xl text-foreground mb-6">
          Oups, cette page s'est envolée…
        </h1>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-2">
          La page que vous cherchez n'existe pas ou a changé d'adresse.
        </p>
        <p className="text-sm text-muted-foreground mb-10 break-all">
          Adresse demandée : <span className="font-medium text-foreground">{pathname}</span>
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" />
            Page d'accueil
          </Link>
          <Link
            to="/calendrier"
            className="inline-flex items-center justify-center gap-2 border border-foreground/30 text-foreground px-6 py-3 rounded-full font-medium text-sm hover:bg-foreground hover:text-background transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Prochains ateliers
          </Link>
          <Link
            to="/#contact"
            className="inline-flex items-center justify-center gap-2 border border-foreground/30 text-foreground px-6 py-3 rounded-full font-medium text-sm hover:bg-foreground hover:text-background transition-colors"
          >
            <Mail className="w-4 h-4" />
            Nous écrire
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
