import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { toast } from "sonner";
import { Copy, Download, ExternalLink, Filter, Loader2, Mail, MessageCircle, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import {
  ESPACES_ENVIE, JOURS, LIEN_ENVIES, SOUHAITS, plageLisible, STATUTS_ENVIE, compterParStatut, filtrerEnvies, libelle,
  lienCreerAtelier, lienGmailEnvie, lienWhatsappEnvie, lienWhatsappPartage, nomFichierEnvies, tableauEnvies,
  type Envie, type EspaceEnvie, type StatutEnvie,
} from "@/lib/enviesAteliers";

// Admin → Envies d'ateliers (17/11) : réponses du formulaire caché /envies-ateliers.

const COULEUR_ESPACE: Record<string, string> = { papotages: "bg-[#a0604f]", creatifs: "bg-[#56684f]", je_ne_sais_pas: "bg-[#6b5a54]" };
const COULEUR_STATUT: Record<StatutEnvie, string> = {
  nouvelle: "bg-amber-100 text-amber-900",
  a_etudier: "bg-sky-100 text-sky-900",
  retenue: "bg-green-100 text-green-900",
  programmee: "bg-violet-100 text-violet-900",
  classee: "bg-muted text-muted-foreground",
};

const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

const selectCls = "rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const boutonCls = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted";

const Envies = () => {
  const [envies, setEnvies] = useState<Envie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [statut, setStatut] = useState<StatutEnvie | "">("");
  const [espace, setEspace] = useState<EspaceEnvie | "">("");
  const [recherche, setRecherche] = useState("");
  const [plafond, setPlafond] = useState("");
  const [plafondEnregistre, setPlafondEnregistre] = useState("");

  const charger = async () => {
    const [r, p] = await Promise.all([
      supabase.from("envies_ateliers").select("*").order("cree_le", { ascending: false }),
      supabase.from("parametres_envies").select("plafond_materiel").maybeSingle(),
    ]);
    if (r.error) {
      setErreur(/envies_ateliers/.test(r.error.message)
        ? "La table des envies n'existe pas encore dans la base : la migration 20261117000000_envies_ateliers.sql est à appliquer."
        : r.error.message);
    } else {
      setErreur(null);
      setEnvies((r.data ?? []).map(e => ({ ...e, jours: e.jours ?? [] })) as Envie[]);
    }
    const v = p.data?.plafond_materiel != null ? String(p.data.plafond_materiel).replace(/\.00$/, "") : "";
    setPlafond(v);
    setPlafondEnregistre(v);
    setChargement(false);
  };

  useEffect(() => { void charger(); }, []);

  const affichees = useMemo(() => filtrerEnvies(envies, { statut, espace, recherche }), [envies, statut, espace, recherche]);
  const parStatut = useMemo(() => compterParStatut(envies), [envies]);
  const animatrices = envies.filter(e => e.souhait === "animer" || e.souhait === "animer_ensemble").length;

  const changerStatut = async (e: Envie, s: StatutEnvie) => {
    const { error } = await supabase.from("envies_ateliers").update({ statut: s }).eq("id", e.id);
    if (error) { toast.error(`Modification impossible : ${error.message}`); return; }
    setEnvies(prev => prev.map(x => (x.id === e.id ? { ...x, statut: s } : x)));
    logAction("envie.statut", "envies_ateliers", e.id, { avant: e.statut, apres: s });
  };

  const supprimer = async (e: Envie) => {
    if (!confirm(`Supprimer l'envie « ${e.idee} » ?`)) return;
    const { error } = await supabase.from("envies_ateliers").delete().eq("id", e.id);
    if (error) { toast.error(`Suppression impossible : ${error.message}`); return; }
    setEnvies(prev => prev.filter(x => x.id !== e.id));
    logAction("envie.suppression", "envies_ateliers", e.id, null);
  };

  const enregistrerPlafond = async () => {
    const texte = plafond.trim().replace(",", ".");
    const valeur = texte === "" ? null : Number(texte);
    if (valeur !== null && (Number.isNaN(valeur) || valeur < 0)) { toast.error("Montant invalide"); return; }
    const { error } = await supabase.from("parametres_envies").update({ plafond_materiel: valeur, modifie_le: new Date().toISOString() }).eq("id", true);
    if (error) { toast.error(`Enregistrement impossible : ${error.message}`); return; }
    setPlafondEnregistre(plafond.trim());
    toast.success(valeur === null ? "Montant retiré du formulaire" : "Montant enregistré : il s'affiche dans le formulaire");
    logAction("envie.plafond", "parametres_envies", null, { plafond: valeur });
  };

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(LIEN_ENVIES);
      toast.success("Lien du formulaire copié");
    } catch {
      window.prompt("Copiez le lien du formulaire :", LIEN_ENVIES);
    }
  };

  const exporter = async () => {
    const { fichierExcel, telecharger } = await import("@/lib/exportMembres");
    telecharger(await fichierExcel([{ nom: "Envies d'ateliers", tableau: tableauEnvies(affichees) }]), nomFichierEnvies());
    logAction("envie.export", "envies_ateliers", null, { nombre: affichees.length });
  };

  if (chargement) return (
    <AdminLayout>
      <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-terracotta" /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Sparkles className="h-6 w-6 text-terracotta" />
          Envies d'ateliers
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Réponses du formulaire caché « Tes envies d'ateliers » (sans connexion, hors menu et hors Google ; lien discret dans le pied de page).
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <span className="text-sm font-medium">Lien du formulaire :</span>
        <code className="break-all rounded-lg bg-muted px-2 py-1 text-xs">{LIEN_ENVIES}</code>
        <button type="button" onClick={copierLien} className={boutonCls}><Copy className="h-3.5 w-3.5" />Copier</button>
        <a href={lienWhatsappPartage()} target="_blank" rel="noopener noreferrer" className={boutonCls}><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>
        <Link to="/envies-ateliers" target="_blank" className={boutonCls}><ExternalLink className="h-3.5 w-3.5" />Voir</Link>
        <div className="flex flex-wrap items-center gap-2 text-sm lg:ml-auto">
          <label htmlFor="plafond-materiel">Matériel pris en charge jusqu'à</label>
          <input
            id="plafond-materiel" inputMode="decimal" value={plafond} onChange={e => setPlafond(e.target.value)}
            className="w-20 rounded-lg border bg-background px-2 py-1.5 text-right text-sm" placeholder="—"
          />
          <span>€ par atelier</span>
          {plafond.trim() !== plafondEnregistre && (
            <button type="button" onClick={enregistrerPlafond} className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Enregistrer</button>
          )}
        </div>
      </div>

      {erreur && <p className="mb-5 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{erreur}</p>}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Envies reçues", envies.length],
          ["Nouvelles", parStatut.nouvelle],
          ["Retenues ou programmées", parStatut.retenue + parStatut.programmee],
          ["Proposent d'animer", animatrices],
        ].map(([l, n]) => (
          <div key={l} className="rounded-2xl border bg-card p-4">
            <p className="text-2xl font-bold">{n}</p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Filter className="h-4 w-4" /> Filtres :</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setStatut("")} aria-pressed={statut === ""} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${statut === "" ? "border-foreground bg-foreground text-background" : "hover:bg-muted"}`}>
            Toutes ({envies.length})
          </button>
          {STATUTS_ENVIE.map(s => (
            <button key={s.valeur} type="button" onClick={() => setStatut(s.valeur)} aria-pressed={statut === s.valeur}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${statut === s.valeur ? "border-foreground bg-foreground text-background" : "hover:bg-muted"}`}>
              {s.pluriel} ({parStatut[s.valeur]})
            </button>
          ))}
        </div>
        <select value={espace} onChange={e => setEspace(e.target.value as EspaceEnvie | "")} className={selectCls} aria-label="Espace">
          <option value="">Tous les espaces</option>
          {ESPACES_ENVIE.map(e => <option key={e.valeur} value={e.valeur}>{e.libelle}</option>)}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher" className={`${selectCls} pl-9`} />
        </div>
        <button type="button" onClick={exporter} disabled={!affichees.length} className={`${boutonCls} disabled:opacity-50 lg:ml-auto`}>
          <Download className="h-3.5 w-3.5" />Exporter en Excel ({affichees.length})
        </button>
      </div>

      {affichees.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">{envies.length ? "Aucune envie ne correspond aux filtres." : "Aucune envie reçue pour le moment. Partagez le lien du formulaire !"}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {affichees.map(e => {
            const gmail = lienGmailEnvie(e);
            const whatsapp = lienWhatsappEnvie(e);
            return (
              <li key={e.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 lg:flex-row">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{e.idee}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT[e.statut]}`}>{libelle(STATUTS_ENVIE, e.statut)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[e.prenom + (e.nom ? ` ${e.nom}` : ""), e.contact, `reçue le ${dateLongue(e.cree_le)}`].filter(Boolean).join(" · ")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {e.espace && <span className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${COULEUR_ESPACE[e.espace] ?? "bg-[#6b5a54]"}`}>{libelle(ESPACES_ENVIE, e.espace)}</span>}
                    {e.souhait && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{libelle(SOUHAITS, e.souhait)}</span>}
                  </div>
                  {e.details && <p className="whitespace-pre-line text-sm">{e.details}</p>}
                  {(e.materiel || e.budget || e.jours.length > 0 || e.heure_debut || e.heure_fin) && (
                    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      {e.materiel && <div><dt className="inline">Matériel : </dt><dd className="inline font-medium text-foreground">{e.materiel}</dd></div>}
                      {e.budget && <div><dt className="inline">Budget : </dt><dd className="inline font-medium text-foreground">{e.budget}</dd></div>}
                      {e.jours.length > 0 && <div><dt className="inline">Jours : </dt><dd className="inline font-medium text-foreground">{e.jours.map(j => libelle(JOURS, j).toLowerCase()).join(", ")}</dd></div>}
                      {(e.heure_debut || e.heure_fin) && <div><dt className="inline">Horaires : </dt><dd className="inline font-medium text-foreground">{plageLisible(e.heure_debut, e.heure_fin).toLowerCase()}</dd></div>}
                    </dl>
                  )}
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:w-64 lg:flex-col lg:items-stretch">
                  <select value={e.statut} onChange={ev => changerStatut(e, ev.target.value as StatutEnvie)} className={selectCls} aria-label={`Statut de l'envie « ${e.idee} »`}>
                    {STATUTS_ENVIE.map(s => <option key={s.valeur} value={s.valeur}>{s.libelle}</option>)}
                  </select>
                  <Link to={lienCreerAtelier(e)} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
                    <Plus className="h-3.5 w-3.5" />Créer l'atelier
                  </Link>
                  {gmail && <a href={gmail} target="_blank" rel="noopener noreferrer" className={`${boutonCls} justify-center`}><Mail className="h-3.5 w-3.5" />Répondre dans Gmail</a>}
                  {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${boutonCls} justify-center`}><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>}
                  {!gmail && !whatsapp && <p className="text-xs text-muted-foreground">Pas de contact laissé</p>}
                  <button type="button" onClick={() => supprimer(e)} className={`${boutonCls} justify-center text-destructive`}><Trash2 className="h-3.5 w-3.5" />Supprimer</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminLayout>
  );
};

export default Envies;
