import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import RouteSeo from "@/components/RouteSeo";
import CookieBanner from "@/components/CookieBanner";
import Index from "./pages/Index.tsx";
import SimulationBanner from "@/components/SimulationBanner";
import { ACCES } from "@/lib/roles";
import { rejouerFile } from "@/lib/preInscriptionSecours";
import NotFound from "./pages/NotFound.tsx";

// Pages chargées à la demande : un visiteur de l'accueil ne télécharge ni l'administration ni l'espace membre
// (poids du site = vitesse = référencement).
const Calendrier = lazy(() => import("./pages/Calendrier.tsx"));
const Inscription = lazy(() => import("./pages/Inscription.tsx"));
const Confidentialite = lazy(() => import("./pages/Confidentialite.tsx"));
const Cgu = lazy(() => import("./pages/Cgu.tsx"));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales.tsx"));
const NotreHistoire = lazy(() => import("./pages/NotreHistoire.tsx"));
const EspacePage = lazy(() => import("./pages/EspacePage.tsx"));
const Simulateur = lazy(() => import("./pages/createur/Simulateur.tsx"));
const DroitsParOffre = lazy(() => import("./pages/createur/DroitsParOffre.tsx"));
const MatriceRoles = lazy(() => import("./pages/createur/MatriceRoles.tsx"));
const CoutAtelier = lazy(() => import("./pages/createur/CoutAtelier.tsx"));
const Login = lazy(() => import("./pages/auth/Login.tsx"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword.tsx"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard.tsx"));
const Membres = lazy(() => import("./pages/admin/Membres.tsx"));
const Offre = lazy(() => import("./pages/admin/Offre.tsx"));
const FicheAtelier = lazy(() => import("./pages/admin/FicheAtelier.tsx"));
const AteliersAdmin = lazy(() => import("./pages/admin/Ateliers.tsx"));
const Documents = lazy(() => import("./pages/admin/Documents.tsx"));
const Formulaire = lazy(() => import("./pages/admin/Formulaire.tsx"));
const PreInscriptions = lazy(() => import("./pages/admin/PreInscriptions.tsx"));
const TemplatesMessages = lazy(() => import("./pages/admin/TemplatesMessages.tsx"));
const Disponibilites = lazy(() => import("./pages/admin/Disponibilites.tsx"));
const BoiteAIdees = lazy(() => import("./pages/admin/BoiteAIdees.tsx"));
const MonCompte = lazy(() => import("./pages/admin/MonCompte.tsx"));
const AvisAdmin = lazy(() => import("./pages/admin/Avis.tsx"));
const MembreDashboard = lazy(() => import("./pages/membre/Dashboard.tsx"));
const MembreAteliers = lazy(() => import("./pages/membre/Ateliers.tsx"));
const MembreInscriptions = lazy(() => import("./pages/membre/Inscriptions.tsx"));
const MembreMagazine = lazy(() => import("./pages/membre/Magazine.tsx"));
const MembreMonCompte = lazy(() => import("./pages/membre/MonCompte.tsx"));
const MembreBoiteAIdees = lazy(() => import("./pages/membre/BoiteAIdees.tsx"));
const MembreSignaler = lazy(() => import("./pages/membre/Signaler.tsx"));
const MembreMonAdhesion = lazy(() => import("./pages/membre/MonAdhesion.tsx"));


// Une ancre mal encodée (ex. « #100% ») ne doit pas faire planter la page.
const decoderAncre = (ancre: string) => {
  try {
    return decodeURIComponent(ancre);
  } catch {
    return ancre;
  }
};

// Remonte en haut à chaque changement de page, sauf si l'URL vise une ancre
// (ex. /#contact depuis le footer du calendrier) : on fait alors défiler
// jusqu'à la section. La section peut ne pas encore exister au premier rendu
// (contenu chargé depuis Supabase), d'où quelques nouvelles tentatives.
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    // Les fragments de Supabase (#access_token=...) ne sont pas des ancres.
    const id = hash.length > 1 && !hash.includes("=") ? decoderAncre(hash.slice(1)) : "";
    if (!id) {
      window.scrollTo(0, 0);
      return;
    }
    let tries = 0;
    let timer: number | undefined;
    const scrollToAnchor = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else if (tries++ < 20) {
        timer = window.setTimeout(scrollToAnchor, 100);
      }
    };
    scrollToAnchor();
    return () => window.clearTimeout(timer);
  }, [pathname, hash]);
  return null;
};

// Si Supabase redirige vers la racine avec un fragment de recovery (#access_token=...&type=recovery),
// on redirige vers /reset-password en conservant le fragment.
const RecoveryRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") && location.pathname !== "/reset-password") {
      navigate(`/reset-password${hash}`, { replace: true });
    }
  }, [location.pathname, navigate]);
  return null;
};

