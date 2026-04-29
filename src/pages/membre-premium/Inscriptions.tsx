import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import MembrePremiumLayout from "@/components/membre-premium/MembrePremiumLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  CalendarDays, Clock, MapPin, Loader2, Ticket, X,
  CheckCircle2, AlertCircle, ExternalLink,
} from "lucide-react";

type Onglet = "a-venir" | "passees";

interface AtelierResume {
  id: string;
  titre: string;
  date_atelier: string;
  heure_debut: string;
  duree: string;
  lieu: string | null;
  url_image: string | null;
  tarif_standard: number;
  tarif_affichage: string | null;
  lien_paypal: string | null;
}

interface Inscription {
  id: string;
  statut: "en_attente" | "confirme" | "annule";
  statut_paiement: "en_attente" | "paye" | "non_requis";
  present: boolean;
  inscrit_le: string;
  annule_le: string | null;
  atelier: AtelierResume | null;
}

const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const formatTime = (t: string) => t.slice(0, 5);

const Inscriptions = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "passees" ? "passees" : "a-venir";
  const [tab, setTab] = useState<Onglet>(initialTab);
  const [items, setItems] = useState<Inscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchInscriptions = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("inscriptions")
      .select("id, statut, statut_paiement, present, inscrit_le, annule_le, atelier:ateliers(id, titre, date_atelier, heure_debut, duree, lieu, url_image, tarif_standard, tarif_affichage, lien_paypal)")
      .eq("utilisateur_id", profile.id)
      .order("inscrit_le", { ascending: false });

    if (error) {
      toast.error(`Erreur : ${error.message}`);
      setLoading(false);
      return;
    }
    setItems(((data ?? []) as unknown as Inscription[]).filter(i => i.atelier !== null));
    setLoading(false);
  };

  useEffect(() => { fetchInscriptions(); }, [profile]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = items.filter(i => i.atelier && i.atelier.date_atelier >= today && i.statut !== "annule");
  const past = items.filter(i => i.atelier && i.atelier.date_atelier < today);
  const cancelled = items.filter(i => i.statut === "annule" && i.atelier && i.atelier.date_atelier >= today);

  const visible = tab === "a-venir" ? upcoming : past;

  const handleCancel = async (insId: string) => {
    if (!confirm("Annuler cette inscription ?")) return;
    setCancelling(insId);
    const { error } = await supabase
      .from("inscriptions")
      .update({ statut: "annule", annule_le: new Date().toISOString() })
      .eq("id", insId);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success("Inscription annulée.");
      await fetchInscriptions();
    }
    setCancelling(null);
  };

  const switchTab = (next: Onglet) => {
    setTab(next);
    if (next === "a-venir") searchParams.delete("tab");
    else searchParams.set("tab", "passees");
    setSearchParams(searchParams, { replace: true });
  };

  if (loading) {
    return (
      <MembrePremiumLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MembrePremiumLayout>
    );
  }

  return (
    <MembrePremiumLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Mes inscriptions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Retrouvez tous les ateliers auxquels vous êtes ou étiez inscrit·e.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6 flex gap-1">
        <button
          onClick={() => switchTab("a-venir")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "a-venir" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          À venir <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">{upcoming.length}</span>
        </button>
        <button
          onClick={() => switchTab("passees")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "passees" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Passées <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">{past.length}</span>
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <Ticket className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {tab === "a-venir" ? "Aucune inscription à venir." : "Aucun atelier passé."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map(ins => ins.atelier && (
            <li key={ins.id} className="bg-card border rounded-2xl p-4 flex items-start gap-4 flex-wrap sm:flex-nowrap">
              {ins.atelier.url_image ? (
                <img src={ins.atelier.url_image} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-7 h-7 text-primary" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{ins.atelier.titre}</h3>
                  <StatusBadge ins={ins} />
                </div>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{formatDate(ins.atelier.date_atelier)}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(ins.atelier.heure_debut)} · {ins.atelier.duree}</span>
                  {ins.atelier.lieu && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ins.atelier.lieu}</span>}
                  {ins.atelier.tarif_affichage && <span>{ins.atelier.tarif_affichage}</span>}
                </div>

                {tab === "a-venir" && ins.statut_paiement === "en_attente" && ins.atelier.tarif_standard > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-800 px-2 py-1 rounded-md">
                    <AlertCircle className="w-3 h-3" />
                    Paiement en attente
                    {ins.atelier.lien_paypal && (
                      <a href={ins.atelier.lien_paypal} target="_blank" rel="noopener noreferrer" className="underline ml-1 inline-flex items-center gap-0.5">
                        Payer <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {tab === "passees" && ins.present && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">
                    <CheckCircle2 className="w-3 h-3" /> Présent·e
                  </div>
                )}
              </div>

              {tab === "a-venir" && ins.statut !== "annule" && (
                <button
                  onClick={() => handleCancel(ins.id)}
                  disabled={cancelling === ins.id}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors shrink-0 disabled:opacity-50"
                >
                  {cancelling === ins.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  Annuler
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === "a-venir" && cancelled.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Annulées</h2>
          <ul className="space-y-2">
            {cancelled.map(ins => ins.atelier && (
              <li key={ins.id} className="bg-muted/30 border rounded-xl p-3 text-sm flex items-center gap-3">
                <X className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium text-muted-foreground line-through">{ins.atelier.titre}</span>
                <span className="text-xs text-muted-foreground capitalize ml-auto">{formatDate(ins.atelier.date_atelier)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </MembrePremiumLayout>
  );
};

const StatusBadge = ({ ins }: { ins: Inscription }) => {
  const cls =
    ins.statut === "confirme" ? "bg-emerald-100 text-emerald-700" :
    ins.statut === "en_attente" ? "bg-amber-100 text-amber-700" :
    "bg-muted text-muted-foreground";
  const label =
    ins.statut === "confirme" ? "Confirmée" :
    ins.statut === "en_attente" ? "En attente" :
    "Annulée";
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
};

export default Inscriptions;
