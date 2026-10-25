import { Fragment, useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { dureeEntre, heureDeFin } from "@/lib/dureeAtelier";
import { placesRestantes } from "@/lib/placesAtelier";
import { withTimeout } from "@/utils/withTimeout";
import { googleMapsSearchUrl } from "@/utils/googleMaps";
import { searchAdresse, type AdresseSuggestion } from "@/utils/adresseAutocomplete";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { enregistrerAffichage, lireAffichage, type AffichageAteliers } from "@/lib/affichageAteliers";
import { ESPACES_PAR_SLUG } from "@/lib/espaces";
import { Link, useSearchParams } from "react-router-dom";
import VueCalendrier from "@/components/admin/ateliers/VueCalendrier";
import { chiffresAteliers } from "@/lib/calendrierAteliers";
import { aujourdhuiIso } from "@/lib/adhesions";
import { compressImage } from "@/utils/compressImage";
import { Plus, Pencil, Trash2, Copy, X, MapPin, Clock, Users, Euro, Search, Image as ImageIcon, LayoutGrid, List, CalendarDays } from "lucide-react";

type Statut = "brouillon" | "publie" | "complet" | "annule" | "termine";
type Niveau = "debutant" | "intermediaire" | "avance";

interface Atelier {
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
  url_image: string | null;
  places_max: number;
  places_disponibles: number;
  tarif_standard: number | null;
  /** Colonne ajoutée par la migration « tarif adhérente » : absente avant. */
  tarif_adherent?: number | null;
  tarif_affichage: string | null;
  lien_paypal: string | null;
  niveau: Niveau | null;
  statut: Statut;
  antenne_id: string;
}

interface Antenne {
  id: string;
  nom: string;
  slug: string | null;
}

const emptyForm = {
  titre: "", description: "", description_courte: "",
  date_atelier: "", date_fin_inscription: "", heure_debut: "", heure_fin: "", duree: "", lieu: "", adresse: "", url_image: "",
  places_max: 10, tarif_standard: "", tarif_adherent: "", tarif_affichage: "",
  lien_paypal: "", niveau: "" as Niveau | "", statut: "brouillon" as Statut,
  antenne_id: "",
};

// Brouillon persistant : si l'onglet est déchargé par le navigateur (mise en
// veille, économiseur de mémoire) pendant que la modale est ouverte, la
// saisie en cours serait perdue au retour. On la sauvegarde en continu pour
// pouvoir la restaurer automatiquement.
const DRAFT_KEY = "admin.ateliers.draft";

const statutLabels: Record<Statut, string> = {
  brouillon: "Brouillon", publie: "Publié", complet: "Complet",
  annule: "Annulé", termine: "Terminé",
};
const statutColors: Record<Statut, string> = {
  brouillon: "bg-gray-100 text-gray-600",
  publie: "bg-green-100 text-green-700",
  complet: "bg-blue-100 text-blue-700",
  annule: "bg-red-100 text-red-600",
  termine: "bg-purple-100 text-purple-600",
};

const Ateliers = () => {
  const { profile } = useAuth();
  const [affichage, setAffichage] = useState<AffichageAteliers>("cartes");
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  const colonneTarifAdherent = ateliers.some(a => "tarif_adherent" in a);
  const [antennes, setAntennes] = useState<Antenne[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; atelier: Atelier | null }>({ open: false, atelier: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Autocomplétion de l'adresse (API Adresse gouv.fr)
  const [adresseSuggestions, setAdresseSuggestions] = useState<AdresseSuggestion[]>([]);
  const [showAdresseSuggestions, setShowAdresseSuggestions] = useState(false);
  const [adresseLoading, setAdresseLoading] = useState(false);
  const adresseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adresseAbortRef = useRef<AbortController | null>(null);

  // Recherche + filtres
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<Statut | "">("");
  const [filterAntenne, setFilterAntenne] = useState<string>("toutes"); // id antenne ou "toutes"

  const fetchAteliers = async () => {
    // Marque comme "termine" les ateliers publiés/complets dont la date est passée.
    // Filet de secours si le cron pg_cron quotidien n'a pas tourné — la policy
    // RLS ateliers_admin_all autorise cette mise à jour pour l'admin courant.
    try {
      const today = new Date().toISOString().slice(0, 10);
      await withTimeout(
        supabase
          .from("ateliers")
          .update({ statut: "termine" })
          .lt("date_atelier", today)
          .in("statut", ["publie", "complet"])
      );
    } catch (err) {
      console.warn("[Ateliers.autoTerminer] non bloquant :", err);
    }

    try {
      const { data, error } = await withTimeout(
        supabase.from("ateliers").select("*").order("date_atelier")
      );
      if (error) throw error;
      setAteliers((data as Atelier[]) ?? []);
    } catch (err) {
      console.error("[Ateliers.fetchAteliers] error:", err);
      toast.error("Erreur lors du chargement des ateliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAteliers(); }, []);

  // Pré-inscriptions à traiter, pour les chiffres clés du haut de page.
  const [aTraiter, setATraiter] = useState(0);
  useEffect(() => {
    supabase.from("inscriptions").select("id", { count: "exact", head: true }).eq("statut", "en_attente")
      .then(({ count }) => setATraiter(count ?? 0));
  }, []);

  // Affichage (cartes / liste) choisi par cette administratrice.
  useEffect(() => {
    if (profile?.id) setAffichage(lireAffichage(profile.id));
  }, [profile?.id]);

  const choisirAffichage = (valeur: AffichageAteliers) => {
    setAffichage(valeur);
    if (profile?.id) enregistrerAffichage(profile.id, valeur);
  };

  useEffect(() => {
    supabase.from("antennes").select("id, nom, slug").order("ordre_affichage").then(({ data }) => {
      setAntennes((data as Antenne[]) ?? []);
    });
  }, []);

  // Sauvegarde continue du brouillon pendant que la modale est ouverte.
  useEffect(() => {
    if (!modal.open) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ atelierId: modal.atelier?.id ?? null, form }));
    } catch {
      // stockage indisponible (navigation privée, quota...) : tant pis
    }
  }, [modal.open, modal.atelier, form]);

  // Restauration du brouillon une fois les ateliers chargés (nécessaire pour
  // retrouver l'atelier concerné si c'était une modification en cours).
  // Demande confirmation avant de rouvrir la modale : si le brouillon
  // provient en fait d'un enregistrement déjà réussi juste avant un
  // rechargement de page, on ne veut surtout pas le resoumettre en silence
  // (ça créerait un doublon en base).
  const draftRestoredRef = useRef(false);
  useEffect(() => {
    if (draftRestoredRef.current || loading) return;
    draftRestoredRef.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { atelierId: string | null; form: typeof emptyForm };
      let atelier: Atelier | null = null;
      if (draft.atelierId) {
        const found = ateliers.find(a => a.id === draft.atelierId);
        if (!found) {
          localStorage.removeItem(DRAFT_KEY);
          return;
        }
        atelier = found;
      }
      const ok = confirm(
        `Un brouillon non enregistré a été retrouvé pour l'atelier "${draft.form.titre || "(sans titre)"}".\n\n` +
        "Voulez-vous le restaurer ? Si vous l'avez déjà enregistré juste avant, cliquez sur Annuler pour éviter un doublon."
      );
      if (!ok) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      setModal({ open: true, atelier });
      setForm(draft.form);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, [loading, ateliers]);

  const closeModal = () => {
    localStorage.removeItem(DRAFT_KEY);
    setModal({ open: false, atelier: null });
    setAdresseSuggestions([]);
    setShowAdresseSuggestions(false);
  };

  const filtered = ateliers.filter(a => {
    const matchSearch = a.titre.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "" || a.statut === filterStatut;
    const matchAntenne = filterAntenne === "toutes" || a.antenne_id === filterAntenne;
    return matchSearch && matchStatut && matchAntenne;
  });

  const countByAntenne = (antenneId: string) =>
    antenneId === "toutes"
      ? ateliers.length
      : ateliers.filter(a => a.antenne_id === antenneId).length;

  const countByStatut = (s: Statut | "") =>
    s === "" ? ateliers.length : ateliers.filter(a => a.statut === s).length;

  const openAdd = (dateAtelier = "") => { setForm({ ...emptyForm, date_atelier: dateAtelier }); setModal({ open: true, atelier: null }); };
  const [searchParams, setSearchParams] = useSearchParams();
  const openEdit = (a: Atelier) => {
    setForm({
      titre: a.titre, description: a.description ?? "", description_courte: a.description_courte ?? "",
      date_atelier: a.date_atelier, date_fin_inscription: a.date_fin_inscription ?? "",
      heure_debut: a.heure_debut ?? "", heure_fin: a.heure_fin ?? "", duree: a.duree ?? "",
      lieu: a.lieu ?? "", adresse: a.adresse ?? "", url_image: a.url_image ?? "",
      places_max: a.places_max,
      tarif_standard: a.tarif_standard?.toString() ?? "",
      tarif_adherent: a.tarif_adherent?.toString() ?? "",
      tarif_affichage: a.tarif_affichage ?? "",
      lien_paypal: a.lien_paypal ?? "",
      niveau: a.niveau ?? "", statut: a.statut,
      antenne_id: a.antenne_id,
    });
    setModal({ open: true, atelier: a });
  };

  // Duplique un atelier existant (quel que soit son statut) : pré-remplit le
  // formulaire avec les mêmes infos, mais comme un nouvel atelier (pas d'id,
  // repart en brouillon) pour que l'admin ajuste la date avant de publier.
  const openDuplicate = (a: Atelier) => {
    setForm({
      titre: `${a.titre} (copie)`, description: a.description ?? "", description_courte: a.description_courte ?? "",
      date_atelier: a.date_atelier, date_fin_inscription: a.date_fin_inscription ?? "",
      heure_debut: a.heure_debut ?? "", heure_fin: a.heure_fin ?? "", duree: a.duree ?? "",
      lieu: a.lieu ?? "", adresse: a.adresse ?? "", url_image: a.url_image ?? "",
      places_max: a.places_max,
      tarif_standard: a.tarif_standard?.toString() ?? "",
      tarif_adherent: a.tarif_adherent?.toString() ?? "",
      tarif_affichage: a.tarif_affichage ?? "",
      lien_paypal: a.lien_paypal ?? "",
      niveau: a.niveau ?? "", statut: "brouillon",
      antenne_id: a.antenne_id,
    });
    setModal({ open: true, atelier: null });
  };

  const handleSave = async () => {
    setSaving(true);

    // Vérification : au moins un admin est-il dispo à cette date ?
    if (form.date_atelier) {
      // RPC custom non typée par les types générés : on caste juste le retour
      // au lieu d'utiliser `any` sur le client entier.
      const dispoRes = await supabase.rpc(
        "admin_dispo_le" as never,
        { p_date: form.date_atelier } as never,
      );
      const dispo = dispoRes.data as boolean | null;
      if (dispo === false) {
        const ok = confirm(
          "⚠️ Aucun administrateur n'est disponible à cette date (jour de semaine non dispo ou congés).\n\n" +
          "Voulez-vous quand même créer cet atelier ?"
        );
        if (!ok) {
          setSaving(false);
          return;
        }
      }
    }

    if (!form.antenne_id) {
      toast.error("Choisis un espace");
      setSaving(false);
      return;
    }

    if (!form.heure_debut) {
      toast.error("L'heure de début est obligatoire");
      setSaving(false);
      return;
    }

    const payload = {
      titre: form.titre,
      description: form.description || null,
      description_courte: form.description_courte || null,
      date_atelier: form.date_atelier,
      date_fin_inscription: form.date_fin_inscription || null,
      heure_debut: form.heure_debut,
      heure_fin: form.heure_fin || null,
      duree: form.duree || "2 hours",
      lieu: form.lieu || null,
      adresse: form.adresse || null,
      url_image: form.url_image || null,
      places_max: Number(form.places_max),
      tarif_standard: form.tarif_standard ? Number(form.tarif_standard) : 0,
      // Écrit seulement si la colonne existe (migration appliquée) ou si un tarif adhérente est saisi.
      ...(colonneTarifAdherent || form.tarif_adherent !== "" ? { tarif_adherent: form.tarif_adherent !== "" ? Number(form.tarif_adherent) : null } : {}),
      tarif_affichage: form.tarif_affichage || null,
      lien_paypal: form.lien_paypal || null,
      niveau: (form.niveau as Niveau) || "debutant",
      statut: form.statut,
      antenne_id: form.antenne_id,
    };
    if (modal.atelier) {
      const before = modal.atelier;
      // Changer la capacité doit recalculer les places libres : capacité - inscriptions confirmées.
      // Sinon augmenter « places » laissait l'ancien nombre de places libres et l'atelier
      // affichait des inscrits qui n'existent pas.
      const { count: confirmees, error: errCount } = await supabase
        .from("inscriptions")
        .select("id", { count: "exact", head: true })
        .eq("atelier_id", modal.atelier.id)
        .eq("statut", "confirme");
      if (errCount) {
        toast.error(`Erreur : ${errCount.message}`, { duration: 8000 });
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("ateliers")
        .update({ ...payload, places_disponibles: placesRestantes(payload.places_max, confirmees ?? 0) })
        .eq("id", modal.atelier.id);
      if (error) {
        console.error("[Ateliers.handleSave update]", error);
        toast.error(`Erreur : ${error.message}`, { duration: 8000 });
        setSaving(false);
        return;
      }
      // Le brouillon est effacé tout de suite après le succès en base, avant
      // tout autre await : si la page est déchargée juste après (veille,
      // changement d'onglet), on ne veut surtout pas qu'un brouillon
      // "orphelin" se restaure au retour et déclenche un second
      // enregistrement du même atelier (doublon en base).
      localStorage.removeItem(DRAFT_KEY);
      logAction("atelier.update", "ateliers", modal.atelier.id, {
        titre: payload.titre,
        statut_avant: before.statut,
        statut_apres: payload.statut,
        date_atelier: payload.date_atelier,
      });
    } else {
      const { data: ins, error } = await supabase
        .from("ateliers")
        .insert({ ...payload, places_disponibles: Number(form.places_max) })
        .select("id")
        .single();
      if (error) {
        console.error("[Ateliers.handleSave insert]", error);
        toast.error(`Erreur : ${error.message}`, { duration: 8000 });
        setSaving(false);
        return;
      }
      localStorage.removeItem(DRAFT_KEY);
      logAction("atelier.create", "ateliers", ins?.id ?? null, {
        titre: payload.titre,
        date_atelier: payload.date_atelier,
        statut: payload.statut,
      });
    }
    toast.success(modal.atelier ? "Atelier mis à jour" : "Atelier créé");
    await fetchAteliers();
    closeModal();
    setSaving(false);
  };

  // Arrivée depuis la fiche d'un atelier : /admin/ateliers?modifier=<id> ouvre directement le formulaire.
  const aModifier = searchParams.get("modifier");
  useEffect(() => {
    if (!aModifier || loading) return;
    const atelier = ateliers.find(a => a.id === aModifier);
    if (atelier) openEdit(atelier);
    setSearchParams({}, { replace: true });
  }, [aModifier, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    const atelier = ateliers.find(a => a.id === id);
    if (!confirm("Supprimer cet atelier définitivement ?")) return;
    const { error } = await supabase.from("ateliers").delete().eq("id", id);
    if (error) { toast.error(`Suppression impossible : ${error.message}`); return; }
    logAction("atelier.delete", "ateliers", id, { titre: atelier?.titre, date_atelier: atelier?.date_atelier });
    fetchAteliers();
  };

  const f = (key: keyof typeof form, val: string | number) =>
    setForm(prev => ({ ...prev, [key]: val }));

  // Durée, début et fin sont liés : modifier la durée ou le début recalcule la
  // fin ; modifier la fin recalcule la durée. Si la durée saisie n'est pas
  // reconnue, la fin n'est pas touchée.
  const handleDureeChange = (value: string) => {
    setForm(prev => {
      const fin = prev.heure_debut ? heureDeFin(prev.heure_debut, value) : null;
      return { ...prev, duree: value, heure_fin: fin ?? prev.heure_fin };
    });
  };

  const handleHeureChange = (key: "heure_debut" | "heure_fin", value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "heure_debut") {
        const fin = heureDeFin(value, prev.duree);
        if (fin) next.heure_fin = fin;
        else {
          const duree = prev.heure_fin ? dureeEntre(value, prev.heure_fin) : null;
          if (duree) next.duree = duree;
        }
      } else {
        const duree = prev.heure_debut ? dureeEntre(prev.heure_debut, value) : null;
        if (duree) next.duree = duree;
      }
      return next;
    });
  };

  const handleAdresseChange = (value: string) => {
    f("adresse", value);
    setShowAdresseSuggestions(true);

    if (adresseDebounceRef.current) clearTimeout(adresseDebounceRef.current);
    if (value.trim().length < 3) {
      setAdresseSuggestions([]);
      setAdresseLoading(false);
      return;
    }

    adresseDebounceRef.current = setTimeout(async () => {
      adresseAbortRef.current?.abort();
      const controller = new AbortController();
      adresseAbortRef.current = controller;
      setAdresseLoading(true);
      try {
        const results = await searchAdresse(value, controller.signal);
        setAdresseSuggestions(results);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[Ateliers.handleAdresseChange]", err);
        }
      } finally {
        if (adresseAbortRef.current === controller) setAdresseLoading(false);
      }
    }, 500);
  };

  const selectAdresseSuggestion = (label: string) => {
    f("adresse", label);
    setAdresseSuggestions([]);
    setShowAdresseSuggestions(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    // Les photos de téléphone font souvent 3 à 8 Mo : on les réduit avant
    // la vérification de taille et l'envoi.
    file = await compressImage(file, { maxSize: 1600 });
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image doit faire moins de 5 Mo");
      return;
    }
    setUploadingImage(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `ateliers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("images").upload(path, file, { contentType: file.type });
    if (error) {
      toast.error(`Erreur upload : ${error.message}`, { duration: 8000 });
      setUploadingImage(false);
      return;
    }
    const { data } = supabase.storage.from("images").getPublicUrl(path);
    f("url_image", data.publicUrl);
    setUploadingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Ateliers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} / {ateliers.length} atelier(s)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Affichage des ateliers" className="inline-flex rounded-full border bg-card p-0.5">
            {([["cartes", "Cartes", LayoutGrid], ["liste", "Liste", List], ["calendrier", "Calendrier", CalendarDays]] as const).map(([valeur, libelle, Icone]) => (
              <button
                key={valeur}
                onClick={() => choisirAffichage(valeur)}
                aria-pressed={affichage === valeur}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  affichage === valeur ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icone className="w-3.5 h-3.5" /> {libelle}
              </button>
            ))}
          </div>
          <button onClick={() => openAdd()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Chiffres clés */}
      {(() => {
        const c = chiffresAteliers(ateliers, aujourdhuiIso());
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
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
        );
      })()}

      {/* Recherche et filtres */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un atelier..."
            aria-label="Rechercher un atelier"
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={filterAntenne}
          onChange={e => setFilterAntenne(e.target.value)}
          aria-label="Filtrer par espace"
          className="border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="toutes">Tous les espaces ({countByAntenne("toutes")})</option>
          {antennes.map(c => (
            <option key={c.id} value={c.id}>{c.nom} ({countByAntenne(c.id)})</option>
          ))}
        </select>
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value as Statut | "")}
          aria-label="Filtrer par statut"
          className="border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Tous les statuts ({countByStatut("")})</option>
          {(Object.keys(statutLabels) as Statut[]).map(st => (
            <option key={st} value={st}>{statutLabels[st]} ({countByStatut(st)})</option>
          ))}
        </select>
        {(search || filterAntenne !== "toutes" || filterStatut !== "") && (
          <button
            onClick={() => { setSearch(""); setFilterAntenne("toutes"); setFilterStatut(""); }}
            className="flex items-center gap-1 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" /> Réinitialiser
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : affichage === "calendrier" ? (
        <VueCalendrier
          ateliers={filtered}
          slugDe={antenneId => antennes.find(c => c.id === antenneId)?.slug ?? undefined}
          onCreer={dateIso => openAdd(dateIso)}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">{ateliers.length === 0 ? "Aucun atelier" : "Aucun résultat"}</p>
          <p className="text-sm mt-1">
            {ateliers.length === 0 ? 'Cliquez sur "+ Ajouter" pour créer votre premier atelier.' : "Modifiez votre recherche ou votre filtre."}
          </p>
        </div>
      ) : affichage === "liste" ? (
        <div className="bg-card rounded-2xl border overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Atelier</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lieu</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Places</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarif</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const inscrits = a.places_max - a.places_disponibles;
                const mois = new Date(a.date_atelier).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
                const moisPrecedent = i > 0
                  ? new Date(filtered[i - 1].date_atelier).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
                  : null;
                const logo = ESPACES_PAR_SLUG[antennes.find(c => c.id === a.antenne_id)?.slug ?? ""]?.logo;
                return (
                  <Fragment key={a.id}>
                    {mois !== moisPrecedent && (
                      <tr className="bg-background">
                        <td colSpan={7} className="px-4 py-2 font-display text-base capitalize text-terracotta">{mois}</td>
                      </tr>
                    )}
                    <tr className="border-t hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium">
                          {new Date(a.date_atelier).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.date_atelier).toLocaleDateString("fr-FR", { weekday: "long" })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {logo && <img src={logo} alt="" className="h-7 w-12 object-contain shrink-0" />}
                          <div>
                            <Link to={`/admin/ateliers/${a.id}`} className="font-medium leading-snug hover:underline">{a.titre}</Link>
                            <p className="text-xs text-muted-foreground">
                              {a.heure_debut ? a.heure_debut.slice(0, 5) : ""}
                              {a.heure_fin ? ` – ${a.heure_fin.slice(0, 5)}` : ""}
                              {a.duree ? ` · ${a.duree}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.lieu ?? "—"}</td>
                      <td className="px-4 py-3 w-40">
                        <p className="text-xs mb-1">{inscrits}/{a.places_max}</p>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${a.places_disponibles <= 0 ? "bg-amber-600" : "bg-primary"}`}
                            style={{ width: `${a.places_max > 0 ? Math.min(100, (inscrits / a.places_max) * 100) : 0}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {a.tarif_affichage ?? (a.tarif_standard != null ? `${a.tarif_standard}€` : "—")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[a.statut]}`}>
                          {statutLabels[a.statut]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/admin/pre-inscriptions?atelier=${a.id}`} title="Inscrits et pré-inscriptions" aria-label={`Inscrits de ${a.titre}`}
                            className="p-2 rounded-full hover:bg-muted"><Users className="w-4 h-4" /></Link>
                          <button onClick={() => openEdit(a)} title="Modifier"
                            className="p-2 rounded-full hover:bg-muted"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => openDuplicate(a)} title="Dupliquer"
                            className="p-2 rounded-full hover:bg-muted"><Copy className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(a.id)} title="Supprimer"
                            className="p-2 rounded-full text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => {
            const inscrits = a.places_max - a.places_disponibles;
            return (
              <div key={a.id} className="bg-card rounded-2xl border overflow-hidden flex flex-col">
                {a.url_image && (
                  <img src={a.url_image} alt={a.titre} loading="lazy" decoding="async" className="w-full aspect-[16/10] object-contain bg-muted/30" />
                )}
                <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-foreground leading-snug flex-1 pr-2">
                    <Link to={`/admin/ateliers/${a.id}`} className="inline-block py-0.5 hover:underline">{a.titre}</Link>
                  </h3>
                  <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[a.statut]}`}>
                    {statutLabels[a.statut]}
                  </span>
                </div>

                {a.description_courte && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{a.description_courte}</p>
                )}

                <div className="space-y-1.5 text-xs text-muted-foreground mb-4 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {new Date(a.date_atelier).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      {a.heure_debut && ` · ${a.heure_debut.slice(0, 5)}`}
                      {a.duree && ` · ${a.duree}`}
                    </span>
                  </div>
                  {a.lieu && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {a.adresse ? (
                        <a
                          href={googleMapsSearchUrl(a.adresse)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-block py-1 hover:underline"
                        >
                          {a.lieu}
                        </a>
                      ) : (
                        <span>{a.lieu}</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{a.places_disponibles}/{a.places_max} places disponibles</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${a.places_disponibles <= 0 ? "bg-amber-600" : "bg-primary"}`}
                      style={{ width: `${a.places_max > 0 ? Math.min(100, (inscrits / a.places_max) * 100) : 0}%` }}
                    />
                  </div>
                  {(a.tarif_affichage || a.tarif_standard != null) && (
                    <div className="flex items-center gap-1.5">
                      <Euro className="w-3.5 h-3.5 shrink-0" />
                      <span>{a.tarif_affichage ?? `${a.tarif_standard}€`}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-auto">
                  <Link
                    to={`/admin/pre-inscriptions?atelier=${a.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-muted transition-colors"
                  >
                    <Users className="w-3 h-3" />
                    Inscrits ({inscrits})
                  </Link>
                  <button onClick={() => openEdit(a)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-muted transition-colors flex-1 justify-center">
                    <Pencil className="w-3 h-3" /> Modifier
                  </button>
                  <button onClick={() => openDuplicate(a)} title="Dupliquer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-muted transition-colors">
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(a.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-destructive/30 text-destructive rounded-full hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal ajout/édition */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-lg">{modal.atelier ? "Modifier l'atelier" : "Nouvel atelier"}</h2>
              <button onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Photo de présentation</label>
                <div className="flex items-start gap-3">
                  {form.url_image ? (
                    <img src={form.url_image} alt="Aperçu de l'image de l'atelier" className="w-24 h-24 rounded-xl object-cover border" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}
                      className="text-sm px-3 py-1.5 border rounded-full hover:bg-muted disabled:opacity-50">
                      {uploadingImage ? "Envoi..." : form.url_image ? "Changer" : "Uploader"}
                    </button>
                    {form.url_image && (
                      <button type="button" onClick={() => f("url_image", "")}
                        className="text-sm text-destructive hover:underline">Retirer</button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WebP. Max 5 Mo.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Espace *</label>
                <select value={form.antenne_id} onChange={e => f("antenne_id", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">— Choisir un espace —</option>
                  {antennes.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
                {antennes.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Aucun espace en base. Crée-en un côté Supabase (table antennes) avant de continuer.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Titre *</label>
                <input value={form.titre} onChange={e => f("titre", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description courte</label>
                <input value={form.description_courte} onChange={e => f("description_courte", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Description complète</label>
                <textarea value={form.description} onChange={e => f("description", e.target.value)}
                  rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date *</label>
                  <input type="date" value={form.date_atelier} onChange={e => f("date_atelier", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Durée</label>
                  <input value={form.duree} onChange={e => handleDureeChange(e.target.value)}
                    placeholder="ex: 2h30" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Heure début *</label>
                  <input type="time" value={form.heure_debut} onChange={e => handleHeureChange("heure_debut", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Heure fin</label>
                  <input type="time" value={form.heure_fin} onChange={e => handleHeureChange("heure_fin", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  {form.heure_debut && form.heure_fin && form.heure_fin <= form.heure_debut && (
                    <p className="text-xs text-destructive mt-1">L'heure de fin doit être après l'heure de début.</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Date limite d'inscription</label>
                <input type="date" value={form.date_fin_inscription} onChange={e => f("date_fin_inscription", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                <p className="text-xs text-muted-foreground mt-1">Optionnel. Affiché côté membre et bloque les inscriptions après cette date.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Lieu</label>
                  <input value={form.lieu} onChange={e => f("lieu", e.target.value)}
                    placeholder="ex: Salle des fêtes"
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Places max</label>
                  <input type="number" min={1} value={form.places_max} onChange={e => f("places_max", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium mb-1.5">Adresse (lien Google Maps)</label>
                <input
                  value={form.adresse}
                  onChange={e => handleAdresseChange(e.target.value)}
                  onFocus={() => setShowAdresseSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAdresseSuggestions(false), 150)}
                  placeholder="ex: 12 rue des Lilas, 75000 Paris"
                  autoComplete="off"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {showAdresseSuggestions && (adresseLoading || adresseSuggestions.length > 0) && (
                  <ul className="absolute z-20 left-0 right-0 mt-1 bg-card border rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {adresseLoading && (
                      <li className="px-3 py-2 text-xs text-muted-foreground">Recherche...</li>
                    )}
                    {adresseSuggestions.map(s => (
                      <li key={s.label}>
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => selectAdresseSuggestion(s.label)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        >
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Le lieu sera cliquable et ouvrira cette adresse dans Google Maps.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tarif non-adhérente (€)</label>
                  <input type="number" min={0} step={0.01} value={form.tarif_standard} onChange={e => f("tarif_standard", e.target.value)}
                    placeholder="25" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tarif adhérente (€)</label>
                  <input type="number" min={0} step={0.01} value={form.tarif_adherent} onChange={e => f("tarif_adherent", e.target.value)}
                    placeholder="Identique si vide" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  <p className="text-xs text-muted-foreground mt-1">Prix payé par une adhérente pour un atelier d'un espace que sa formule ne couvre pas.</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Tarif affiché</label>
                  <input value={form.tarif_affichage} onChange={e => f("tarif_affichage", e.target.value)}
                    placeholder="ex: À partir de 20€" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Lien PayPal</label>
                <input value={form.lien_paypal} onChange={e => f("lien_paypal", e.target.value)}
                  placeholder="https://paypal.me/..." className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Statut</label>
                <select value={form.statut} onChange={e => f("statut", e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="brouillon">Brouillon</option>
                  <option value="publie">Publié</option>
                  <option value="complet">Complet</option>
                  <option value="annule">Annulé</option>
                  <option value="termine">Terminé</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={closeModal}
                className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.titre || !form.date_atelier || !form.heure_debut || !form.antenne_id}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Ateliers;
