import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import FormuleCard from "@/components/admin/offre/FormuleCard";
import FormuleModal from "@/components/admin/offre/FormuleModal";
import AdhesionDrawer from "@/components/admin/offre/AdhesionDrawer";
import AjoutAdhesionModal from "@/components/admin/offre/AjoutAdhesionModal";
import type { Adhesion, Espace, Formule } from "@/components/admin/offre/types";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { withTimeout } from "@/utils/withTimeout";
import {
  aujourdhuiIso, estEnCours, formaterNumero, fondFormule, LIBELLES_STATUT, MODES_REGLEMENT,
  statutAdhesion, type StatutAffiche,
} from "@/lib/adhesions";

type Onglet = "formules" | "adhesions";
type Filtre = "a_valider" | "en_cours" | "expire_bientot" | "expiree" | "toutes";

const FILTRES: { cle: Filtre; libelle: string }[] = [
  { cle: "a_valider", libelle: "À valider" },
  { cle: "en_cours", libelle: "En cours" },
  { cle: "expire_bientot", libelle: "Expirent bientôt" },
  { cle: "expiree", libelle: "Expirées" },
  { cle: "toutes", libelle: "Toutes" },
];

const BADGE_STATUT: Record<StatutAffiche, string> = {
  a_valider: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  expire_bientot: "bg-orange-100 text-orange-700",
  expiree: "bg-gray-100 text-gray-600",
  refusee: "bg-red-100 text-red-600",
};

const dateFr = (iso: string | null) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("fr-FR") : "—");

// La migration n'est pas encore appliquée : les tables n'existent pas.
const tableAbsente = (err: unknown) => {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === "42P01" || e?.code === "PGRST205" || /schema cache|does not exist/i.test(e?.message ?? "");
};

const NOUVELLE_FORMULE: Formule = {
  id: "", nom: "", description: null, couleur: "terracotta", prix: 0, duree_mois: 12,
  lien_helloasso: null, modes_reglement: ["en_ligne", "virement", "especes"], est_active: true, ordre: 0,
  formule_espaces: [],
};

