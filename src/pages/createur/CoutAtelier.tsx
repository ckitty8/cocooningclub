import { useEffect, useMemo, useState } from "react";
import { Info, Plus, RotateCcw, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { champ } from "@/components/admin/offre/types";
import { supabase } from "@/integrations/supabase/client";
import { useTarifsAdherent } from "@/hooks/useOffres";
import {
  calculerCout, niveauxDeRemplissage, positif, scenariosDeRemplissage,
  type LigneCout, type ModeCout, type ParametresCout,
} from "@/lib/coutAtelier";
import {
  ESPACES_SIMULES, EXEMPLES_ABONNEMENT, calculerAbonnement, type EspaceSimule, type ParametresAbonnement,
} from "@/lib/abonnementAnnuel";

const CLE_STOCKAGE = "cc_cout_atelier_v1";

/** Valeurs d'exemple à remplacer par les vrais montants. */
const EXEMPLE: ParametresCout = {
  lignes: [
    { id: "lieu", libelle: "Lieu", montant: 60, mode: "atelier" },
    { id: "animation", libelle: "Animation / intervenante", montant: 120, mode: "atelier" },
    { id: "communication", libelle: "Communication", montant: 10, mode: "atelier" },
    { id: "materiel", libelle: "Matériel", montant: 4, mode: "participante" },
    { id: "collation", libelle: "Collation", montant: 2, mode: "participante" },
  ],
  tarifStandard: 25, tarifAdherente: 18,
  nonAdherentes: 4, adherentesPayantes: 4, adherentesIncluses: 2,
  fraisPaiementPct: 0, margeCiblePct: 0, capacite: 12,
};

const lireStockage = (): ParametresCout => {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return EXEMPLE;
    const lu = JSON.parse(brut) as Partial<ParametresCout>;
    if (!Array.isArray(lu.lignes)) return EXEMPLE;
    return { ...EXEMPLE, ...lu, lignes: lu.lignes as LigneCout[] };
  } catch {
    return EXEMPLE; // stockage indisponible ou contenu illisible
  }
};

const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

interface ChampNombreProps {
  id: string;
  libelle: string;
  valeur: number;
  onChange: (n: number) => void;
  unite?: string;
  pas?: number;
}

const ChampNombre = ({ id, libelle, valeur, onChange, unite, pas = 1 }: ChampNombreProps) => (
  <div className="min-w-0">
    <label htmlFor={id} className="block text-sm font-medium mb-1.5">{libelle}</label>
    <div className="relative">
      <input id={id} type="number" inputMode="decimal" min={0} step={pas} value={valeur === 0 ? "" : valeur} placeholder="0"
        onChange={e => onChange(positif(e.target.value))} className={`${champ} ${unite ? "pr-10" : ""}`} />
      {unite && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{unite}</span>}
    </div>
  </div>
);

const CLE_ABONNEMENT = "cc_abonnement_annuel_v1";

const lireAbonnements = (): Record<EspaceSimule, ParametresAbonnement> => {
  try {
    const lu = JSON.parse(window.localStorage.getItem(CLE_ABONNEMENT) ?? "{}") as Partial<Record<EspaceSimule, Partial<ParametresAbonnement>>>;
    return Object.fromEntries(ESPACES_SIMULES.map(({ valeur }) => [valeur, { ...EXEMPLES_ABONNEMENT[valeur], ...(lu[valeur] ?? {}) }])) as Record<EspaceSimule, ParametresAbonnement>;
  } catch {
    return EXEMPLES_ABONNEMENT;
  }
};

const Ligne = ({ libelle, valeur, fort, couleur }: { libelle: string; valeur: string; fort?: boolean; couleur?: string }) => (
  <div className={`flex justify-between gap-3 ${fort ? "border-t pt-2 font-semibold" : ""} ${couleur ?? ""}`}>
    <dt className={fort ? "" : "text-muted-foreground"}>{libelle}</dt><dd className="shrink-0">{valeur}</dd>
  </div>
);

