import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarDays, ClipboardList, TrendingUp, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Stats {
  totalMembers: number;
  ateliersThisMonth: number;
  pendingReservations: number;
  avgFillRate: number;
}

interface UpcomingAtelier {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  reservationCount: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ totalMembers: 0, ateliersThisMonth: 0, pendingReservations: 0, avgFillRate: 0 });
  const [upcoming, setUpcoming] = useState<UpcomingAtelier[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];
      const startOfMonth = `${today.slice(0, 7)}-01`;
      const endOfMonth = `${today.slice(0, 7)}-31`;

      // Total active members
      const { count: memberCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "membre")
        .eq("status", "actif");

      // Ateliers this month
      const { count: atelierCount } = await supabase
        .from("ateliers")
        .select("*", { count: "exact", head: true })
        .gte("date", startOfMonth)
        .lte("date", endOfMonth);

      // Pending reservations
      const { count: reservationCount } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("status", "confirmee");

      // Upcoming ateliers with reservation counts
      const { data: ateliersData } = await supabase
        .from("ateliers")
        .select("id, title, date, time, location, capacity")
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(5);

      let upcomingList: UpcomingAtelier[] = [];
      let totalFill = 0;
      let fillCount = 0;

      if (ateliersData) {
        for (const atelier of ateliersData) {
          const { count } = await supabase
            .from("reservations")
            .select("*", { count: "exact", head: true })
            .eq("atelier_id", atelier.id)
            .in("status", ["confirmee", "presente"]);

          const resCount = count || 0;
          upcomingList.push({ ...atelier, reservationCount: resCount });
          totalFill += resCount / atelier.capacity;
          fillCount++;
        }
      }

      setStats({
        totalMembers: memberCount || 0,
        ateliersThisMonth: atelierCount || 0,
        pendingReservations: reservationCount || 0,
        avgFillRate: fillCount > 0 ? Math.round((totalFill / fillCount) * 100) : 0,
      });
      setUpcoming(upcomingList);
    };

    fetchData();
  }, []);

  const statCards = [
    { label: "Membres actifs", value: stats.totalMembers, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Ateliers ce mois", value: stats.ateliersThisMonth, icon: CalendarDays, color: "text-green-600 bg-green-50" },
    { label: "Réservations en attente", value: stats.pendingReservations, icon: ClipboardList, color: "text-orange-600 bg-orange-50" },
    { label: "Taux remplissage", value: `${stats.avgFillRate}%`, icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-foreground mb-8">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-card rounded-2xl border p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Upcoming ateliers */}
      <h2 className="text-lg font-display font-semibold text-foreground mb-4">Prochains ateliers</h2>
      <div className="bg-card rounded-2xl border overflow-hidden">
        {upcoming.length === 0 ? (
          <p className="p-6 text-muted-foreground text-center">Aucun atelier à venir.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-4 font-medium">Atelier</th>
                <th className="p-4 font-medium hidden md:table-cell">Date</th>
                <th className="p-4 font-medium hidden md:table-cell">Lieu</th>
                <th className="p-4 font-medium text-right">Places</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="p-4">
                    <span className="font-medium text-foreground">{a.title}</span>
                    <span className="block md:hidden text-xs text-muted-foreground mt-1">
                      {format(new Date(a.date), "d MMM yyyy", { locale: fr })} · {a.location}
                    </span>
                  </td>
                  <td className="p-4 hidden md:table-cell text-sm text-foreground/70">
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(a.date), "d MMM yyyy", { locale: fr })} · {a.time}</div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-sm text-foreground/70">
                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.location}</div>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`text-sm font-medium ${a.reservationCount >= a.capacity ? "text-destructive" : "text-foreground"}`}>
                      {a.reservationCount}/{a.capacity}
                    </span>
                    {a.reservationCount >= a.capacity && (
                      <span className="ml-2 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Complet</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
