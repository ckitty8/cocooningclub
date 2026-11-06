import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import ChampDate from "@/components/ChampDate";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/utils/withTimeout";
import { aujourdhuiIso } from "@/lib/adhesions";
import { couleurEspace } from "@/lib/calendrierAteliers";
import { ESPACES_PAR_SLUG } from "@/lib/espaces";
import { CRENEAUX } from "@/lib/creneau";
import {
  PERIODES, statistiquesAteliers, type AtelierStat, type Filtres, type InscriptionStat, type Periode,
} from "@/lib/statsAteliers";

interface Espace { id: string; nom: string; slug: string }

const CLE_FILTRES = "admin.tableauAteliers.filtres";
const FILTRES_DEPART: Filtres = { periode: "tout", espaces: [], brouillons: false, annules: false };

const lireFiltres = (): Filtres => {
  try {
    const brut = sessionStorage.getItem(CLE_FILTRES);
    return brut ? { ...FILTRES_DEPART, ...JSON.parse(brut) } : FILTRES_DEPART;
  } catch { return FILTRES_DEPART; }
};

const nombre = (v: number | null, suffixe = "") => (v === null ? "—" : `${String(v).replace(".", ",")}${suffixe}`);
const dateCourte = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

const puce = (actif: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${actif ? "bg-primary border-primary text-primary-foreground" : "bg-card hover:bg-muted"}`;

/**
 * Tableau de bord des ateliers (menu Ateliers → « Tableau de bord ») : statistiques recalculées en direct selon
 * les filtres (période, espaces, brouillons, annulés). Participantes : inscrites validées ET présentes (case cochée).
 */
const TableauAteliers = () => {
  const [ateliers, setAteliers] = useState<AtelierStat[]>([]);
  const [inscriptions, setInscriptions] = useState<InscriptionStat[]>([]);
  const [espaces, setEspaces] = useState<Espace[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [filtres, setFiltres] = useState<Filtres>(lireFiltres);

  const changer = (partiel: Partial<Filtres>) => setFiltres(prev => {
    const suivant = { ...prev, ...partiel };
    try { sessionStorage.setItem(CLE_FILTRES, JSON.stringify(suivant)); } catch { /* stockage indisponible */ }
    return suivant;
  });

  useEffect(() => {
    (async () => {
      try {
        const lireInscriptions = async () => {
          const avec = await supabase.from("inscriptions").select("atelier_id, statut, present, creneau");
          // Base pas encore à jour (colonne du créneau absente) : les statistiques restent disponibles, sans les créneaux.
          if (avec.error && /creneau/.test(avec.error.message ?? "")) return supabase.from("inscriptions").select("atelier_id, statut, present");
          return avec;
        };
        const [aRes, eRes, iRes] = await withTimeout(Promise.all([
          supabase.from("ateliers").select("id, titre, date_atelier, statut, places_max, places_disponibles, espace_id").order("date_atelier"),
          supabase.from("espaces").select("id, nom, slug").order("ordre_affichage"),
          lireInscriptions(),
        ]));
        if (aRes.error || eRes.error || iRes.error) throw aRes.error ?? eRes.error ?? iRes.error;
        setAteliers((aRes.data as AtelierStat[]) ?? []);
        setEspaces((eRes.data as Espace[]) ?? []);
        setInscriptions((iRes.data as InscriptionStat[]) ?? []);
      } catch (err) {
        console.error("[TableauAteliers] error:", err);
        setErreur(true);
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const jour = aujourdhuiIso();
  const s = useMemo(() => statistiquesAteliers(ateliers, inscriptions, espaces, filtres, jour), [ateliers, inscriptions, espaces, filtres, jour]);
  const nomEspace = (id: string | null) => espaces.find(e => e.id === id);
  const basculerEspace = (id: string) =>
    changer({ espaces: filtres.espaces.includes(id) ? filtres.espaces.filter(x => x !== id) : [...filtres.espaces, id] });
  const t = s.totaux;

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord des ateliers</h1>
          <p className="text-muted-foreground text-sm mt-1">Les chiffres se mettent à jour dès que tu changes un filtre.</p>
        </div>
        <Link to="/admin/ateliers"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Créer un atelier
        </Link>
      </div>

      {/* Filtres */}
      <section aria-label="Filtres" className="bg-card border rounded-2xl p-4 mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-xs font-medium text-muted-foreground">Période</span>
          {PERIODES.map(p => (
            <button key={p.valeur} type="button" aria-pressed={filtres.periode === p.valeur}
              onClick={() => changer({ periode: p.valeur as Periode })} className={puce(filtres.periode === p.valeur)}>
              {p.libelle}
            </button>
          ))}
        </div>
        {filtres.periode === "personnalisee" && (
          <div className="flex flex-wrap items-center gap-3 pl-0 sm:pl-[5.5rem] text-sm">
            <label className="flex items-center gap-2">du <ChampDate id="tb-du" value={filtres.du ?? ""} onChange={v => changer({ du: v })} className="w-36 border rounded-xl px-3 py-1.5 text-sm bg-background" /></label>
            <label className="flex items-center gap-2">au <ChampDate id="tb-au" value={filtres.au ?? ""} onChange={v => changer({ au: v })} className="w-36 border rounded-xl px-3 py-1.5 text-sm bg-background" /></label>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-xs font-medium text-muted-foreground">Espaces</span>
          <button type="button" aria-pressed={filtres.espaces.length === 0} onClick={() => changer({ espaces: [] })} className={puce(filtres.espaces.length === 0)}>
            Tous
          </button>
          {espaces.map(e => (
            <button key={e.id} type="button" aria-pressed={filtres.espaces.includes(e.id)} onClick={() => basculerEspace(e.id)}
              className={`${puce(filtres.espaces.includes(e.id))} inline-flex items-center gap-1.5`}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: couleurEspace(e.slug) }} aria-hidden="true" />{e.nom}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="w-20 text-xs font-medium text-muted-foreground">Inclure</span>
          <label className="flex items-center gap-2"><input type="checkbox" checked={filtres.brouillons} onChange={e => changer({ brouillons: e.target.checked })} className="h-6 w-6 accent-primary" />les brouillons</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={filtres.annules} onChange={e => changer({ annules: e.target.checked })} className="h-6 w-6 accent-primary" />les ateliers annulés</label>
          <button type="button" onClick={() => changer(FILTRES_DEPART)} className="ml-auto py-1 text-xs underline text-muted-foreground hover:text-foreground">Réinitialiser les filtres</button>
        </div>
      </section>

      {chargement ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : erreur ? (
        <p className="text-muted-foreground">Les chiffres n'ont pas pu être chargés. Recharge la page.</p>
      ) : (
        <>
          {/* Chiffres clés */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-8">
            {([
              [String(t.ateliers), "ateliers", `dont ${t.ateliersPasses} passé${t.ateliersPasses > 1 ? "s" : ""}`],
              [String(t.validees), "inscrites validées", `${nombre(t.moyenneValidees)} par atelier`],
              [String(t.presentes), "présentes (cochées)", `${nombre(t.moyennePresentes)} par atelier passé`],
              [nombre(t.tauxPresence, " %"), "taux de présence", "présentes / validées, ateliers passés"],
              [nombre(t.tauxRemplissage, " %"), "taux de remplissage", "validées / places (ateliers limités)"],
              [String(t.aTraiter), "pré-inscriptions à traiter", null],
              [String(t.placesLibres), "places encore libres", "ateliers à venir"],
            ] as [string, string, string | null][]).map(([valeur, libelle, detail]) => (
              <div key={libelle} className="bg-card border rounded-2xl px-4 py-3">
                <p className="font-display text-2xl text-terracotta">{valeur}</p>
                <p className="text-xs text-foreground">{libelle}</p>
                {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
              </div>
            ))}
          </div>

          {/* Par espace */}
          <h2 className="font-display text-xl text-terracotta mb-3">Par espace</h2>
          <div className="bg-card border rounded-2xl overflow-x-auto mb-8">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Espace</th>
                  <th className="text-right px-4 py-3 font-medium">Ateliers</th>
                  <th className="text-right px-4 py-3 font-medium">Validées</th>
                  <th className="text-right px-4 py-3 font-medium">Moy. validées / atelier</th>
                  <th className="text-right px-4 py-3 font-medium">Présentes</th>
                  <th className="text-right px-4 py-3 font-medium">Moy. présentes / atelier passé</th>
                  <th className="text-right px-4 py-3 font-medium">Présence</th>
                  <th className="text-right px-4 py-3 font-medium">Remplissage</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {s.parEspace.map(l => {
                  const logo = ESPACES_PAR_SLUG[l.slug]?.logo;
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 font-medium">
                          {logo ? <img src={logo} alt="" className="h-6 w-10 object-contain" /> : <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: couleurEspace(l.slug) }} aria-hidden="true" />}
                          {l.nom}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{l.ateliers}</td>
                      <td className="px-4 py-3 text-right">{l.validees}</td>
                      <td className="px-4 py-3 text-right font-medium">{nombre(l.moyenneValidees)}</td>
                      <td className="px-4 py-3 text-right">{l.presentes}</td>
                      <td className="px-4 py-3 text-right font-medium">{nombre(l.moyennePresentes)}</td>
                      <td className="px-4 py-3 text-right">{nombre(l.tauxPresence, " %")}</td>
                      <td className="px-4 py-3 text-right">{nombre(l.tauxRemplissage, " %")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Business : journée, matin, après-midi */}
          {s.business && (
            <>
              <h2 className="font-display text-xl text-terracotta mb-1">Business : journée, matin ou après-midi</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Réponse donnée par la participante dans le formulaire de pré-inscription, sur {s.business.ateliers} atelier{s.business.ateliers > 1 ? "s" : ""} Business.
              </p>
              <div className="bg-card border rounded-2xl p-4 mb-8 space-y-3">
                {[...CRENEAUX.map(c => ({ cle: c.valeur, libelle: c.libelle })), { cle: "sans_reponse" as const, libelle: "Pas de réponse" }].map(({ cle, libelle }) => {
                  const total = Object.values(s.business!.validees).reduce((a, b) => a + b, 0);
                  const n = s.business!.validees[cle];
                  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                  return (
                    <div key={cle} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
                      <span>{libelle}</span>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cle === "sans_reponse" ? "#b8aaa4" : couleurEspace("business") }} />
                      </div>
                      <span className="whitespace-nowrap text-right text-xs">
                        <span className="font-medium text-sm">{n}</span> validée{n > 1 ? "s" : ""} ({pct} %) · {s.business!.presentes[cle]} présente{s.business!.presentes[cle] > 1 ? "s" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Détail par atelier */}
          <h2 className="font-display text-xl text-terracotta mb-3">Détail par atelier</h2>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Atelier</th>
                  <th className="text-left px-4 py-3 font-medium">Espace</th>
                  <th className="text-right px-4 py-3 font-medium">Validées</th>
                  <th className="text-right px-4 py-3 font-medium">Présentes</th>
                  <th className="text-right px-4 py-3 font-medium">En attente</th>
                  <th className="text-right px-4 py-3 font-medium">Places</th>
                  <th className="text-left px-4 py-3 font-medium">Journée · Matin · Après-midi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {s.parAtelier.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Aucun atelier avec ces filtres.</td></tr>
                ) : s.parAtelier.map(l => {
                  const e = nomEspace(l.atelier.espace_id);
                  const estBusiness = e?.slug === "business";
                  return (
                    <tr key={l.atelier.id}>
                      <td className="px-4 py-3 whitespace-nowrap">{dateCourte(l.atelier.date_atelier)}</td>
                      <td className="px-4 py-3"><Link to={`/admin/ateliers/${l.atelier.id}`} className="font-medium hover:underline">{l.atelier.titre}</Link></td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: couleurEspace(e?.slug) }} aria-hidden="true" />{e?.nom ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">{l.validees}</td>
                      <td className="px-4 py-3 text-right">{l.atelier.date_atelier < jour ? l.presentes : "—"}</td>
                      <td className="px-4 py-3 text-right">{l.enAttente}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{l.atelier.places_max === null ? "illimitées" : l.atelier.places_max}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {estBusiness ? `${l.creneaux.journee} · ${l.creneaux.matin} · ${l.creneaux.apres_midi}${l.creneaux.sans_reponse ? ` (+${l.creneaux.sans_reponse} sans réponse)` : ""}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default TableauAteliers;