const Offre = () => {
  const [onglet, setOnglet] = useState<Onglet>("formules");
  const [formules, setFormules] = useState<Formule[]>([]);
  const [espaces, setEspaces] = useState<Espace[]>([]);
  const [adhesions, setAdhesions] = useState<Adhesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationManquante, setMigrationManquante] = useState(false);

  const [filtre, setFiltre] = useState<Filtre>("a_valider");
  const [recherche, setRecherche] = useState("");
  const [formuleModal, setFormuleModal] = useState<Formule | null>(null);
  const [adhesionOuverte, setAdhesionOuverte] = useState<Adhesion | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);

  useEffect(() => {
    document.title = "Offre & adhésions · Cocooning Club";
  }, []);

  const charger = useCallback(async () => {
    try {
      // Filet de secours : les adhésions échues ramènent la personne à « inscrit ». Non bloquant.
      await withTimeout(supabase.rpc("expirer_adhesions")).catch(() => undefined);

      const [fRes, eRes, aRes] = await withTimeout(Promise.all([
        supabase.from("formules").select("*, formule_espaces(antenne_id)").order("ordre"),
        supabase.from("antennes").select("id, nom, slug").order("ordre_affichage"),
        supabase.from("adhesions")
          .select("*, utilisateurs(prenom, nom, email, telephone, role, commune, activite), formules(nom, couleur, duree_mois)")
          .order("cree_le", { ascending: false }),
      ]));
      const erreur = fRes.error ?? aRes.error;
      if (erreur) throw erreur;
      setMigrationManquante(false);
      setFormules((fRes.data as Formule[]) ?? []);
      setEspaces((eRes.data as Espace[]) ?? []);
      setAdhesions((aRes.data as Adhesion[]) ?? []);
    } catch (err) {
      if (tableAbsente(err)) setMigrationManquante(true);
      else {
        console.error("[Offre.charger]", err);
        toast.error("Erreur lors du chargement de l'offre");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const aujourdhui = aujourdhuiIso();
  const lignes = useMemo(
    () => adhesions.map(a => ({ adhesion: a, statut: statutAdhesion(a, aujourdhui) })),
    [adhesions, aujourdhui],
  );

  const nb = (s: StatutAffiche) => lignes.filter(l => l.statut === s).length;
  const enCours = lignes.filter(l => estEnCours(l.statut));
  const nbAdherentes = new Set(enCours.map(l => l.adhesion.utilisateur_id)).size;
  const annee = aujourdhui.slice(0, 4);
  const cotisationsAnnee = lignes
    .filter(l => l.adhesion.statut === "active" && l.adhesion.date_validation?.startsWith(annee))
    .reduce((somme, l) => somme + Number(l.adhesion.montant), 0);

  const compteFiltre = (f: Filtre) =>
    f === "toutes" ? lignes.length
    : f === "en_cours" ? enCours.length
    : nb(f);

  const visibles = lignes.filter(({ adhesion, statut }) => {
    const okFiltre = filtre === "toutes" || (filtre === "en_cours" ? estEnCours(statut) : statut === filtre);
    const q = recherche.trim().toLowerCase();
    const texte = `${adhesion.utilisateurs?.prenom ?? ""} ${adhesion.utilisateurs?.nom ?? ""} ${adhesion.utilisateurs?.email ?? ""} ${formaterNumero(adhesion.numero)}`.toLowerCase();
    return okFiltre && (!q || texte.includes(q));
  });

  const basculerActive = async (f: Formule) => {
    const { error } = await supabase.from("formules").update({ est_active: !f.est_active }).eq("id", f.id);
    if (error) { toast.error("La modification a échoué."); return; }
    logAction("formule.update", "formules", f.id, { est_active: !f.est_active });
    charger();
  };

  const prochainOrdre = Math.max(0, ...formules.map(f => f.ordre)) + 1;
  const nouvelle = () => setFormuleModal({ ...NOUVELLE_FORMULE, ordre: prochainOrdre });
  const dupliquer = (f: Formule) =>
    setFormuleModal({ ...f, id: "", nom: `${f.nom} (copie)`, est_active: false, ordre: prochainOrdre });

  return (
    <AdminLayout>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold">Offre & adhésions</h1>
          <p className="text-muted-foreground text-sm mt-1">Configurez vos formules d'adhésion et suivez les adhérentes.</p>
        </div>
        {!migrationManquante && (
          <button
            onClick={() => (onglet === "formules" ? nouvelle() : setAjoutOuvert(true))}
            disabled={onglet === "adhesions" && formules.filter(f => f.est_active).length === 0}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {onglet === "formules" ? "Nouvelle formule" : "Ajouter une adhésion"}
          </button>
        )}
      </div>

      {migrationManquante ? (
        <div role="alert" className="rounded-2xl border border-yellow-300 bg-yellow-50 p-6 text-sm text-yellow-900">
          <p className="font-semibold mb-1">Cette page attend la mise à jour de la base de données.</p>
          <p>
            Les tables des formules et des adhésions n'existent pas encore. Il suffit d'exécuter la migration{" "}
            <code>20261023000003_offre_et_adhesions.sql</code> dans le SQL Editor de Supabase, puis de recharger la page.
          </p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div role="tablist" className="flex gap-6 border-b mb-5">
            {([["formules", "Formules"], ["adhesions", "Adhésions"]] as [Onglet, string][]).map(([cle, libelle]) => (
              <button key={cle} role="tab" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}
                className={`pb-2.5 text-sm font-medium border-b-2 -mb-px ${onglet === cle ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {libelle}
                {cle === "adhesions" && nb("a_valider") > 0 && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">{nb("a_valider")}</span>
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              [nbAdherentes, "adhérentes actives"],
              [nb("a_valider"), "adhésions à valider"],
              [nb("expire_bientot"), "expirent dans 30 jours"],
              [`${cotisationsAnnee.toLocaleString("fr-FR")} €`, "cotisations de l'année"],
            ].map(([valeur, libelle]) => (
              <div key={libelle} className="bg-card border rounded-2xl px-4 py-3">
                <p className="font-display text-2xl text-primary">{valeur}</p>
                <p className="text-xs text-muted-foreground">{libelle}</p>
              </div>
            ))}
          </div>

          {onglet === "formules" ? (
            formules.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-lg font-medium">Aucune formule</p>
                <p className="text-sm mt-1">Cliquez sur « Nouvelle formule » pour créer votre première offre.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {formules.map(f => (
                  <FormuleCard
                    key={f.id}
                    formule={f}
                    espaces={espaces}
                    nbActives={new Set(enCours.filter(l => l.adhesion.formule_id === f.id).map(l => l.adhesion.utilisateur_id)).size}
                    onModifier={() => setFormuleModal(f)}
                    onDupliquer={() => dupliquer(f)}
                    onBasculer={() => basculerActive(f)}
                  />
                ))}
              </div>
            )
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="inline-flex flex-wrap rounded-full border bg-card p-0.5" role="group" aria-label="Filtrer les adhésions">
                  {FILTRES.map(({ cle, libelle }) => (
                    <button key={cle} onClick={() => setFiltre(cle)} aria-pressed={filtre === cle}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filtre === cle ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                      {libelle} <span className="opacity-70">({compteFiltre(cle)})</span>
                    </button>
                  ))}
                </div>
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={recherche} onChange={e => setRecherche(e.target.value)} aria-label="Rechercher une adhérente"
                    placeholder="Rechercher un nom, un numéro…"
                    className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              {visibles.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground">
                  <p className="font-medium">{adhesions.length === 0 ? "Aucune adhésion pour l'instant" : "Aucun résultat"}</p>
                </div>
              ) : (
                <>
                <ul className="space-y-3 md:hidden">
                  {visibles.map(({ adhesion: a, statut }) => (
                    <li key={a.id} className="bg-card rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{a.utilisateurs?.prenom} {a.utilisateurs?.nom}</p>
                          <p className="text-xs text-muted-foreground truncate">N° {formaterNumero(a.numero)} · {a.utilisateurs?.email}</p>
                        </div>
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE_STATUT[statut]}`}>{LIBELLES_STATUT[statut]}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 mt-3">
                        <div className="text-xs text-muted-foreground">
                          {a.formules?.nom} · {MODES_REGLEMENT[a.mode_reglement] ?? a.mode_reglement}
                          {a.valable_jusqu_au && <> · jusqu'au {dateFr(a.valable_jusqu_au)}</>}
                        </div>
                        <button onClick={() => setAdhesionOuverte(a)}
                          className={`shrink-0 px-3 py-1.5 text-xs rounded-full border ${statut === "a_valider" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
                          {statut === "a_valider" ? "✓ Valider" : "Voir"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block bg-card rounded-2xl border overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr>
                        {["N°", "Adhérente", "Formule", "Règlement", "Cotisation reçue", "Valable jusqu'au", "Statut", ""].map(h => (
                          <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map(({ adhesion: a, statut }) => (
                        <tr key={a.id} className="border-t hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">N° {formaterNumero(a.numero)}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{a.utilisateurs?.prenom} {a.utilisateurs?.nom}</p>
                            <p className="text-xs text-muted-foreground">{a.utilisateurs?.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            {a.formules && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap" style={{ backgroundColor: fondFormule(a.formules.couleur) }}>
                                {a.formules.nom.replace(/^Cocooning\s+/i, "")}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{MODES_REGLEMENT[a.mode_reglement] ?? a.mode_reglement}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{dateFr(a.cotisation_recue_le)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{dateFr(a.valable_jusqu_au)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${BADGE_STATUT[statut]}`}>{LIBELLES_STATUT[statut]}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => setAdhesionOuverte(a)}
                              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${statut === "a_valider" ? "bg-primary text-primary-foreground border-primary hover:opacity-90" : "hover:bg-muted"}`}>
                              {statut === "a_valider" ? "✓ Valider" : "Voir"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {formuleModal && (
        <FormuleModal
          formule={formuleModal}
          espaces={espaces}
          onClose={() => setFormuleModal(null)}
          onSaved={() => { setFormuleModal(null); charger(); }}
        />
      )}
      {adhesionOuverte && (
        <AdhesionDrawer
          adhesion={adhesionOuverte}
          onClose={() => setAdhesionOuverte(null)}
          onDone={() => { setAdhesionOuverte(null); charger(); }}
        />
      )}
      {ajoutOuvert && (
        <AjoutAdhesionModal
          formules={formules}
          onClose={() => setAjoutOuvert(false)}
          onSaved={() => { setAjoutOuvert(false); setOnglet("adhesions"); setFiltre("a_valider"); charger(); }}
        />
      )}
    </AdminLayout>
  );
};

export default Offre;
