import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Home, Mail } from "lucide-react";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

const NotFound = () => {
  const { pathname } = useLocation();

  return (
    <div className="theme-creme flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="container mx-auto max-w-2xl flex-1 px-6 pb-16 pt-32 text-center md:pb-24 md:pt-40">
        <img
          src="/logo-160.webp"
          alt="Logo Cocooning Club"
          width={80}
          height={80}
          className="mx-auto mb-6 w-20 h-auto"
        />
        <p className="mb-4 font-brand text-6xl text-terracotta md:text-7xl">404</p>
        <h1 className="mb-6 font-brand text-3xl text-foreground md:text-5xl">
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
