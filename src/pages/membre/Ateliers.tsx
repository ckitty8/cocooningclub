import { useEffect, useState } from "react";
import MembreLayout from "@/components/membre/MembreLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  CalendarDays, Clock, MapPin, Users, Euro, Loader2, CheckCircle2,
  ExternalLink, X, AlarmClock,
} from "lucide-react";

interface Atelier {
  id: string;
  titre: string;
  description: string | null;
  description_courte: string | null;
  date_atelier: string;
  heure_debut: string;
  duree: string;
  lieu: string | null;
  url_image: string | null;
  places_max: number;
  places_disponibles: number;
  tarif_standard: number;
  tarif_premium: number;
  tarif_affichage: string | null;
  lien_paypal: string | null;
  date_fin_inscription: string | null;
  statut: "publie" | "complet" | "brouillon" | "annule" | "termine";
}

const isInscriptionsCloses = (a: { date_fin_inscription: string | null }) =>
  !!a.date_fin_inscription && new Date(a.date_fin_inscription + "T23:59:59") < new Date();

const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const formatTime = (t: string) => t.slice(0, 5);

const Ateliers = () => {
  const { profile } = useAuth();
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  const [myInscriptions, setMyInscriptions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [popin, setPopin] = useState<Atelier | null>(null);

  const fetchData = async () => {
    if (!profile) return;
    const today = new Date().toISOString().slice(0, 10);

    const [aRes, iRes] = await Promise.all([
      supabase
        .from("ateliers")
        .select("id, titre, description, description_courte, date_atelier, heure_debut, duree, lieu, url_image, places_max, places_disponibles, tarif_standard, tarif_premium, tarif_affichage, lien_paypal, date_fin_inscription, statut")
        .in("statut", ["publie", "complet"])
        .gte("date_atelier", today)
        .order("date_atelier"),
      supabase
        .from("inscriptions")
        .select("atelier_id, statut")
        .eq("utilisateur_id", profile.id)
        .neq("statut", "annule"),
    ]);

    setAteliers((aRes.data as Atelier[]) ?? []);
    setMyInscriptions(new Set(((iRes.data ?? []) as { atelier_id: string }[]).map(i => i.atelier_id)));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile]);

  const handleRegister = async (atelier: Atelier) => {
    if (!profile) return;
    setRegistering(atelier.id);

    const isPaid = atelier.tarif_standard > 0;
    const { error } = await supabase.from("inscriptions").insert({
      atelier_id: atelier.id,
      utilisateur_id: profile.id,
      statut: "en_attente",
      statut_paiement: isPaid ? "en_attente" : "non_requis",
    });

    if (error) {
      toast.error(`Erreur : ${error.message}`, { duration: 6000 });
      setRegistering(null);
      return;
    }

    toast.success(
      isPaid
        ? "Inscription enregistrée. Pensez à régler votre paiement via PayPal pour la confirmer."
        : "Inscription enregistrée — confirmation à venir.",
      { duration: 6000 }
    );
    setRegistering(null);
    setPopin(null);
    await fetchData();
  };

  if (loading) {
    return (
      <MembreLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MembreLayout>
    );
  }

  return (
    <MembreLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Ateliers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tous les ateliers proposés par le club. Cliquez pour vous inscrire.
        </p>
      </div>

      {ateliers.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun atelier programmé pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {ateliers.map(a => {
            const inscribed = myInscriptions.has(a.id);
            const full = a.statut === "complet" || a.places_disponibles <= 0;
            const closed = isInscriptionsCloses(a);
            return (
              <div key={a.id} className="bg-card border rounded-2xl overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                {a.url_image ? (
                  <img src={a.url_image} alt={a.titre} className="w-full aspect-[16/10] object-contain bg-muted/30" />
                ) : (
                  <div className="w-full aspect-[16/10] bg-gradient-to-br from-primary/15 to-amber-500/15 flex items-center justify-center">
                    <CalendarDays className="w-10 h-10 text-primary/50" />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-foreground text-base">{a.titre}</h3>
                  {a.description_courte && (
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{a.description_courte}</p>
                  )}

                  <div className="space-y-1.5 text-xs text-muted-foreground mt-3">
                    <div className="flex items-center gap-2 capitalize"><CalendarDays className="w-3.5 h-3.5" />{formatDate(a.date_atelier)}</div>
                    <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" />{formatTime(a.heure_debut)} · {a.duree}</div>
                    {a.lieu && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{a.lieu}</div>}
                    <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />{a.places_disponibles} / {a.places_max} places</div>
                    {a.tarif_affichage && <div className="flex items-center gap-2"><Euro className="w-3.5 h-3.5" />{a.tarif_affichage}</div>}
                    {a.date_fin_inscription && (
                      <div className="flex items-center gap-2"><AlarmClock className="w-3.5 h-3.5" />Inscriptions jusqu'au {formatDate(a.date_fin_inscription)}</div>
                    )}
                  </div>

                  <div className="mt-auto pt-4 flex items-center gap-2">
                    {inscribed ? (
                      <div className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Inscrit·e
                      </div>
                    ) : full ? (
                      <button disabled className="flex-1 bg-muted text-muted-foreground px-4 py-2 rounded-full text-sm font-medium cursor-not-allowed">
                        Complet
                      </button>
                    ) : closed ? (
                      <button disabled className="flex-1 bg-muted text-muted-foreground px-4 py-2 rounded-full text-sm font-medium cursor-not-allowed">
                        Inscriptions closes
                      </button>
                    ) : (
                      <button
                        onClick={() => setPopin(a)}
                        className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                      >
                        S'inscrire
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modale détail / inscription */}
      {popin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPopin(null)}>
          <div className="bg-card rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground pr-4">{popin.titre}</h2>
                <button onClick={() => setPopin(null)} className="p-1.5 rounded-lg hover:bg-muted shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {popin.url_image && (
                <img src={popin.url_image} alt="" className="w-full aspect-[16/10] object-contain rounded-xl mb-4 bg-muted/30" />
              )}

              {popin.description && (
                <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">{popin.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm mb-5">
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium capitalize mt-0.5">{formatDate(popin.date_atelier)}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Horaire</p>
                  <p className="font-medium mt-0.5">{formatTime(popin.heure_debut)} · {popin.duree}</p>
                </div>
                {popin.lieu && (
                  <div className="bg-muted/40 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-muted-foreground">Lieu</p>
                    <p className="font-medium mt-0.5">{popin.lieu}</p>
                  </div>
                )}
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Places restantes</p>
                  <p className="font-medium mt-0.5">{popin.places_disponibles} / {popin.places_max}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Tarif</p>
                  <p className="font-medium mt-0.5">{popin.tarif_affichage ?? (popin.tarif_standard > 0 ? `${popin.tarif_standard} €` : "Gratuit")}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleRegister(popin)}
                  disabled={registering === popin.id}
                  className="w-full bg-primary text-primary-foreground px-5 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {registering === popin.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirmer mon inscription
                </button>
                {popin.tarif_standard > 0 && popin.lien_paypal && (
                  <a
                    href={popin.lien_paypal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full border border-foreground/20 text-foreground px-5 py-3 rounded-full text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2"
                  >
                    Payer via PayPal <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </MembreLayout>
  );
};

export default Ateliers;
