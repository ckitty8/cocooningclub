import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import RouteSeo from "@/components/RouteSeo";
import Index from "./pages/Index.tsx";
import Calendrier from "./pages/Calendrier.tsx";
import Confidentialite from "./pages/Confidentialite.tsx";
import Cgu from "./pages/Cgu.tsx";
import NotreHistoire from "./pages/NotreHistoire.tsx";
import Simulateur from "./pages/createur/Simulateur.tsx";
import MatriceRoles from "./pages/createur/MatriceRoles.tsx";
import SimulationBanner from "@/components/SimulationBanner";
import { ACCES } from "@/lib/roles";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/auth/Login.tsx";
import ForgotPassword from "./pages/auth/ForgotPassword.tsx";
import ResetPassword from "./pages/auth/ResetPassword.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import Membres from "./pages/admin/Membres.tsx";
import Offre from "./pages/admin/Offre.tsx";
import AteliersAdmin from "./pages/admin/Ateliers.tsx";
import Documents from "./pages/admin/Documents.tsx";
import Formulaire from "./pages/admin/Formulaire.tsx";
import PreInscriptions from "./pages/admin/PreInscriptions.tsx";
import TemplatesMessages from "./pages/admin/TemplatesMessages.tsx";
import Disponibilites from "./pages/admin/Disponibilites.tsx";
import BoiteAIdees from "./pages/admin/BoiteAIdees.tsx";
import MonCompte from "./pages/admin/MonCompte.tsx";
import AvisAdmin from "./pages/admin/Avis.tsx";
import MembreDashboard from "./pages/membre/Dashboard.tsx";
import MembreAteliers from "./pages/membre/Ateliers.tsx";
import MembreInscriptions from "./pages/membre/Inscriptions.tsx";
import MembreMagazine from "./pages/membre/Magazine.tsx";
import MembreMonCompte from "./pages/membre/MonCompte.tsx";
import MembreBoiteAIdees from "./pages/membre/BoiteAIdees.tsx";


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

const App = () => (
  <>
    <Toaster />
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <RouteSeo />
        <RecoveryRedirect />
        <SimulationBanner />
        <Routes>
          {/* Routes publiques */}
          <Route path="/" element={<Index />} />
          <Route path="/calendrier" element={<Calendrier />} />
          <Route path="/notre-histoire" element={<NotreHistoire />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/cgu" element={<Cgu />} />

          {/* Espace membre */}
          <Route path="/espace-membre"               element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreDashboard /></RoleGuard>} />
          <Route path="/espace-membre/ateliers"      element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreAteliers /></RoleGuard>} />
          <Route path="/espace-membre/inscriptions"  element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreInscriptions /></RoleGuard>} />
          <Route path="/espace-membre/magazine"      element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreMagazine /></RoleGuard>} />
          <Route path="/espace-membre/mon-compte"    element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreMonCompte /></RoleGuard>} />
          <Route path="/espace-membre/boite-a-idees" element={<RoleGuard allowedRoles={ACCES.espaceMembre}><MembreBoiteAIdees /></RoleGuard>} />

          {/* Routes admin protégées */}
          <Route path="/admin/dashboard"         element={<RoleGuard allowedRoles={ACCES.admin}><Dashboard /></RoleGuard>} />
          <Route path="/admin/membres"           element={<RoleGuard allowedRoles={ACCES.admin}><Membres /></RoleGuard>} />
          <Route path="/admin/offre"             element={<RoleGuard allowedRoles={ACCES.admin}><Offre /></RoleGuard>} />
          <Route path="/admin/ateliers"          element={<RoleGuard allowedRoles={ACCES.admin}><AteliersAdmin /></RoleGuard>} />
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
          <Route path="/admin/createur/matrice"    element={<RoleGuard allowedRoles={ACCES.createur} reel><MatriceRoles /></RoleGuard>} />


          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </>
);

export default App;
