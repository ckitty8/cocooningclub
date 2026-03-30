import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, CalendarDays, MessageSquare, TrendingUp, Star } from "lucide-react";

interface Stats {
  membres: number;
  membres_premium: number;
  inscrits: number;
  total_inscriptions: number;
  messages_non_lus: number;
  ateliers_actifs: number;
}

const StatCard = ({
  icon: Icon, label, value, sub, accent = false
}: {
  icon: any; label: string; value: number | string; sub?: string; accent?: boolean;
}) => (
  <div className="bg-card rounded-2xl border p-6">
    <div className="flex items-start justify-between mb-4">
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <p className="text-3xl font-bold text-foreground">{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    membres: 0, membres_premium: 0, inscrits: 0,
    total_inscriptions: 0, messages_non_lus: 0, ateliers_actifs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [utilisateursRes, inscriptionsRes, messagesRes, ateliersRes] = await Promise.all([
        supabase.from("utilisateurs").select("role"),
        supabase.from("inscriptions").select("id", { count: "exact", head: true }),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("lu", false),
        supabase.from("ateliers").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      const utilisateurs = utilisateursRes.data ?? [];
      setStats({
        membres:            utilisateurs.filter(u => u.role === "membre").length,
        membres_premium:    utilisateurs.filter(u => u.role === "membre_premium").length,
        inscrits:           utilisateurs.filter(u => u.role === "inscrit").length,
        total_inscriptions: inscriptionsRes.count ?? 0,
        messages_non_lus:   messagesRes.count ?? 0,
        ateliers_actifs:    ateliersRes.count ?? 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const totalMembres = stats.membres + stats.membres_premium;

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm mt-1">Bienvenue dans votre espace administration</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users} label="Membres actifs" value={totalMembres}
          sub={`${stats.membres} standard · ${stats.membres_premium} premium`} />
        <StatCard icon={Star} label="Membres premium" value={stats.membres_premium}
          sub="Abonnement annuel" accent />
        <StatCard icon={UserCheck} label="Inscrits (formulaire)" value={stats.inscrits}
          sub="En attente de validation" />
        <StatCard icon={CalendarDays} label="Ateliers actifs" value={stats.ateliers_actifs}
          sub="Publiés sur le site" />
        <StatCard icon={TrendingUp} label="Inscriptions ateliers" value={stats.total_inscriptions}
          sub="Total toutes sessions" />
        <StatCard icon={MessageSquare} label="Messages non lus" value={stats.messages_non_lus}
          sub="Dans la boîte de réception" accent={stats.messages_non_lus > 0} />
      </div>

      {totalMembres > 0 && (
        <div className="bg-card rounded-2xl border p-6">
          <h2 className="font-semibold text-foreground mb-3">Répartition des membres</h2>
          <div className="flex gap-3">
            <div className="flex-1 bg-muted rounded-xl p-4 text-center">
              <p className="text-2xl font-bold">{stats.membres}</p>
              <p className="text-xs text-muted-foreground mt-1">Membres standard</p>
            </div>
            <div className="flex-1 bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.membres_premium}</p>
              <p className="text-xs text-muted-foreground mt-1">Membres premium</p>
            </div>
          </div>
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.round((stats.membres_premium / totalMembres) * 100)}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">
            {Math.round((stats.membres_premium / totalMembres) * 100)}% de membres premium
          </p>
        </div>
      )}
    </AdminLayout>
  );
};

export default Dashboard;
