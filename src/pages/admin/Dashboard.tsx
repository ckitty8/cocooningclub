import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, CalendarDays, MessageSquare, UserCheck, Lightbulb, ArrowRight,
  Clock, MapPin, User, Mail, Sparkles, AlertCircle, Loader2, Eye, TrendingUp
} from "lucide-react";

interface Atelier {
  id: string;
  titre: string;
  date_atelier: string;
  heure_debut: string | null;
  lieu: string | null;
  places_max: number;
  places_disponibles: number;
  statut: string;
}

interface InscriptionEnAttente {
  id: string;
  prenom_invite: string | null;
  nom_invite: string | null;
  email_invite: string | null;
  inscrit_le: string;
  ateliers?: { titre: string; date_atelier: string } | null;
}

interface Idee {
  id: string;
  titre: string;
  categorie: string;
  cree_le: string;
  utilisateur_id: string;
}

interface Admin {
  id: string;
  prenom: string;
  code_couleur_conges: string | null;
}

interface Stats {
  pre_inscriptions_en_attente: number;
  ateliers_a_venir: number;
  membres_actifs: number;
  membres_premium: number;
  messages_non_lus: number;
  idees_total: number;
}

interface VisitesStats {
  total: number;
  aujourd_hui: number;
  cette_semaine: number;
  ce_mois: number;
  uniques_30j: number;
  top_pages: { page: string; count: number }[];
}

const formatDateFr = (iso: string) => {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
};

const formatHeure = (h: string | null) => h ? h.substring(0, 5) : "";

const CAT_LABELS: Record<string, string> = {
  evolution_site: "🚀 Évolutions Site",
  ateliers: "🎨 Ateliers",
  anomalie_site: "🐛 Anomalie",
  membres: "👥 Membres",
  communication: "📣 Communication",
  evenements: "✨ Événements",
  organisation: "📋 Organisation",
  autre: "💡 Autre",
};

