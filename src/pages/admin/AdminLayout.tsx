import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, Users, CalendarDays, ClipboardList, LogOut } from "lucide-react";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/membres", label: "Membres", icon: Users },
  { to: "/admin/ateliers", label: "Ateliers", icon: CalendarDays },
  { to: "/admin/reservations", label: "Réservations", icon: ClipboardList },
];

const AdminLayout = () => {
  const { pathname } = useLocation();
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col shrink-0 hidden md:flex">
        <div className="p-6 border-b">
          <Link to="/" className="font-display text-xl font-bold text-foreground tracking-[0.08em] uppercase">
            Cocooning Club
          </Link>
          <p className="text-xs text-muted-foreground mt-1">Administration</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="text-sm text-foreground mb-2">{profile?.first_name} {profile?.last_name}</div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b p-4 flex items-center justify-between">
        <Link to="/" className="font-display text-lg font-bold text-foreground uppercase">CC Admin</Link>
        <div className="flex gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.to || (item.to !== "/admin" && pathname.startsWith(item.to));
            return (
              <Link key={item.to} to={item.to} className={`p-2 rounded-lg ${isActive ? "bg-primary text-primary-foreground" : "text-foreground/60"}`}>
                <item.icon className="w-4 h-4" />
              </Link>
            );
          })}
          <button onClick={handleLogout} className="p-2 text-foreground/60"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 p-6 md:p-10 md:pt-10 pt-20 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
