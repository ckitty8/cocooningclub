import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, CalendarDays, FileText,
  FormInput, LogOut, Menu, ChevronRight, UserCheck, MessageSquare, CalendarClock, Lightbulb, Star
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard",          label: "Tableau de bord",         icon: LayoutDashboard },
  { href: "/admin/membres",            label: "Membres",                  icon: Users },
  { href: "/admin/ateliers",           label: "Ateliers",                 icon: CalendarDays },
  { href: "/admin/pre-inscriptions",   label: "Pré-inscriptions",         icon: UserCheck, badgeKey: "preinscriptions" as const },
  { href: "/admin/disponibilites",     label: "Disponibilités",           icon: CalendarClock },
  { href: "/admin/boite-a-idees",      label: "Boîte à idées",            icon: Lightbulb, badgeKey: "idees" as const },
  { href: "/admin/avis",               label: "Témoignages",              icon: Star, badgeKey: "avis" as const },
  { href: "/admin/documents",          label: "Documents",                icon: FileText },
  { href: "/admin/formulaire",         label: "Formulaire de contact",    icon: FormInput },
  { href: "/admin/messages-templates", label: "Modèles de messages",      icon: MessageSquare },
];

const ideesLastSeenKey = (id: string | undefined) => `admin.idees.lastSeen.${id ?? "anon"}`;

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ideesNouvelles, setIdeesNouvelles] = useState(0);
  const [preInscEnAttente, setPreInscEnAttente] = useState(0);
  const [avisEnAttente, setAvisEnAttente] = useState(0);

  // Compte des idées créées depuis la dernière visite de la boîte à idées.
  // Réévalué à chaque changement de route pour prendre en compte le passage
  // sur /admin/boite-a-idees qui met à jour la date de dernière visite.
  useEffect(() => {
    if (!profile?.id) return;
    const since = localStorage.getItem(ideesLastSeenKey(profile.id)) ?? "1970-01-01T00:00:00Z";
    let cancelled = false;
    supabase
      .from("idees")
      .select("id", { count: "exact", head: true })
      .gt("cree_le", since)
      .then(({ count }) => {
        if (!cancelled) setIdeesNouvelles(count ?? 0);
      });
    return () => { cancelled = true; };
  }, [profile?.id, location.pathname]);

  // Compte des pré-inscriptions en attente de validation. Pas de
  // localStorage : c'est un backlog, la pastille reste tant qu'il
  // reste des inscriptions à traiter.
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    supabase
      .from("inscriptions")
      .select("id", { count: "exact", head: true })
      .eq("statut", "en_attente")
      .then(({ count }) => {
        if (!cancelled) setPreInscEnAttente(count ?? 0);
      });
    return () => { cancelled = true; };
  }, [profile?.id, location.pathname]);

  // Compte des avis en attente de modération.
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    supabase
      .from("avis")
      .select("id", { count: "exact", head: true })
      .eq("moderation", "en_attente")
      .then(({ count }) => {
        if (!cancelled) setAvisEnAttente(count ?? 0);
      });
    return () => { cancelled = true; };
  }, [profile?.id, location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <Link to="/" className="font-display text-xl font-bold tracking-[0.08em] uppercase text-foreground hover:opacity-80 transition-opacity">
          Cocooning Club
        </Link>
        <p className="text-xs text-muted-foreground mt-1 tracking-wide uppercase">Administration</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, badgeKey }) => {
          const active = location.pathname === href;
          const badgeCount =
            badgeKey === "idees" ? ideesNouvelles :
            badgeKey === "preinscriptions" ? preInscEnAttente :
            badgeKey === "avis" ? avisEnAttente :
            0;
          return (
            <Link
              key={href}
              to={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badgeCount > 0 && (
                <span className={`text-[11px] font-semibold rounded-full px-1.5 min-w-[20px] h-5 flex items-center justify-center ${
                  active ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                }`}>
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
              {active && <ChevronRight className="w-3 h-3 opacity-70" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Link
          to="/admin/mon-compte"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl hover:bg-muted transition-colors"
          title="Modifier mon compte"
        >
          {profile?.url_avatar ? (
            <img
              src={profile.url_avatar}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {(profile?.prenom?.[0] ?? profile?.email?.[0] ?? "A").toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.prenom && profile?.nom ? `${profile.prenom} ${profile.nom}` : profile?.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r shrink-0 fixed h-full z-30">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-card border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-muted">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-bold tracking-[0.08em] uppercase text-sm">Cocooning Club</span>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
