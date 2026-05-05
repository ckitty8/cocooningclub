import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MembreLayout from "@/components/membre/MembreLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CalendarDays, Ticket, BookOpen, ArrowRight, Loader2, Sparkles,
  Clock, MapPin, Newspaper,
} from "lucide-react";

interface AtelierResume {
  id: string;
  titre: string;
  date_atelier: string;
  heure_debut: string;
  duree: string;
  lieu: string | null;
  url_image: string | null;
  tarif_affichage: string | null;
}

interface InscriptionWithAtelier {
  id: string;
  statut: "en_attente" | "confirme" | "annule";
  statut_paiement: "en_attente" | "paye" | "non_requis";
  atelier: AtelierResume | null;
}

interface DocResume {
  id: string;
  titre: string;
  description: string | null;
  type: "magazine" | "guide" | "lien_externe";
  fichier_url: string | null;
  lien_externe: string | null;
  created_at: string;
}

const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const formatTime = (t: string) => t.slice(0, 5);

const Dashboard = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [upcomingMine, setUpcomingMine] = useState<InscriptionWithAtelier[]>([]);
  const [upcomingAllCount, setUpcomingAllCount] = useState(0);
  const [pastMineCount, setPastMineCount] = useState(0);
  const [latestMagazine, setLatestMagazine] = useState<DocResume | null>(null);

  useEffect(() => {
    if (!profile) return;
    const today = new Date().toISOString().slice(0, 10);

    const fetchAll = async () => {
      const [insRes, allRes, pastRes, magRes] = await Promise.all([
        supabase
          .from("inscriptions")
          .select("id, statut, statut_paiement, atelier:ateliers(id, titre, date_atelier, heure_debut, duree, lieu, url_image, tarif_affichage)")
          .eq("utilisateur_id", profile.id)
          .neq("statut", "annule")
          .gte("ateliers.date_atelier", today)
          .order("inscrit_le", { ascending: false }),
        supabase
          .from("ateliers")
          .select("id", { count: "exact", head: true })
          .in("statut", ["publie", "complet"])
          .gte("date_atelier", today),
        supabase
          .from("inscriptions")
          .select("id, ateliers!inner(date_atelier)", { count: "exact", head: true })
          .eq("utilisateur_id", profile.id)
          .lt("ateliers.date_atelier", today),
        supabase
          .from("documents")
          .select("id, titre, description, type, fichier_url, lien_externe, created_at")
          .eq("type", "magazine")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const ins = ((insRes.data ?? []) as unknown as InscriptionWithAtelier[])
        .filter(i => i.atelier !== null)
        .sort((a, b) => (a.atelier!.date_atelier).localeCompare(b.atelier!.date_atelier))
        .slice(0, 3);

      setUpcomingMine(ins);
      setUpcomingAllCount(allRes.count ?? 0);
      setPastMineCount(pastRes.count ?? 0);
      setLatestMagazine((magRes.data as DocResume | null) ?? null);
      setLoading(false);
    };

    fetchAll();
  }, [profile]);

  if (loading) {
    return (
      <MembreLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MembreLayout>
    );
  }

  const greeting = profile?.prenom ? `Bonjour ${profile.prenom}` : "Bonjour";
  const subscriptionEnd = profile?.fin_abonnement ? new Date(profile.fin_abonnement) : null;
  const subscriptionActive = subscriptionEnd && subscriptionEnd >= new Date();

  return (
    <MembreLayout>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          {greeting}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bienvenue dans votre espace membre Cocooning Club.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link to="/espace-membre/inscriptions" className="bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">À venir</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{upcomingMine.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Inscriptions à venir</p>
        </Link>

        <Link to="/espace-membre/ateliers" className="bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Ateliers</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{upcomingAllCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Ateliers proposés</p>
        </Link>

        <Link to="/espace-membre/inscriptions?tab=passees" className="bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Historique</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{pastMineCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Ateliers passés</p>
        </Link>
      </div>

      {/* Subscription status */}
      {subscriptionEnd && (
        <div className={`rounded-2xl border p-4 mb-8 text-sm ${subscriptionActive ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
          {subscriptionActive
            ? <>Votre abonnement est <strong>actif</strong> jusqu'au {subscriptionEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.</>
            : <>Votre abonnement a expiré le {subscriptionEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.</>
          }
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming registrations */}
        <div className="lg:col-span-2 bg-card border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" />
              Mes prochains ateliers
            </h2>
            <Link to="/espace-membre/inscriptions" className="text-xs text-primary hover:underline flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {upcomingMine.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">
                Vous n'êtes inscrit·e à aucun atelier à venir.
              </p>
              <Link
                to="/espace-membre/ateliers"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Découvrir les ateliers <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingMine.map(ins => ins.atelier && (
                <li key={ins.id} className="flex items-start gap-4 p-3 rounded-xl border hover:bg-muted/40 transition-colors">
                  {ins.atelier.url_image ? (
                    <img src={ins.atelier.url_image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarDays className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{ins.atelier.titre}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{formatDate(ins.atelier.date_atelier)}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(ins.atelier.heure_debut)}</span>
                      {ins.atelier.lieu && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{ins.atelier.lieu}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                    ins.statut === "confirme" ? "bg-emerald-100 text-emerald-700" :
                    ins.statut === "en_attente" ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {ins.statut === "confirme" ? "Confirmée" : ins.statut === "en_attente" ? "En attente" : "Annulée"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Latest magazine */}
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-primary" />
              Dernier magazine
            </h2>
            <Link to="/espace-membre/magazine" className="text-xs text-primary hover:underline flex items-center gap-1">
              Tous <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {latestMagazine ? (
            <Link to="/espace-membre/magazine" className="block group">
              <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-amber-500/20 rounded-xl flex items-center justify-center mb-3 overflow-hidden">
                <Newspaper className="w-12 h-12 text-primary/60 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                {latestMagazine.titre}
              </p>
              {latestMagazine.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{latestMagazine.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(latestMagazine.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucun magazine pour le moment.</p>
          )}
        </div>
      </div>
    </MembreLayout>
  );
};

export default Dashboard;
