import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/utils/withTimeout";
import { aujourdhuiIso } from "@/lib/adhesions";
import { ateliersParEspace, chiffresAteliers, couleurEspace } from "@/lib/calendrierAteliers";
import { ESPACES_PAR_SLUG } from "@/lib/espaces";

interface AtelierChiffres {
  id: string;
  date_atelier: string;
  statut: string;
  places_disponibles: number | null;
  espace_id: string | null;
}
interface Espace { id: string; nom: string; slug: string }

/**
 * Tableau de bord des ateliers (menu Ateliers → « Tableau de bord ») : les chiffres clés de l'écran
 * « Création des ateliers » et le nombre d'ateliers par espace. Lecture seule.
 */
const TableauAteliers = () => {
  const [ateliers, setAteliers] = useState<AtelierChiffres[]>([]);
  const [espaces, setEspaces] = useState<Espace[]>([]);
  const [aTraiter, setATraiter] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [aRes, eRes, iRes] = await withTimeout(Promise.all([
          supabase.from("ateliers").select("id, date_atelier, statut, places_disponibles, espace_id"),
          supabase.from("espaces").select("id, nom, slug").order("ordre_affichage"),
          supabase.from("inscriptions").select("id", { count: "exact", head: true }).eq("statut", "en_attente"),
        ]));
        if (aRes.error || eRes.error) throw aRes.error ?? eRes.error;
        setAteliers((aRes.data as AtelierChiffres[]) ?? []);
        setEspaces((eRes.data as Espace[]) ?? []);
        setATraiter(iRes.count ?? 0);
      } catch (err) {
        console.error("[TableauAteliers] error:", err);
        setErreur(true);
      } finally {
        setChargement(false);
      }
    })();
  }, []);

  const jour = aujourdhuiIso();
  const c = chiffresAteliers(ateliers, jour);
  const parEspace = ateliersParEspace(ateliers, espaces, jour);
  const maxAVenir = Math.max(1, ...parEspace.map(l => l.aVenir));

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord des ateliers</h1>
          <p className="text-muted-foreground text-sm mt-1">{ateliers.length} atelier{ateliers.length > 1 ? "s" : ""} au total</p>
        </div>
        <Link to="/admin/ateliers"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Créer un atelier
        </Link>
      </div>

      {chargement ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : erreur ? (
        <p className="text-muted-foreground">Les chiffres n'ont pas pu être chargés. Recharge la page.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {([
              [c.aVenir, "ateliers à venir", null],
              [c.placesLibres, "places encore libres", null],
              [aTraiter, "pré-inscriptions à traiter", "/admin/pre-inscriptions"],
              [c.brouillons, "brouillons à publier", null],
            ] as [number, string, string | null][]).map(([valeur, libelle, lien]) => {
              const contenu = (
                <>
                  <p className="font-display text-2xl text-terracotta">{valeur}</p>
                  <p className="text-xs text-muted-foreground">{libelle}</p>
                </>
              );
              return lien ? (
                <Link key={libelle} to={lien} className="bg-card border rounded-2xl px-4 py-3 hover:bg-muted/40 transition-colors">{contenu}</Link>
              ) : (
                <div key={libelle} className="bg-card border rounded-2xl px-4 py-3">{contenu}</div>
              );
            })}
          </div>

          <h2 className="font-display text-xl text-terracotta mb-3">Ateliers par espace</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {parEspace.map(l => {
              const logo = ESPACES_PAR_SLUG[l.slug]?.logo;
              return (
                <section key={l.id} aria-label={`Espace ${l.nom}`} className="bg-card border rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {logo
                      ? <img src={logo} alt="" className="h-8 w-14 object-contain shrink-0" />
                      : <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: couleurEspace(l.slug) }} aria-hidden="true" />}
                    <h3 className="font-medium">{l.nom}</h3>
                  </div>
                  <p className="font-display text-3xl text-terracotta leading-none">{l.aVenir}</p>
                  <p className="text-xs text-muted-foreground mb-2">atelier{l.aVenir > 1 ? "s" : ""} à venir</p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${(l.aVenir / maxAVenir) * 100}%`, backgroundColor: couleurEspace(l.slug) }} />
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div><dt className="text-muted-foreground">Passés</dt><dd className="font-medium text-sm">{l.passes}</dd></div>
                    <div><dt className="text-muted-foreground">Brouillons</dt><dd className="font-medium text-sm">{l.brouillons}</dd></div>
                    <div><dt className="text-muted-foreground">Total</dt><dd className="font-medium text-sm">{l.total}</dd></div>
                  </dl>
                </section>
              );
            })}
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default TableauAteliers;
