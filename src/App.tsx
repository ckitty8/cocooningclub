import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import Index from "./pages/Index.tsx";
import Calendrier from "./pages/Calendrier.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/auth/Login.tsx";
import ForgotPassword from "./pages/auth/ForgotPassword.tsx";
import ResetPassword from "./pages/auth/ResetPassword.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import Membres from "./pages/admin/Membres.tsx";
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
import MembrePremiumLayout from "@/components/membre-premium/MembrePremiumLayout";


const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <RecoveryRedirect />
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<Index />} />
            <Route path="/calendrier" element={<Calendrier />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Espace membre standard */}
            <Route path="/espace-membre"               element={<RoleGuard allowedRoles={["inscrit", "membre", "administrateur"]}><MembreDashboard /></RoleGuard>} />
            <Route path="/espace-membre/ateliers"      element={<RoleGuard allowedRoles={["inscrit", "membre", "administrateur"]}><MembreAteliers /></RoleGuard>} />
            <Route path="/espace-membre/inscriptions"  element={<RoleGuard allowedRoles={["inscrit", "membre", "administrateur"]}><MembreInscriptions /></RoleGuard>} />
            <Route path="/espace-membre/magazine"      element={<RoleGuard allowedRoles={["inscrit", "membre", "administrateur"]}><MembreMagazine /></RoleGuard>} />
            <Route path="/espace-membre/mon-compte"    element={<RoleGuard allowedRoles={["inscrit", "membre", "administrateur"]}><MembreMonCompte /></RoleGuard>} />

            {/* Espace membre premium — réutilise les pages membre/ avec le layout premium */}
            <Route path="/espace-membre-premium"               element={<RoleGuard allowedRoles={["membre_premium", "administrateur"]}><MembreDashboard Layout={MembrePremiumLayout} basePath="/espace-membre-premium" /></RoleGuard>} />
            <Route path="/espace-membre-premium/ateliers"      element={<RoleGuard allowedRoles={["membre_premium", "administrateur"]}><MembreAteliers Layout={MembrePremiumLayout} /></RoleGuard>} />
            <Route path="/espace-membre-premium/inscriptions"  element={<RoleGuard allowedRoles={["membre_premium", "administrateur"]}><MembreInscriptions Layout={MembrePremiumLayout} /></RoleGuard>} />
            <Route path="/espace-membre-premium/magazine"      element={<RoleGuard allowedRoles={["membre_premium", "administrateur"]}><MembreMagazine Layout={MembrePremiumLayout} /></RoleGuard>} />
            <Route path="/espace-membre-premium/mon-compte"    element={<RoleGuard allowedRoles={["membre_premium", "administrateur"]}><MembreMonCompte Layout={MembrePremiumLayout} /></RoleGuard>} />

            {/* Routes admin protégées */}
            <Route path="/admin/dashboard"         element={<RoleGuard allowedRoles={["administrateur"]}><Dashboard /></RoleGuard>} />
            <Route path="/admin/membres"           element={<RoleGuard allowedRoles={["administrateur"]}><Membres /></RoleGuard>} />
            <Route path="/admin/ateliers"          element={<RoleGuard allowedRoles={["administrateur"]}><AteliersAdmin /></RoleGuard>} />
            <Route path="/admin/pre-inscriptions"  element={<RoleGuard allowedRoles={["administrateur"]}><PreInscriptions /></RoleGuard>} />
            <Route path="/admin/documents"         element={<RoleGuard allowedRoles={["administrateur"]}><Documents /></RoleGuard>} />
            <Route path="/admin/formulaire"        element={<RoleGuard allowedRoles={["administrateur"]}><Formulaire /></RoleGuard>} />
            <Route path="/admin/messages-templates" element={<RoleGuard allowedRoles={["administrateur"]}><TemplatesMessages /></RoleGuard>} />
            <Route path="/admin/disponibilites"     element={<RoleGuard allowedRoles={["administrateur"]}><Disponibilites /></RoleGuard>} />
            <Route path="/admin/boite-a-idees"      element={<RoleGuard allowedRoles={["administrateur"]}><BoiteAIdees /></RoleGuard>} />
            <Route path="/admin/avis"               element={<RoleGuard allowedRoles={["administrateur"]}><AvisAdmin /></RoleGuard>} />
            <Route path="/admin/mon-compte"         element={<RoleGuard allowedRoles={["administrateur"]}><MonCompte /></RoleGuard>} />


            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
