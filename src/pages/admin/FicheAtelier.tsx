import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CircleDashed, Download, Euro, MapPin, Pencil, Search, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import BadgePhotos from "@/components/BadgePhotos";
import { useAutorisationsImage } from "@/hooks/useAutorisationsImage";
import { supabase } from "@/integrations/supabase/client";
import { ESPACES_PAR_SLUG } from "@/lib/espaces";
import { csvInscrites, resumeInscrites } from "@/lib/ficheAtelier";
import { LIBELLES_PHOTOS, etatPhotos } from "@/lib/autorisationImage";
import { inscIdentite } from "@/lib/inscriptionIdentite";
import { googleMapsSearchUrl } from "@/utils/googleMaps";
import { dateLongue } from "@/lib/dates";

interface AtelierFiche {
  id: string;
  titre: string;
  description: string | null;
  description_courte: string | null;
  date_atelier: string;
  date_fin_inscription: string | null;
  heure_debut: string | null;
  heure_fin: string | null;
  duree: string | null;
  lieu: string | null;
  adresse: string | null;
  places_max: number;
  places_disponibles: number;
  tarif_standard: number | null;
  tarif_affichage: string | null;
  niveau: string | null;
  statut: string;
  antennes: { nom: string; slug: string } | null;
}

interface Inscrite {
  id: string;
  utilisateur_id: string | null;
  prenom_invite: string | null;
  nom_invite: string | null;
  email_invite: string | null;
  telephone_invite: string | null;
  date_naissance: string | null;
  statut: "en_attente" | "confirme" | "annule";
  statut_paiement: "en_attente" | "paye" | "non_requis";
  present: boolean | null;
  inscrit_le: string;
  utilisateurs: { prenom: string | null; nom: string | null; email: string | null; telephone: string | null; date_naissance: string | null; role: string | null } | null;
}

const STATUTS = { en_attente: "En attente", confirme: "Validée", annule: "Refusée" } as const;
const BADGE_STATUT = { en_attente: "bg-amber-100 text-amber-700", confirme: "bg-green-100 text-green-700", annule: "bg-red-100 text-red-700" } as const;
const STATUT_ATELIER: Record<string, string> = { brouillon: "Brouillon", publie: "Publié", complet: "Complet", annule: "Annulé", termine: "Terminé" };


type Onglet = "infos" | "inscrites";
type Filtre = "toutes" | "en_attente" | "confirme";

