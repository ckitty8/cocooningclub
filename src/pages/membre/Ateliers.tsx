import { useEffect, useState, useCallback } from "react";
import MembreLayout from "@/components/membre/MembreLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { googleMapsSearchUrl } from "@/utils/googleMaps";
import PreInscriptionModal from "@/components/PreInscriptionModal";
import { OffrePastille } from "@/components/OffrePastille";
import { useMesOffres, useTarifsAdherent } from "@/hooks/useOffres";
import { droitAtelier, euros, LIBELLES_DROIT, type DroitAtelier } from "@/lib/droits";
import { Link } from "react-router-dom";
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
  adresse: string | null;
  url_image: string | null;
  places_max: number;
  places_disponibles: number;
  tarif_standard: number;
  tarif_affichage: string | null;
  lien_paypal: string | null;
  date_fin_inscription: string | null;
  statut: "publie" | "complet" | "brouillon" | "annule" | "termine";
  antenne_id: string | null;
}

const isInscriptionsCloses = (a: { date_fin_inscription: string | null }) =>
  !!a.date_fin_inscription && new Date(a.date_fin_inscription + "T23:59:59") < new Date();

const formatDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const formatTime = (t: string) => t.slice(0, 5);

const Ateliers = () => {
  const { profile } = useAuth();
  const { offres, espaces, disponible, simulee } = useMesOffres();
  const tarifsAdherent = useTarifsAdherent();
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  // Statut de mes pré-inscriptions actives, par atelier.
  const [myInscriptions, setMyInscriptions] = useState<Map<string, "en_attente" | "confirme">>(new Map());
  const [loading, setLoading] = useState(true);
  const [popin, setPopin] = useState<Atelier | null>(null);
  // Titre de l'atelier en cours de pré-inscription, ou null si la fenêtre est fermée.
  const [preInscription, setPreInscription] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    const today = new Date().toISOString().slice(0, 10);

    const [aRes, iRes] = await Promise.all([
      supabase
        .from("ateliers")
        .select("id, titre, description, description_courte, date_atelier, heure_debut, duree, lieu, adresse, url_image, places_max, places_disponibles, tarif_standard, tarif_affichage, lien_paypal, date_fin_inscription, statut, antenne_id")
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
    setMyInscriptions(new Map(
      ((iRes.data ?? []) as { atelier_id: string; statut: "en_attente" | "confirme" }[]).map(i => [i.atelier_id, i.statut]),
    ));
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // La pré-inscription passe par la même fenêtre que sur l'accueil (identité
  // du compte pré-remplie, CGU, date de naissance si l'atelier la demande).
  const ouvrirPreInscription = (atelier: Atelier) => {
    setPopin(null);
    setPreInscription(atelier.titre);
  };

  const fermerPreInscription = () => {
    setPreInscription(null);
    fetchData();
  };

  // « Inclus », « gratuit pour tous » ou « à régler » : d'après l'adhésion en cours (voir lib/droits.ts).
  const droitDe = (a: Atelier): DroitAtelier | null => (disponible ? droitAtelier({ ...a, tarif_adherent: tarifsAdherent.get(a.id) ?? null }, espaces, offres) : null);
  const mention = (d: DroitAtelier, a: Atelier) => {
    if (d.etat !== "a_payer") return LIBELLES_DROIT[d.etat];
    const avecAdhesion = tarifsAdherent.get(a.id);
    const base = `${d.montant > 0 ? euros(d.montant) + " " : ""}à régler`;
    // Non-adhérente : on rappelle le tarif réservé aux adhérentes.
    return offres.length === 0 && avecAdhesion != null && avecAdhesion < d.montant ? `${base} · ${euros(avecAdhesion)} avec une adhésion` : base;
  };
  const styleMention = (d: DroitAtelier) =>
    d.etat === "inclus" ? "bg-green-100 text-green-700" : d.etat === "gratuit" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";

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
          Tous les ateliers proposés par le club. Cliquez sur « Pré-inscription » pour réserver votre place.
        </p>
      </div>

      {disponible && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-5 py-3 text-sm">
          {offres.length > 0 ? (
            <>
              <span className="flex flex-wrap gap-1">{offres.map(o => <OffrePastille key={o.formule_id} offre={o} />)}</span>
              <span className="flex-1 min-w-[200px]">
                <b>Votre offre</b> · valable jusqu'au {new Date(Math.max(...offres.map(o => new Date(o.valable_jusqu_au).getTime()))).toLocaleDateString("fr-FR")}
                <span className="block text-xs text-muted-foreground">
                  Inclus : Papotages{espaces.filter(e => offres.some(o => o.espaces.includes(e.id))).map(e => `, ${e.nom}`).join("")} · les autres espaces : atelier à régler à l'unité
                </span>
              </span>
            </>
          ) : (
            <span className="flex-1">
              <b>Aucune adhésion en cours.</b> Papotages est gratuit pour tous ; les ateliers des autres espaces se règlent à l'unité.
            </span>
          )}
          {!simulee && <Link to="/espace-membre/mon-adhesion" className="text-primary hover:underline">Mon adhésion ›</Link>}
        </div>
      )}

      {ateliers.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun atelier programmé pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {ateliers.map(a => {
            const statutInscription = myInscriptions.get(a.id);
            const full = a.statut === "complet" || a.places_disponibles <= 0;
            const closed = isInscriptionsCloses(a);
            const droit = droitDe(a);
            return (
              <div key={a.id} className="bg-card border rounded-2xl overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                {a.url_image ? (
                  <img src={a.url_image} alt={a.titre} loading="lazy" decoding="async" className="w-full aspect-[16/10] object-contain bg-muted/30" />
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
                    {a.lieu && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        {a.adresse ? (
                          <a href={googleMapsSearchUrl(a.adresse)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {a.lieu}
                          </a>
                        ) : a.lieu}
                      </div>
                    )}
                    <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" />{a.places_disponibles} / {a.places_max} places</div>
                    {a.tarif_affichage && <div className="flex items-center gap-2"><Euro className="w-3.5 h-3.5" />{a.tarif_affichage}</div>}
                    {a.date_fin_inscription && (
                      <div className="flex items-center gap-2"><AlarmClock className="w-3.5 h-3.5" />Inscriptions jusqu'au {formatDate(a.date_fin_inscription)}</div>
                    )}
                  </div>

                  {droit && (
                    <p className="mt-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styleMention(droit)}`}>{mention(droit, a)}</span>
                    </p>
                  )}

                  <div className="mt-auto pt-4 flex items-center gap-2">
                    {statutInscription ? (
                      <div className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        {statutInscription === "confirme" ? "Inscrit·e" : "Pré-inscription envoyée"}
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
                        {droit?.etat === "a_payer" && droit.montant > 0 ? `Pré-inscription · ${euros(droit.montant)}` : "Pré-inscription"}
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
                <img src={popin.url_image} alt={popin.titre} className="w-full aspect-[16/10] object-contain rounded-xl mb-4 bg-muted/30" />
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
                    {popin.adresse ? (
                      <a href={googleMapsSearchUrl(popin.adresse)} target="_blank" rel="noopener noreferrer" className="font-medium mt-0.5 inline-block hover:underline">
                        {popin.lieu}
                      </a>
                    ) : (
                      <p className="font-medium mt-0.5">{popin.lieu}</p>
                    )}
                  </div>
                )}
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Places restantes</p>
                  <p className="font-medium mt-0.5">{popin.places_disponibles} / {popin.places_max}</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Tarif</p>
                  <p className="font-medium mt-0.5">{popin.tarif_affichage ?? (popin.tarif_standard > 0 ? `${popin.tarif_standard} €` : "Gratuit")}</p>
                  {droitDe(popin) && (
                    <p className="mt-1"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styleMention(droitDe(popin)!)}`}>{mention(droitDe(popin)!, popin)}</span></p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => ouvrirPreInscription(popin)}
                  className="w-full bg-primary text-primary-foreground px-5 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Pré-inscription
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

      {preInscription !== null && (
        <PreInscriptionModal ateliers={ateliers} atelierInitial={preInscription} onFermer={fermerPreInscription} />
      )}
    </MembreLayout>
  );
};

export default Ateliers;
