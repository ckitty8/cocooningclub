import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { appliquerChoix, suivrePage } from "@/lib/analytics";
import { enregistrerChoix, lireChoix, surDemandeOuverture } from "@/lib/consentement";

// Pages d'espace connecté : jamais envoyées à Google Analytics.
const PRIVEES = ["/admin", "/espace-membre", "/login", "/forgot-password", "/reset-password"];

const boutonChoix =
  "min-h-10 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90";

/**
 * Bannière de consentement à la mesure d'audience (Google Analytics + comptage interne).
 * « Tout refuser » et « Tout accepter » ont le même poids visuel. Le choix dure 6 mois ; le lien
 * « Gérer mes cookies » du pied de page rouvre la bannière.
 */
const CookieBanner = () => {
  const { pathname } = useLocation();
  const [ouverte, setOuverte] = useState(() => lireChoix() === null);
  const [personnaliser, setPersonnaliser] = useState(false);
  const [audience, setAudience] = useState(() => lireChoix()?.audience ?? false);

  // Choix déjà fait lors d'une visite précédente : on le réapplique au chargement.
  useEffect(() => {
    const choix = lireChoix();
    if (choix) appliquerChoix(choix.audience);
  }, []);

  useEffect(
    () =>
      surDemandeOuverture(() => {
        setAudience(lireChoix()?.audience ?? false);
        setPersonnaliser(true);
        setOuverte(true);
      }),
    [],
  );

  // Pages vues Google Analytics à chaque changement de page publique.
  useEffect(() => {
    if (!PRIVEES.some(p => pathname.startsWith(p))) suivrePage(pathname);
  }, [pathname]);

  const choisir = (valeur: boolean) => {
    enregistrerChoix(valeur);
    appliquerChoix(valeur);
    if (valeur && !PRIVEES.some(p => pathname.startsWith(p))) suivrePage(pathname);
    setOuverte(false);
    setPersonnaliser(false);
  };

  if (!ouverte) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookies et mesure d'audience"
      className="theme-vitrine fixed inset-x-4 bottom-4 z-50 rounded-2xl border bg-card p-5 text-foreground shadow-xl md:max-w-md"
    >
      <h2 className="font-brand text-lg text-foreground">Cookies et mesure d'audience</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Avec votre accord, nous mesurons la fréquentation du site (Google Analytics et un comptage interne) pour
        l'améliorer. Rien n'est mesuré avant votre choix, que vous pouvez changer à tout moment.{" "}
        <Link to="/confidentialite" className="text-terracotta underline underline-offset-2">
          En savoir plus
        </Link>
      </p>

      {personnaliser && (
        <label className="mt-3 flex items-start gap-3 rounded-xl border bg-background p-3 text-sm">
          <input
            type="checkbox"
            checked={audience}
            onChange={e => setAudience(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
          />
          <span>
            <span className="font-medium text-foreground">Mesure d'audience</span>
            <span className="block text-muted-foreground">Pages vues, provenance et type d'appareil, de façon statistique.</span>
          </span>
        </label>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => choisir(false)} className={boutonChoix}>
          Tout refuser
        </button>
        <button type="button" onClick={() => choisir(true)} className={boutonChoix}>
          Tout accepter
        </button>
        {personnaliser ? (
          <button type="button" onClick={() => choisir(audience)} className="min-h-10 px-2 text-sm text-terracotta underline underline-offset-2">
            Enregistrer mon choix
          </button>
        ) : (
          <button type="button" onClick={() => setPersonnaliser(true)} className="min-h-10 px-2 text-sm text-terracotta underline underline-offset-2">
            Personnaliser
          </button>
        )}
      </div>
    </div>
  );
};

export default CookieBanner;