const FicheAtelier = () => {
  const { id } = useParams<{ id: string }>();
  const [atelier, setAtelier] = useState<AtelierFiche | null>(null);
  const [inscrites, setInscrites] = useState<Inscrite[]>([]);
  const [loading, setLoading] = useState(true);
  const [onglet, setOnglet] = useState<Onglet>("inscrites");
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [recherche, setRecherche] = useState("");
  const autorisations = useAutorisationsImage(inscrites.map(i => i.utilisateur_id));

  const charger = useCallback(async () => {
    if (!id) return;
    const [aRes, iRes] = await Promise.all([
      supabase.from("ateliers").select("*, antennes(nom, slug)").eq("id", id).maybeSingle(),
      supabase.from("inscriptions").select("*, utilisateurs(prenom, nom, email, telephone, date_naissance, role)").eq("atelier_id", id).order("inscrit_le"),
    ]);
    setAtelier((aRes.data as unknown as AtelierFiche) ?? null);
    const lignes = (iRes.data as unknown as Inscrite[]) ?? [];

    // Pré-inscription faite en « invitée » avec l'e-mail d'un compte existant : on retrouve la fiche du compte.
    const emails = Array.from(new Set(lignes.filter(i => !i.utilisateur_id && i.email_invite).map(i => i.email_invite!.toLowerCase())));
    if (emails.length) {
      const { data } = await supabase.from("utilisateurs").select("prenom, nom, email, telephone, date_naissance, role").in("email", emails);
      const parEmail = new Map((data ?? []).map(u => [String(u.email).toLowerCase(), u as NonNullable<Inscrite["utilisateurs"]>]));
      for (const i of lignes) {
        if (!i.utilisateur_id && i.email_invite && !i.utilisateurs) i.utilisateurs = parEmail.get(i.email_invite.toLowerCase()) ?? null;
      }
    }
    setInscrites(lignes);
    setLoading(false);
  }, [id]);

  useEffect(() => { charger(); }, [charger]);

  useEffect(() => {
    if (atelier) document.title = `${atelier.titre} · Cocooning Club`;
  }, [atelier]);

  const tarif = atelier?.tarif_standard ?? 0;
  const payant = tarif > 0;
  const resume = useMemo(() => resumeInscrites(inscrites, tarif), [inscrites, tarif]);
  const logo = atelier?.antennes ? ESPACES_PAR_SLUG[atelier.antennes.slug]?.logo : undefined;

  const visibles = inscrites.filter(i => {
    const ident = inscIdentite(i);
    const q = recherche.trim().toLowerCase();
    return (filtre === "toutes" || i.statut === filtre) && (!q || `${ident.prenom} ${ident.nom} ${ident.email ?? ""}`.toLowerCase().includes(q));
  });

  const basculerPresence = async (i: Inscrite) => {
    const { error } = await supabase.from("inscriptions").update({ present: !i.present }).eq("id", i.id);
    if (error) { toast.error("La modification a échoué."); return; }
    setInscrites(prev => prev.map(x => (x.id === i.id ? { ...x, present: !i.present } : x)));
  };

  // Cycle en_attente ↔ paye ; un atelier gratuit garde « non requis ».
  const basculerPaiement = async (i: Inscrite) => {
    if (i.statut_paiement === "non_requis" && !payant) return;
    const suivant = i.statut_paiement === "paye" ? "en_attente" : "paye";
    const { error } = await supabase.from("inscriptions").update({ statut_paiement: suivant }).eq("id", i.id);
    if (error) { toast.error("La modification a échoué."); return; }
    setInscrites(prev => prev.map(x => (x.id === i.id ? { ...x, statut_paiement: suivant } : x)));
  };

  const exporter = () => {
    if (!atelier) return;
    const colonnes = ["Prénom", "Nom", "E-mail", "Téléphone", "Statut", "Paiement", "Présente", "Consentement photo"];
    const lignes = inscrites.map(i => {
      const ident = inscIdentite(i);
      return {
        "Prénom": ident.prenom, "Nom": ident.nom, "E-mail": ident.email ?? "", "Téléphone": ident.telephone ?? "",
        "Statut": STATUTS[i.statut], "Paiement": i.statut_paiement === "paye" ? "Payé" : i.statut_paiement === "non_requis" ? "Gratuit" : "Non payé",
        "Présente": i.present ? "Oui" : "Non",
        "Consentement photo": i.utilisateur_id ? LIBELLES_PHOTOS[etatPhotos(autorisations.get(i.utilisateur_id))] : LIBELLES_PHOTOS.inconnu,
      };
    });
    const blob = new Blob([csvInscrites(lignes, colonnes)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inscrites-atelier.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) {
    return <AdminLayout><div className="flex justify-center h-48 items-center"><div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></AdminLayout>;
  }
  if (!atelier) {
    return (
      <AdminLayout>
        <Link to="/admin/ateliers" className="text-sm text-muted-foreground hover:text-foreground">‹ Ateliers</Link>
        <p className="mt-6 text-muted-foreground">Cet atelier n'existe plus.</p>
      </AdminLayout>
    );
  }

  const kpis: [string, string][] = [
    [`${atelier.places_max - atelier.places_disponibles} / ${atelier.places_max}`, "places prises"],
    [String(resume.confirmees), "validées"],
    [String(resume.aTraiter), "à traiter"],
    [payant ? `${resume.encaisse} €` : "Gratuit", payant ? `encaissés sur ${resume.attendu} € attendus` : "aucun paiement"],
  ];

  return (
    <AdminLayout>
      <Link to="/admin/ateliers" className="text-sm text-muted-foreground hover:text-foreground">‹ Ateliers</Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3 mb-5">
        <div className="flex items-center gap-4 min-w-0">
          {logo && <img src={logo} alt="" className="h-14 w-20 object-contain shrink-0" />}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{atelier.titre}</h1>
            <p className="text-sm text-muted-foreground">
              {dateLongue(atelier.date_atelier)}{atelier.heure_debut && ` · ${atelier.heure_debut.slice(0, 5)}`}{atelier.heure_fin && ` – ${atelier.heure_fin.slice(0, 5)}`}
              {atelier.lieu && ` · ${atelier.lieu}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted">{STATUT_ATELIER[atelier.statut] ?? atelier.statut}</span>
          <Link to={`/admin/pre-inscriptions?atelier=${atelier.id}`} className="px-4 py-2 border rounded-full text-sm hover:bg-muted">Pré-inscriptions</Link>
          <Link to={`/admin/ateliers?modifier=${atelier.id}`} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90">
            <Pencil className="w-3.5 h-3.5" /> Modifier
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map(([valeur, libelle]) => (
          <div key={libelle} className="bg-card border rounded-2xl px-4 py-3">
            <p className="font-display text-2xl text-primary">{valeur}</p>
            <p className="text-xs text-muted-foreground">{libelle}</p>
          </div>
        ))}
      </div>

      <div role="tablist" className="flex gap-6 border-b mb-5">
        {([["inscrites", `Inscrites (${resume.total})`], ["infos", "Infos"]] as [Onglet, string][]).map(([cle, libelle]) => (
          <button key={cle} role="tab" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}
            className={`pb-2.5 text-sm font-medium border-b-2 -mb-px ${onglet === cle ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {libelle}
          </button>
        ))}
      </div>

      {onglet === "infos" ? (
        <div className="grid gap-5 lg:grid-cols-2 text-sm">
          <section className="bg-card border rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold">Description</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{atelier.description || atelier.description_courte || "Aucune description."}</p>
          </section>
          <section className="bg-card border rounded-2xl p-5 space-y-2 text-muted-foreground">
            <h2 className="font-semibold text-foreground">Pratique</h2>
            <p>Espace : {atelier.antennes?.nom ?? "—"}</p>
            <p>Durée : {atelier.duree ?? "—"}</p>
            <p>Tarif : {atelier.tarif_affichage ?? (payant ? `${tarif} €` : "gratuit")}</p>
            <p>Niveau : {atelier.niveau ?? "—"}</p>
            <p>Fin des pré-inscriptions : {atelier.date_fin_inscription ? dateLongue(atelier.date_fin_inscription) : "non limitée"}</p>
            {atelier.adresse && (
              <p className="flex items-start gap-1.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <a href={googleMapsSearchUrl(atelier.adresse)} target="_blank" rel="noopener noreferrer" className="hover:underline">{atelier.adresse}</a>
              </p>
            )}
          </section>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div role="group" aria-label="Filtrer les inscrites" className="inline-flex rounded-full border bg-card p-0.5">
              {([["toutes", "Toutes"], ["en_attente", "À traiter"], ["confirme", "Validées"]] as [Filtre, string][]).map(([cle, libelle]) => (
                <button key={cle} onClick={() => setFiltre(cle)} aria-pressed={filtre === cle}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${filtre === cle ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{libelle}</button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={recherche} onChange={e => setRecherche(e.target.value)} aria-label="Rechercher une inscrite" placeholder="Rechercher une inscrite…"
                className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <button onClick={exporter} disabled={inscrites.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 border rounded-full text-sm hover:bg-muted disabled:opacity-40">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {visibles.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">{inscrites.length === 0 ? "Aucune inscription pour cet atelier." : "Aucun résultat."}</p>
          ) : (
            <>
            <ul className="space-y-3 md:hidden">
              {visibles.map(i => {
                const ident = inscIdentite(i);
                const gratuit = i.statut_paiement === "non_requis" && !payant;
                return (
                  <li key={i.id} className="bg-card border rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{ident.prenom} {ident.nom}</p>
                        <p className="text-xs text-muted-foreground truncate">{ident.email ?? ident.telephone ?? "—"}</p>
                      </div>
                      <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE_STATUT[i.statut]}`}>{STATUTS[i.statut]}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <BadgePhotos autorisation={i.utilisateur_id ? autorisations.get(i.utilisateur_id) : undefined} />
                      <button onClick={() => basculerPaiement(i)} disabled={gratuit}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border disabled:opacity-60 ${i.statut_paiement === "paye" ? "bg-green-50 border-green-200 text-green-700" : gratuit ? "border-muted-foreground/20 text-muted-foreground" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                        {i.statut_paiement === "paye" ? <Euro className="w-3.5 h-3.5" /> : <CircleDashed className="w-3.5 h-3.5" />}
                        {i.statut_paiement === "paye" ? "Payé" : gratuit ? "Gratuit" : "Non payé"}
                      </button>
                      <button onClick={() => basculerPresence(i)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${i.present ? "bg-green-50 border-green-200 text-green-700" : "border-muted-foreground/20 text-muted-foreground"}`}>
                        {i.present ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        {i.present ? "Présente" : "Absente"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden md:block bg-card border rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>{["Inscrite", "Statut", "Consentement", "Paiement", "Présence"].map(h => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {visibles.map(i => {
                    const ident = inscIdentite(i);
                    const gratuit = i.statut_paiement === "non_requis" && !payant;
                    return (
                      <tr key={i.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium">{ident.prenom} {ident.nom}</p>
                          <p className="text-xs text-muted-foreground">{ident.email ?? ident.telephone ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${BADGE_STATUT[i.statut]}`}>{STATUTS[i.statut]}</span></td>
                        <td className="px-4 py-3"><BadgePhotos autorisation={i.utilisateur_id ? autorisations.get(i.utilisateur_id) : undefined} avecLibelle={false} /></td>
                        <td className="px-4 py-3">
                          <button onClick={() => basculerPaiement(i)} disabled={gratuit}
                            title={gratuit ? "Atelier gratuit" : i.statut_paiement === "paye" ? "Marquer non payé" : "Marquer payé"}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border disabled:opacity-60 ${i.statut_paiement === "paye" ? "bg-green-50 border-green-200 text-green-700" : gratuit ? "border-muted-foreground/20 text-muted-foreground" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                            {i.statut_paiement === "paye" ? <Euro className="w-3.5 h-3.5" /> : <CircleDashed className="w-3.5 h-3.5" />}
                            {i.statut_paiement === "paye" ? "Payé" : gratuit ? "Gratuit" : "Non payé"}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => basculerPresence(i)} title={i.present ? "Marquer absente" : "Marquer présente"}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${i.present ? "bg-green-50 border-green-200 text-green-700" : "border-muted-foreground/20 text-muted-foreground hover:bg-muted"}`}>
                            {i.present ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            {i.present ? "Présente" : "Absente"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </>
      )}
    </AdminLayout>
  );
};

export default FicheAtelier;