/** « Abonnement à l'année ou ateliers à l'unité ? » : un onglet par espace (17/11). */
const AbonnementAnnuel = () => {
  const [tous, setTous] = useState(lireAbonnements);
  const [onglet, setOnglet] = useState<EspaceSimule>("business");
  useEffect(() => {
    try { window.localStorage.setItem(CLE_ABONNEMENT, JSON.stringify(tous)); } catch { /* stockage indisponible */ }
  }, [tous]);

  const p = tous[onglet];
  const maj = (partiel: Partial<ParametresAbonnement>) => setTous(t => ({ ...t, [onglet]: { ...t[onglet], ...partiel } }));
  const r = useMemo(() => calculerAbonnement(p), [p]);
  const business = onglet === "business";
  const id = (c: string) => `abo-${onglet}-${c}`;

  return (
    <section className="mb-8 rounded-2xl border bg-card p-5" aria-labelledby="titre-abonnement">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titre-abonnement" className="text-lg font-semibold">Abonnement à l'année ou ateliers à l'unité ?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ce que coûte une année à une adhérente et à une non-adhérente, et ce qu'il reste à l'association après la salle.</p>
        </div>
        <button onClick={() => maj(EXEMPLES_ABONNEMENT[onglet])} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:bg-muted">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Exemple
        </button>
      </div>

      <div role="tablist" aria-label="Espace" className="mb-5 flex flex-wrap gap-2">
        {ESPACES_SIMULES.map(e => (
          <button key={e.valeur} role="tab" id={`onglet-${e.valeur}`} aria-selected={onglet === e.valeur} aria-controls="panneau-abonnement"
            onClick={() => setOnglet(e.valeur)}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${onglet === e.valeur ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {e.libelle}
          </button>
        ))}
      </div>

      <div id="panneau-abonnement" role="tabpanel" aria-labelledby={`onglet-${onglet}`} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <ChampNombre id={id("abonnement")} libelle="Abonnement à l'année" valeur={p.abonnement} onChange={n => maj({ abonnement: n })} unite="€" />
          <ChampNombre id={id("prix")} libelle="Prix d'un atelier à l'unité" valeur={p.prixAtelier} onChange={n => maj({ prixAtelier: n })} unite="€" pas={0.5} />
          <ChampNombre id={id("ateliers")} libelle="Ateliers dans l'année" valeur={p.ateliersParAn} onChange={n => maj({ ateliersParAn: Math.floor(n) })} />
          <ChampNombre id={id("conso")} libelle="Consommation obligatoire (par venue)" valeur={p.consommation} onChange={n => maj({ consommation: n })} unite="€" pas={0.5} />
          {business && (
            <ChampNombre id={id("coworking")} libelle="Coworking gratuit (séances par an)" valeur={p.coworkingParAn} onChange={n => maj({ coworkingParAn: Math.floor(n) })} />
          )}
          <ChampNombre id={id("salle")} libelle="Salle, par atelier" valeur={p.salleParAtelier} onChange={n => maj({ salleParAtelier: n })} unite="€" />
          {business && (
            <ChampNombre id={id("salle-cowork")} libelle="Salle, par séance de coworking" valeur={p.salleParCoworking} onChange={n => maj({ salleParCoworking: n })} unite="€" />
          )}
          <ChampNombre id={id("adherentes")} libelle="Adhérentes (abonnements)" valeur={p.adherentes} onChange={n => maj({ adherentes: Math.floor(n) })} />
          <ChampNombre id={id("non-adh")} libelle="Non-adhérentes par atelier" valeur={p.nonAdherentesParAtelier} onChange={n => maj({ nonAdherentesParAtelier: Math.floor(n) })} />
        </div>

        <div className="space-y-4" aria-live="polite">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-4">
              <h3 className="mb-2 text-sm font-semibold">Adhérente, sur l'année</h3>
              <dl className="space-y-1.5 text-sm">
                <Ligne libelle="Abonnement" valeur={euros(p.abonnement)} />
                <Ligne libelle={`Consommations (${p.ateliersParAn + (business ? p.coworkingParAn : 0)} venues)`} valeur={euros(r.adherenteConsommations)} />
                <Ligne libelle="Total" valeur={euros(r.adherenteTotal)} fort />
              </dl>
              {business && p.coworkingParAn > 0 && <p className="mt-2 text-xs text-muted-foreground">Dont {p.coworkingParAn} séances de coworking gratuites.</p>}
            </div>
            <div className="rounded-xl border p-4">
              <h3 className="mb-2 text-sm font-semibold">Non-adhérente, mêmes ateliers</h3>
              <dl className="space-y-1.5 text-sm">
                <Ligne libelle={`${p.ateliersParAn} ateliers × ${euros(p.prixAtelier)}`} valeur={euros(r.nonAdherenteAteliers)} />
                <Ligne libelle="Consommations" valeur={euros(r.nonAdherenteConsommations)} />
                <Ligne libelle="Total" valeur={euros(r.nonAdherenteTotal)} fort />
              </dl>
              {business && p.coworkingParAn > 0 && <p className="mt-2 text-xs text-muted-foreground">Sans le coworking, réservé aux adhérentes.</p>}
            </div>
          </div>
          <p className={`rounded-xl p-3 text-sm ${r.economie >= 0 ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-900"}`}>
            {r.economie >= 0
              ? <>Avec l'abonnement, l'adhérente économise <b>{euros(r.economie)}</b> sur ces {p.ateliersParAn} ateliers{business && p.coworkingParAn > 0 ? " et profite du coworking en plus" : ""}.</>
              : <>Sur {p.ateliersParAn} ateliers, l'abonnement coûte <b>{euros(-r.economie)}</b> de plus que l'unité{business && p.coworkingParAn > 0 ? " (mais il donne le coworking)" : ""}.</>}
            {r.seuilAteliers !== null && <> L'abonnement devient avantageux à partir de <b>{r.seuilAteliers} ateliers</b> dans l'année.</>}
          </p>
          <div className="rounded-xl border p-4">
            <h3 className="mb-2 text-sm font-semibold">Association, sur l'année</h3>
            <dl className="space-y-1.5 text-sm">
              <Ligne libelle={`Abonnements (${p.adherentes} × ${euros(p.abonnement)})`} valeur={euros(r.recettesAbonnements)} />
              <Ligne libelle={`Ateliers à l'unité (${p.nonAdherentesParAtelier} × ${euros(p.prixAtelier)} × ${p.ateliersParAn})`} valeur={euros(r.recettesUnite)} />
              <Ligne libelle="Salle" valeur={`− ${euros(r.coutSalle)}`} />
              <Ligne libelle={r.solde >= 0 ? "Excédent" : "Déficit"} valeur={euros(r.solde)} fort couleur={r.solde >= 0 ? "text-green-800" : "text-red-800"} />
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">La consommation est réglée par chaque participante au lieu d'accueil : elle n'entre pas dans les recettes de l'association.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

interface AtelierLu {
  id: string;
  titre: string;
  date_atelier: string;
  tarif_standard: number | null;
  places_max: number | null;
}

/** Simulateur de coût d'un atelier (espace créateur) : lieu, matériel, animation… contre les recettes selon le public. */
const CoutAtelier = () => {
  const [p, setP] = useState<ParametresCout>(lireStockage);
  const [ateliers, setAteliers] = useState<AtelierLu[]>([]);
  const tarifsAdherent = useTarifsAdherent();

  useEffect(() => { document.title = "Coût d'un atelier · Cocooning Club"; }, []);
  useEffect(() => {
    supabase.from("ateliers").select("id, titre, date_atelier, tarif_standard, places_max").order("date_atelier", { ascending: false }).limit(40)
      .then(({ data, error }) => { if (!error) setAteliers((data ?? []) as AtelierLu[]); });
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(p)); } catch { /* stockage indisponible : tant pis */ }
  }, [p]);

  const maj = (partiel: Partial<ParametresCout>) => setP(courant => ({ ...courant, ...partiel }));
  const majLigne = (id: string, partiel: Partial<LigneCout>) =>
    setP(courant => ({ ...courant, lignes: courant.lignes.map(l => (l.id === id ? { ...l, ...partiel } : l)) }));
  const ajouterLigne = (mode: ModeCout) =>
    setP(courant => ({ ...courant, lignes: [...courant.lignes, { id: `l${Date.now()}`, libelle: "", montant: 0, mode }] }));
  const retirerLigne = (id: string) => setP(courant => ({ ...courant, lignes: courant.lignes.filter(l => l.id !== id) }));

  const partirDe = (id: string) => {
    const a = ateliers.find(x => x.id === id);
    if (!a) return;
    const standard = a.tarif_standard ?? 0;
    maj({ tarifStandard: standard, tarifAdherente: tarifsAdherent.get(a.id) ?? standard, ...(a.places_max !== null ? { capacite: a.places_max } : {}) });
  };

  const r = useMemo(() => calculerCout(p), [p]);
  const scenarios = useMemo(() => scenariosDeRemplissage(p, niveauxDeRemplissage(p.capacite)), [p]);
  const couvre = r.resultat >= 0;

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Simulateur</h1>
          <p className="mt-1 text-muted-foreground">Abonnement à l'année contre ateliers à l'unité, puis coût détaillé d'un atelier.</p>
        </div>
      </div>

      <AbonnementAnnuel />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Coût d'un atelier</h2>
          <p className="mt-1 text-sm text-muted-foreground">Lieu, matériel, animation… : combien coûte un atelier, et à partir de combien de participantes il s'équilibre.</p>
        </div>
        <button onClick={() => setP(EXEMPLE)} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm hover:bg-muted">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Revenir à l'exemple
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-medium">Tarifs et public</h2>
            {ateliers.length > 0 && (
              <div className="mb-4 min-w-0">
                <label htmlFor="cout-atelier" className="block text-sm font-medium mb-1.5">Partir d'un atelier existant <span className="font-normal text-muted-foreground">(reprend ses tarifs et ses places)</span></label>
                <select id="cout-atelier" defaultValue="" onChange={e => partirDe(e.target.value)} className={champ}>
                  <option value="">— choisir un atelier —</option>
                  {ateliers.map(a => <option key={a.id} value={a.id}>{a.titre} · {new Date(a.date_atelier + "T00:00:00").toLocaleDateString("fr-FR")}</option>)}
                </select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampNombre id="cout-tarif-std" libelle="Tarif non-adhérente" valeur={p.tarifStandard} onChange={n => maj({ tarifStandard: n })} unite="€" pas={0.5} />
              <ChampNombre id="cout-tarif-adh" libelle="Tarif adhérente (qui règle l'atelier)" valeur={p.tarifAdherente} onChange={n => maj({ tarifAdherente: n })} unite="€" pas={0.5} />
              <ChampNombre id="cout-non-adh" libelle="Non-adhérentes" valeur={p.nonAdherentes} onChange={n => maj({ nonAdherentes: Math.floor(n) })} />
              <ChampNombre id="cout-adh-payantes" libelle="Adhérentes qui règlent" valeur={p.adherentesPayantes} onChange={n => maj({ adherentesPayantes: Math.floor(n) })} />
              <ChampNombre id="cout-adh-incluses" libelle="Adhérentes (atelier inclus dans leur formule)" valeur={p.adherentesIncluses} onChange={n => maj({ adherentesIncluses: Math.floor(n) })} />
              <ChampNombre id="cout-capacite" libelle="Places de l'atelier" valeur={p.capacite} onChange={n => maj({ capacite: Math.floor(n) })} />
              <ChampNombre id="cout-frais" libelle="Frais de paiement" valeur={p.fraisPaiementPct} onChange={n => maj({ fraisPaiementPct: Math.min(n, 100) })} unite="%" pas={0.1} />
              <ChampNombre id="cout-marge" libelle="Marge visée au-dessus des coûts" valeur={p.margeCiblePct} onChange={n => maj({ margeCiblePct: n })} unite="%" />
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium">Coûts</h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => ajouterLigne("atelier")} className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Coût par atelier</button>
                <button onClick={() => ajouterLigne("participante")} className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Coût par participante</button>
              </div>
            </div>
            <ul className="space-y-2">
              {p.lignes.map((l, i) => (
                <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_96px_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_110px_170px_auto]">
                  <input aria-label={`Libellé du coût ${i + 1}`} value={l.libelle} onChange={e => majLigne(l.id, { libelle: e.target.value })} placeholder="Ex. location de salle" maxLength={80} className={champ} />
                  <input aria-label={`Montant du coût ${i + 1} (€)`} type="number" inputMode="decimal" min={0} step={0.5} value={l.montant === 0 ? "" : l.montant} placeholder="0 €"
                    onChange={e => majLigne(l.id, { montant: positif(e.target.value) })} className={champ} />
                  <select aria-label={`Type du coût ${i + 1}`} value={l.mode} onChange={e => majLigne(l.id, { mode: e.target.value as ModeCout })} className={`${champ} col-span-2 sm:col-span-1 sm:order-none`}>
                    <option value="atelier">par atelier</option>
                    <option value="participante">par participante</option>
                  </select>
                  <button onClick={() => retirerLigne(l.id)} aria-label={`Retirer le coût ${i + 1}`} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
              {p.lignes.length === 0 && <li className="text-sm text-muted-foreground">Aucun coût : ajoutez le lieu, le matériel, l'animation…</li>}
            </ul>
          </section>
        </div>

        <div className="min-w-0 space-y-6 xl:sticky xl:top-6">
          <section className="rounded-2xl border bg-card p-5" aria-live="polite">
            <h2 className="mb-3 font-medium">Résultat pour {r.participantes} participante{r.participantes > 1 ? "s" : ""}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Coûts fixes (par atelier)</dt><dd>{euros(r.coutsFixes)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Coûts par participante ({euros(r.coutVariableParParticipante)} × {r.participantes})</dt><dd>{euros(r.coutsVariables)}</dd></div>
              <div className="flex justify-between border-t pt-2 font-medium"><dt>Coût total</dt><dd>{euros(r.coutTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Recettes ({r.payantes} qui règlent)</dt><dd>{euros(r.recettesBrutes)}</dd></div>
              {r.fraisPaiement > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Frais de paiement</dt><dd>− {euros(r.fraisPaiement)}</dd></div>}
              <div className={`flex justify-between border-t pt-2 text-base font-semibold ${couvre ? "text-green-800" : "text-red-800"}`}>
                <dt>{couvre ? "Excédent" : "Déficit"}</dt><dd>{euros(r.resultat)}</dd>
              </div>
            </dl>
            <ul className="mt-4 space-y-1.5 border-t pt-3 text-sm text-muted-foreground">
              {r.coutParParticipante !== null && <li>Coût de revient : <b className="text-foreground">{euros(r.coutParParticipante)}</b> par participante.</li>}
              <li>
                Seuil de rentabilité :{" "}
                <b className="text-foreground">
                  {r.seuilParticipantes === null ? "jamais avec ces tarifs" : `${r.seuilParticipantes} participante${r.seuilParticipantes > 1 ? "s" : ""}`}
                </b>
                {r.seuilParticipantes !== null && p.capacite > 0 && r.seuilParticipantes > p.capacite && " (au-delà des places de l'atelier)"}.
              </li>
              {r.prixMoyenConseille !== null && (
                <li>
                  Pour {p.margeCiblePct > 0 ? `${p.margeCiblePct} % de marge` : "couvrir les coûts"} : <b className="text-foreground">{euros(r.prixMoyenConseille)}</b> en moyenne par participante qui règle.
                </li>
              )}
            </ul>
          </section>

          {scenarios.length > 0 && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="mb-3 font-medium">Selon le remplissage</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1.5 pr-2 font-medium">Participantes</th>
                      <th className="py-1.5 pr-2 text-right font-medium">Coûts</th>
                      <th className="py-1.5 pr-2 text-right font-medium">Recettes</th>
                      <th className="py-1.5 text-right font-medium">Résultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map(s => (
                      <tr key={s.participantes} className="border-b last:border-0">
                        <td className="py-1.5 pr-2">{s.participantes}</td>
                        <td className="py-1.5 pr-2 text-right">{euros(s.coutTotal)}</td>
                        <td className="py-1.5 pr-2 text-right">{euros(s.recettesNettes)}</td>
                        <td className={`py-1.5 text-right font-medium ${s.resultat >= 0 ? "text-green-800" : "text-red-800"}`}>{euros(s.resultat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Même répartition du public que ci-dessus (adhérentes incluses comprises).</p>
            </section>
          )}

          <div className="flex gap-3 rounded-2xl border bg-muted/40 p-4 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Les montants affichés au départ sont des exemples à remplacer. Vos saisies sont gardées dans ce navigateur uniquement ; rien n'est enregistré sur le site. Une adhérente dont l'atelier est inclus ne règle rien pour cet atelier : sa cotisation n'est pas comptée ici.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CoutAtelier;
