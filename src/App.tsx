import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
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
import Messages from "./pages/admin/Messages.tsx";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
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
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<Index />} />
            <Route path="/calendrier" element={<Calendrier />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Espace membre (à développer plus tard) */}
            <Route path="/espace-membre" element={<Login />} />

            {/* Routes admin protégées */}
            <Route path="/admin/dashboard"  element={<RoleGuard allowedRoles={["admin"]}><Dashboard /></RoleGuard>} />
            <Route path="/admin/membres"    element={<RoleGuard allowedRoles={["admin"]}><Membres /></RoleGuard>} />
            <Route path="/admin/ateliers"   element={<RoleGuard allowedRoles={["admin"]}><AteliersAdmin /></RoleGuard>} />
            <Route path="/admin/documents"  element={<RoleGuard allowedRoles={["admin"]}><Documents /></RoleGuard>} />
            <Route path="/admin/formulaire" element={<RoleGuard allowedRoles={["admin"]}><Formulaire /></RoleGuard>} />
            <Route path="/admin/messages"   element={<RoleGuard allowedRoles={["admin"]}><Messages /></RoleGuard>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