const KpiCard = ({
  icon: Icon, label, value, sub, href, accent, pulse,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
  accent?: boolean;
  pulse?: boolean;
}) => {
  const content = (
    <div className={`
      bg-card rounded-2xl border p-5 transition-all h-full
      ${href ? "hover:shadow-md hover:border-primary/40 cursor-pointer" : ""}
      ${accent ? "border-primary/30 bg-primary/5" : ""}
    `}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={`
          w-9 h-9 rounded-xl flex items-center justify-center shrink-0
          ${accent ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}
          ${pulse ? "ring-4 ring-primary/20" : ""}
        `}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground leading-none mb-1.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {href && (
        <p className="text-xs text-primary font-medium mt-3 flex items-center gap-1">
          Voir <ArrowRight className="w-3 h-3" />
        </p>
      )}
    </div>
  );

  return href ? <Link to={href}>{content}</Link> : content;
};

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    pre_inscriptions_en_attente: 0,
    ateliers_a_venir: 0,
    membres_actifs: 0,
    membres_premium: 0,
    messages_non_lus: 0,
    idees_total: 0,
  });
  const [prochainAteliers, setProchainAteliers] = useState<Atelier[]>([]);
  const [inscriptionsAtt, setInscriptionsAtt] = useState<InscriptionEnAttente[]>([]);
  const [idees, setIdees] = useState<Idee[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [visites, setVisites] = useState<VisitesStats>({
    total: 0, aujourd_hui: 0, cette_semaine: 0, ce_mois: 0, uniques_30j: 0, top_pages: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const today = new Date().toISOString().slice(0, 10);

      const [
        utRes, inscAttRes, ateliersCountRes, msgsRes,
        proAtelRes, recAttRes, ideesRes, adminsRes
      ] = await Promise.all([
        supabase.from("utilisateurs").select("role"),
        supabase.from("inscriptions").select("id", { count: "exact", head: true }).eq("statut", "en_attente"),
        supabase.from("ateliers").select("id", { count: "exact", head: true })
          .in("statut", ["publie", "complet"]).gte("date_atelier", today),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("lu", false),
        supabase.from("ateliers")
          .select("id, titre, date_atelier, heure_debut, lieu, places_max, places_disponibles, statut")
          .in("statut", ["publie", "complet"]).gte("date_atelier", today)
          .order("date_atelier").limit(4),
        supabase.from("inscriptions")
          .select("id, prenom_invite, nom_invite, email_invite, inscrit_le, ateliers(titre, date_atelier)")
          .eq("statut", "en_attente").order("inscrit_le", { ascending: false }).limit(5),
        supabase.from("idees").select("id, titre, categorie, cree_le, utilisateur_id")
          .order("cree_le", { ascending: false }).limit(4),
        supabase.from("utilisateurs").select("id, prenom, code_couleur_conges").eq("role", "administrateur"),
      ]);

      const utilisateurs = (utRes.data ?? []) as { role: string }[];

      setStats({
        pre_inscriptions_en_attente: inscAttRes.count ?? 0,
        ateliers_a_venir:  ateliersCountRes.count ?? 0,
        membres_actifs:    utilisateurs.filter(u => u.role === "membre_standard" || u.role === "membre_premium").length,
        membres_premium:   utilisateurs.filter(u => u.role === "membre_premium").length,
        messages_non_lus:  msgsRes.count ?? 0,
        idees_total:       (ideesRes.data ?? []).length > 0 ? (ideesRes.data?.length ?? 0) : 0,
      });
      setProchainAteliers((proAtelRes.data as Atelier[]) ?? []);
      setInscriptionsAtt((recAttRes.data as unknown as InscriptionEnAttente[]) ?? []);
      setIdees((ideesRes.data as Idee[]) ?? []);
      setAdmins((adminsRes.data as Admin[]) ?? []);

      // Stats visites (calcul côté client sur les 30 derniers jours pour limiter la charge)
      const debutJour    = new Date(); debutJour.setHours(0, 0, 0, 0);
      const debutSemaine = new Date(); debutSemaine.setDate(debutSemaine.getDate() - 7);
      const debutMois    = new Date(); debutMois.setDate(debutMois.getDate() - 30);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [totalRes, jourRes, semaineRes, moisRes, pagesRes, visitesBrut] = await Promise.all([
        (supabase.from("visites_site") as any).select("id", { count: "exact", head: true }),
        (supabase.from("visites_site") as any).select("id", { count: "exact", head: true }).gte("cree_le", debutJour.toISOString()),
        (supabase.from("visites_site") as any).select("id", { count: "exact", head: true }).gte("cree_le", debutSemaine.toISOString()),
        (supabase.from("visites_site") as any).select("id", { count: "exact", head: true }).gte("cree_le", debutMois.toISOString()),
        (supabase.from("visites_site") as any).select("page").gte("cree_le", debutMois.toISOString()).limit(2000),
        (supabase.from("visites_site") as any).select("visiteur_hash").gte("cree_le", debutMois.toISOString()).limit(5000),
      ]);

      // Top pages
      const pageCounts: Record<string, number> = {};
      ((pagesRes.data ?? []) as { page: string }[]).forEach(r => {
        pageCounts[r.page] = (pageCounts[r.page] ?? 0) + 1;
      });
      const top_pages = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([page, count]) => ({ page, count }));

      // Visiteurs uniques sur 30j (par hash distinct)
      const uniques = new Set<string>();
      ((visitesBrut.data ?? []) as { visiteur_hash: string | null }[]).forEach(r => {
        if (r.visiteur_hash) uniques.add(r.visiteur_hash);
      });

      setVisites({
        total:         totalRes.count ?? 0,
        aujourd_hui:   jourRes.count ?? 0,
        cette_semaine: semaineRes.count ?? 0,
        ce_mois:       moisRes.count ?? 0,
        uniques_30j:   uniques.size,
        top_pages,
      });

      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </AdminLayout>
  );

  const heure = new Date().getHours();
  const salutation = heure < 6 ? "Bonne nuit" : heure < 12 ? "Bonjour" : heure < 18 ? "Bon après-midi" : "Bonsoir";
  const adminColor = profile ? admins.find(a => a.id === profile.id)?.code_couleur_conges : null;

  return (
    <AdminLayout>
      {/* Header personnalisé */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {adminColor && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: adminColor }}
              />
            )}
            {salutation} {profile?.prenom ?? ""} ✨
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={UserCheck}
          label="À valider"
          value={stats.pre_inscriptions_en_attente}
          sub={stats.pre_inscriptions_en_attente > 0 ? "pré-inscriptions en attente" : "tout est à jour 🎯"}
          href="/admin/pre-inscriptions"
          pulse={stats.pre_inscriptions_en_attente > 0}
          accent={stats.pre_inscriptions_en_attente > 0}
        />
        <KpiCard
          icon={CalendarDays}
          label="Ateliers à venir"
          value={stats.ateliers_a_venir}
          sub="publiés ou complets"
          href="/admin/ateliers"
        />
        <KpiCard
          icon={Users}
          label="Membres actifs"
          value={stats.membres_actifs}
          sub={`${stats.membres_premium} premium`}
          href="/admin/membres"
        />
        <KpiCard
          icon={MessageSquare}
          label="Messages non lus"
          value={stats.messages_non_lus}
          sub={stats.messages_non_lus > 0 ? "dans la boîte" : "—"}
          href="/admin/formulaire"
          accent={stats.messages_non_lus > 0}
        />
      </div>

      {/* 2 colonnes : Prochains ateliers + À valider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Prochains ateliers */}
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Prochains ateliers
            </h2>
            <Link to="/admin/ateliers" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              Tous <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {prochainAteliers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aucun atelier à venir.
              <div className="mt-3">
                <Link to="/admin/ateliers" className="text-primary text-xs font-medium hover:underline">
                  + Créer un atelier
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {prochainAteliers.map(a => {
                const taux = a.places_max > 0 ? ((a.places_max - a.places_disponibles) / a.places_max) * 100 : 0;
                const complet = a.places_disponibles === 0;
                return (
                  <div key={a.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-medium text-foreground text-sm truncate">{a.titre}</p>
                      {complet && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                          Complet
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateFr(a.date_atelier)} · {formatHeure(a.heure_debut)}
                      </span>
                      {a.lieu && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {a.lieu}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${complet ? "bg-red-500" : "bg-primary"}`}
                          style={{ width: `${taux}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {a.places_max - a.places_disponibles}/{a.places_max}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* À valider */}
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Pré-inscriptions à valider
            </h2>
            <Link to="/admin/pre-inscriptions" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              Toutes <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {inscriptionsAtt.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aucune pré-inscription en attente 🎉
            </div>
          ) : (
            <div className="divide-y">
              {inscriptionsAtt.map(i => (
                <Link
                  key={i.id}
                  to="/admin/pre-inscriptions"
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {i.prenom_invite} {i.nom_invite}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {i.ateliers?.titre ?? "Atelier inconnu"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{i.email_invite}</span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                    En attente
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Boîte à idées récentes */}
      {idees.length > 0 && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Dernières idées de l'équipe
            </h2>
            <Link to="/admin/boite-a-idees" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              Toutes <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
            {idees.map(idee => {
              const author = admins.find(a => a.id === idee.utilisateur_id);
              const color = author?.code_couleur_conges ?? "#9ca3af";
              return (
                <Link
                  key={idee.id}
                  to="/admin/boite-a-idees"
                  className="p-4 hover:bg-muted/20 transition-colors flex items-start gap-3"
                >
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      {CAT_LABELS[idee.categorie] ?? idee.categorie}
                    </p>
                    <p className="font-medium text-sm text-foreground line-clamp-2">{idee.titre}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {author?.prenom ?? "?"} · {formatDateFr(idee.cree_le.slice(0, 10))}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Trafic du site */}
      <div className="bg-card border rounded-2xl overflow-hidden mt-6">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Trafic du site
          </h2>
          <span className="text-xs text-muted-foreground">Sur 30 jours glissants</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x">
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Aujourd'hui</p>
            <p className="text-2xl font-bold text-foreground">{visites.aujourd_hui}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">7 jours</p>
            <p className="text-2xl font-bold text-foreground">{visites.cette_semaine}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">30 jours</p>
            <p className="text-2xl font-bold text-foreground">{visites.ce_mois}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Visiteurs uniques (30j)</p>
            <p className="text-2xl font-bold text-primary">{visites.uniques_30j}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-bold text-foreground">{visites.total}</p>
          </div>
        </div>
        {visites.top_pages.length > 0 && (
          <div className="px-5 py-4 border-t bg-muted/20">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="w-3 h-3" /> Pages les plus visitées (30j)
            </p>
            <div className="space-y-1.5">
              {visites.top_pages.map(({ page, count }) => {
                const max = visites.top_pages[0].count;
                const pct = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={page} className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-xs text-foreground truncate w-32 shrink-0">{page || "/"}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-10 text-right shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Alerte si pré-inscriptions en attente nombreuses */}
      {stats.pre_inscriptions_en_attente > 5 && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">
              {stats.pre_inscriptions_en_attente} pré-inscriptions en attente
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Pense à les valider pour libérer/confirmer les places.
            </p>
          </div>
          <Link
            to="/admin/pre-inscriptions"
            className="text-xs font-medium bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors shrink-0"
          >
            Voir
          </Link>
        </div>
      )}
    </AdminLayout>
  );
};

export default Dashboard;