// Renvoie les pré-inscriptions gardées dans le navigateur quand le réseau ou le serveur était
// indisponible (voir src/lib/preInscriptionSecours.ts) : au chargement du site et au retour de la connexion.
const RenvoiPreInscriptions = () => {
  useEffect(() => {
    const renvoyer = () => { void rejouerFile(); };
    renvoyer();
    window.addEventListener("online", renvoyer);
    return () => window.removeEventListener("online", renvoyer);
  }, []);
  return null;
};

const App = () => (
  <>
    <Toaster />
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <RouteSeo />
        <RecoveryRedirect />
        <RenvoiPreInscriptions />
        <SimulationBanner />
        <CookieBanner />
        <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<Index />} />
          <Route path="/calendrier" element={<Calendrier />} />
          <Route path="/inscription/:id" element={<Inscription />} />
          <Route path="/notre-histoire" element={<NotreHistoire />} />
          <Route path="/papotages" element={<EspacePage slug="papotages" />} />
          <Route path="/creatifs" element={<EspacePage slug="creatifs" />} />
          <Route path="/business" element={<EspacePage slug="business" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/cgu" element={<Cgu />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />

          {/* Espace membre */}
          <Route path="/espace-membre"               element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreDashboard /></RoleGuard>} />
          <Route path="/espace-membre/ateliers"      element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreAteliers /></RoleGuard>} />
          <Route path="/espace-membre/inscriptions"  element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreInscriptions /></RoleGuard>} />
          <Route path="/espace-membre/magazine"      element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreMagazine /></RoleGuard>} />
          <Route path="/espace-membre/mon-adhesion"  element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreMonAdhesion /></RoleGuard>} />
          <Route path="/espace-membre/mon-compte"    element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreMonCompte /></RoleGuard>} />
          <Route path="/espace-membre/boite-a-idees" element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreBoiteAIdees /></RoleGuard>} />
          <Route path="/espace-membre/signaler" element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreSignaler /></RoleGuard>} />

          {/* Routes admin protégées */}
          <Route path="/admin/dashboard"         element={<RoleGuard allowedRoles={ACCES.admin}><Dashboard /></RoleGuard>} />
          <Route path="/admin/membres"           element={<RoleGuard allowedRoles={ACCES.admin}><Membres /></RoleGuard>} />
          <Route path="/admin/offre"             element={<RoleGuard allowedRoles={ACCES.admin}><Offre /></RoleGuard>} />
          <Route path="/admin/ateliers"          element={<RoleGuard allowedRoles={ACCES.admin}><AteliersAdmin /></RoleGuard>} />
          <Route path="/admin/ateliers/:id"      element={<RoleGuard allowedRoles={ACCES.admin}><FicheAtelier /></RoleGuard>} />
          <Route path="/admin/pre-inscriptions"  element={<RoleGuard allowedRoles={ACCES.admin}><PreInscriptions /></RoleGuard>} />
          <Route path="/admin/documents"         element={<RoleGuard allowedRoles={ACCES.admin}><Documents /></RoleGuard>} />
          <Route path="/admin/formulaire"        element={<RoleGuard allowedRoles={ACCES.admin}><Formulaire /></RoleGuard>} />
          <Route path="/admin/messages-templates" element={<RoleGuard allowedRoles={ACCES.admin}><TemplatesMessages /></RoleGuard>} />
          <Route path="/admin/disponibilites"     element={<RoleGuard allowedRoles={ACCES.admin}><Disponibilites /></RoleGuard>} />
          <Route path="/admin/boite-a-idees"      element={<RoleGuard allowedRoles={ACCES.admin}><BoiteAIdees /></RoleGuard>} />
          <Route path="/admin/avis"               element={<RoleGuard allowedRoles={ACCES.admin}><AvisAdmin /></RoleGuard>} />
          <Route path="/admin/mon-compte"         element={<RoleGuard allowedRoles={ACCES.admin}><MonCompte /></RoleGuard>} />

          {/* Outils du créateur : rôle réel testé, pour rester accessibles pendant une simulation */}
          <Route path="/admin/createur/simulateur" element={<RoleGuard allowedRoles={ACCES.createur} reel><Simulateur /></RoleGuard>} />
          <Route path="/admin/createur/droits"     element={<RoleGuard allowedRoles={ACCES.createur} reel><DroitsParOffre /></RoleGuard>} />
          <Route path="/admin/createur/matrice"    element={<RoleGuard allowedRoles={ACCES.createur} reel><MatriceRoles /></RoleGuard>} />
          <Route path="/admin/createur/cout-atelier" element={<RoleGuard allowedRoles={ACCES.createur} reel><CoutAtelier /></RoleGuard>} />


          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </>
);

export default App;
