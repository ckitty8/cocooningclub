import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { withTimeout } from "@/utils/withTimeout";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, MapPin, Clock, Users, Euro, Search, ChevronDown, UserCheck, UserX, Image as ImageIcon, CircleDashed } from "lucide-react";

type Statut = "brouillon" | "publie" | "complet" | "annule" | "termine";
type Niveau = "debutant" | "intermediaire" | "avance";
type StatutInscription = "en_attente" | "confirme" | "annule";
type StatutPaiement = "en_attente" | "paye" | "non_requis";

interface Atelier {
  id: string;
  titre: string;
  description: string | null;
  description_courte: string | null;
  date_atelier: string;
  heure_debut: string | null;
  duree: string | null;
  lieu: string | null;
  url_image: string | null;
  places_max: number;
  places_disponibles: number;
  tarif_standard: number | null;
  tarif_premium: number | null;
  tarif_affichage: string | null;
  lien_paypal: string | null;
  niveau: Niveau | null;
  statut: Statut;
}

interface Inscription {
  id: string;
  nom_invite: string;
  prenom_invite: string;
  email_invite: string;
  statut: StatutInscription;
  statut_paiement: StatutPaiement;
  present: boolean | null;
  inscrit_le: string;
  date_naissance: string | null;
}

const emptyForm = {
  titre: "", description: "", description_courte: "",
  date_atelier: "", heure_debut: "", duree: "", lieu: "", url_image: "",
  places_max: 10, tarif_standard: "", tarif_premium: "", tarif_affichage: "",
  lien_paypal: "", niveau: "" as Niveau | "", statut: "brouillon" as Statut,
};

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

const inscriptionBadge: Record<StatutInscription, string> = {
  en_attente: "bg-yellow-100 text-yellow-700",
  confirme: "bg-green-100 text-green-700",
  annule: "bg-red-100 text-red-600",
};
const inscriptionLabel: Record<StatutInscription, string> = {
  en_attente: "En attente", confirme: "Confirmé", annule: "Annulé",
};
const paiementBadge: Record<StatutPaiement, string> = {
  en_attente: "bg-yellow-100 text-yellow-700",
  paye: "bg-green-100 text-green-700",
  non_requis: "bg-gray-100 text-gray-500",
};
const paiementLabel: Record<StatutPaiement, string> = {
  en_attente: "En attente", paye: "Payé", non_requis: "—",
};

const Ateliers = () => {
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; atelier: Atelier | null }>({ open: false, atelier: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Recherche + filtre
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<Statut | "">("");

  // Panel inscrits
  const [inscritPanel, setInscritPanel] = useState<{ open: boolean; atelier: Atelier | null }>({ open: false, atelier: null });
  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  const [inscLoading, setInscLoading] = useState(false);

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

  const filtered = ateliers.filter(a => {
    const matchSearch = a.titre.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filterStatut === "" || a.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const openInscrits = async (a: Atelier) => {
    setInscritPanel({ open: true, atelier: a });
    setInscLoading(true);
    const { data } = await supabase.from("inscriptions").select("*").eq("atelier_id", a.id).order("inscrit_le");
    setInscriptions((data as Inscription[]) ?? []);
    setInscLoading(false);
  };

  const togglePresent = async (insc: Inscription) => {
    await supabase.from("inscriptions").update({ present: !insc.present }).eq("id", insc.id);
    setInscriptions(prev => prev.map(i => i.id === insc.id ? { ...i, present: !i.present } : i));
  };

  // Toggle paiement : cycle en_attente ↔ paye.
  // Si l'inscription est marquée non_requis mais que l'atelier a un
  // tarif > 0 (incohérence après-coup), on bascule vers en_attente.
  // Un atelier réellement gratuit (tarif null/0) garde non_requis et
  // désactive le bouton dans l'UI.
  const togglePaiement = async (insc: Inscription) => {
    const atelier = inscritPanel.atelier;
    const isPaid = (atelier?.tarif_standard ?? 0) > 0;
    if (insc.statut_paiement === "non_requis" && !isPaid) return;
    const next: StatutPaiement = insc.statut_paiement === "paye" ? "en_attente" : "paye";
    await supabase.from("inscriptions").update({ statut_paiement: next }).eq("id", insc.id);
    setInscriptions(prev => prev.map(i => i.id === insc.id ? { ...i, statut_paiement: next } : i));
  };

  const openAdd = () => { setForm(emptyForm); setModal({ open: true, atelier: null }); };
  const openEdit = (a: Atelier) => {
    setForm({
      titre: a.titre, description: a.description ?? "", description_courte: a.description_courte ?? "",
      date_atelier: a.date_atelier, heure_debut: a.heure_debut ?? "", duree: a.duree ?? "",
      lieu: a.lieu ?? "", url_image: a.url_image ?? "",
      places_max: a.places_max,
      tarif_standard: a.tarif_standard?.toString() ?? "",
      tarif_premium: a.tarif_premium?.toString() ?? "",
      tarif_affichage: a.tarif_affichage ?? "",
      lien_paypal: a.lien_paypal ?? "",
      niveau: a.niveau ?? "", statut: a.statut,
    });
    setModal({ open: true, atelier: a });
  };

  const handleSave = async () => {
    setSaving(true);

    // Vérification : au moins un admin est-il dispo à cette date ?
    if (form.date_atelier) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dispo } = await (supabase.rpc as any)("admin_dispo_le", { p_date: form.date_atelier });
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

    const payload = {
      titre: form.titre,
      description: form.description || null,
      description_courte: form.description_courte || null,
      date_atelier: form.date_atelier,
      heure_debut: form.heure_debut || null,
      duree: form.duree || null,
      lieu: form.lieu || null,
      url_image: form.url_image || null,
      places_max: Number(form.places_max),
      tarif_standard: form.tarif_standard ? Number(form.tarif_standard) : null,
      tarif_premium: form.tarif_premium ? Number(form.tarif_premium) : null,
      tarif_affichage: form.tarif_affichage || null,
      lien_paypal: form.lien_paypal || null,
      niveau: (form.niveau as Niveau) || null,
      statut: form.statut,
    };
    if (modal.atelier) {
      const before = modal.atelier;
      await supabase.from("ateliers").update(payload).eq("id", modal.atelier.id);
      logAction("atelier.update", "ateliers", modal.atelier.id, {
        titre: payload.titre,
        statut_avant: before.statut,
        statut_apres: payload.statut,
        date_atelier: payload.date_atelier,
      });
    } else {
      const { data: ins } = await supabase
        .from("ateliers")
        .insert({ ...payload, places_disponibles: Number(form.places_max) })
        .select("id")
        .single();
      logAction("atelier.create", "ateliers", ins?.id ?? null, {
        titre: payload.titre,
        date_atelier: payload.date_atelier,
        statut: payload.statut,
      });
    }
    await fetchAteliers();
    setModal({ open: false, atelier: null });
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const atelier = ateliers.find(a => a.id === id);
    if (!confirm("Supprimer cet atelier définitivement ?")) return;
    await supabase.from("ateliers").delete().eq("id", id);
    logAction("atelier.delete", "ateliers", id, { titre: atelier?.titre, date_atelier: atelier?.date_atelier });
    fetchAteliers();
  };

  const f = (key: keyof typeof form, val: string | number) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Ateliers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} / {ateliers.length} atelier(s)
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Recherche + filtre */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un atelier..."
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="relative">
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value as Statut | "")}
            className="appearance-none pl-3 pr-8 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Tous les statuts</option>
            <option value="brouillon">Brouillon</option>
            <option value="publie">Publié</option>
            <option value="complet">Complet</option>
            <option value="annule">Annulé</option>
            <option value="termine">Terminé</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">{ateliers.length === 0 ? "Aucun atelier" : "Aucun résultat"}</p>
          <p className="text-sm mt-1">
            {ateliers.length === 0 ? 'Cliquez sur "+ Ajouter" pour créer votre premier atelier.' : "Modifiez votre recherche ou votre filtre."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => {
            const inscrits = a.places_max - a.places_disponibles;
            return (
              <div key={a.id} className="bg-card rounded-2xl border overflow-hidden flex flex-col">
                {a.url_image && (
                  <img src={a.url_image} alt={a.titre} className="w-full aspect-[16/10] object-contain bg-muted/30" />
                )}
                <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-foreground leading-snug flex-1 pr-2">{a.titre}</h3>
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
                      <span>{a.lieu}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{a.places_disponibles}/{a.places_max} places disponibles</span>
                  </div>
                  {(a.tarif_affichage || a.tarif_standard != null) && (
                    <div className="flex items-center gap-1.5">
                      <Euro className="w-3.5 h-3.5 shrink-0" />
                      <span>{a.tarif_affichage ?? `${a.tarif_standard}€`}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => openInscrits(a)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-muted transition-colors"
                  >
                    <Users className="w-3 h-3" />
                    Inscrits ({inscrits})
                  </button>
                  <button onClick={() => openEdit(a)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full hover:bg-muted transition-colors flex-1 justify-center">
                    <Pencil className="w-3 h-3" /> Modifier
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

      {/* Panel inscrits */}
      {inscritPanel.open && inscritPanel.atelier && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInscritPanel({ open: false, atelier: null })} />
          <aside className="relative w-full max-w-xl bg-card border-l shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="font-semibold text-base">Inscrits</h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[280px]">{inscritPanel.atelier.titre}</p>
              </div>
              <button onClick={() => setInscritPanel({ open: false, atelier: null })}
                className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {inscLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : inscriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-1">
                  <Users className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Aucun inscrit pour cet atelier</p>
                </div>
              ) : (
                <div className="divide-y">
                  {(() => {
                    const atelierIsPaid = (inscritPanel.atelier?.tarif_standard ?? 0) > 0;
                    return inscriptions.map(insc => (
                    <div key={insc.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{insc.prenom_invite} {insc.nom_invite}</p>
                        <p className="text-xs text-muted-foreground truncate">{insc.email_invite}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${inscriptionBadge[insc.statut]}`}>
                            {inscriptionLabel[insc.statut]}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${paiementBadge[insc.statut_paiement]}`}>
                            {paiementLabel[insc.statut_paiement]}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => togglePresent(insc)}
                          title={insc.present ? "Marquer absent" : "Marquer présent"}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            insc.present
                              ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                              : "border-muted-foreground/20 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {insc.present ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          {insc.present ? "Présent" : "Absent"}
                        </button>
                        <button
                          onClick={() => togglePaiement(insc)}
                          disabled={insc.statut_paiement === "non_requis" && !atelierIsPaid}
                          title={
                            insc.statut_paiement === "non_requis" && !atelierIsPaid ? "Atelier gratuit" :
                            insc.statut_paiement === "paye" ? "Marquer non payé" : "Marquer payé"
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            insc.statut_paiement === "paye"
                              ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                              : insc.statut_paiement === "non_requis" && !atelierIsPaid
                              ? "border-muted-foreground/20 text-muted-foreground"
                              : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          }`}
                        >
                          {insc.statut_paiement === "paye"
                            ? <Euro className="w-3.5 h-3.5" />
                            : <CircleDashed className="w-3.5 h-3.5" />}
                          {insc.statut_paiement === "paye" ? "Payé"
                            : insc.statut_paiement === "non_requis" && !atelierIsPaid ? "Gratuit"
                            : "Non payé"}
                        </button>
                      </div>
                    </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            <div className="p-4 border-t text-xs text-muted-foreground text-center">
              {inscriptions.length} inscrit(s) · {inscriptions.filter(i => i.present).length} présent(s)
            </div>
          </aside>
        </div>
      )}

      {/* Modal ajout/édition */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-lg">{modal.atelier ? "Modifier l'atelier" : "Nouvel atelier"}</h2>
              <button onClick={() => setModal({ open: false, atelier: null })}
                className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Photo de présentation</label>
                <div className="flex items-start gap-3">
                  {form.url_image ? (
                    <img src={form.url_image} alt="" className="w-24 h-24 rounded-xl object-cover border" />
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
                  <label className="block text-sm font-medium mb-1.5">Heure début</label>
                  <input type="time" value={form.heure_debut} onChange={e => f("heure_debut", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Durée</label>
                  <input value={form.duree} onChange={e => f("duree", e.target.value)}
                    placeholder="ex: 2h30" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Lieu</label>
                  <input value={form.lieu} onChange={e => f("lieu", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Places max</label>
                  <input type="number" min={1} value={form.places_max} onChange={e => f("places_max", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Niveau</label>
                  <select value={form.niveau} onChange={e => f("niveau", e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">— Non défini —</option>
                    <option value="debutant">Débutant</option>
                    <option value="intermediaire">Intermédiaire</option>
                    <option value="avance">Avancé</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tarif standard (€)</label>
                  <input type="number" min={0} step={0.01} value={form.tarif_standard} onChange={e => f("tarif_standard", e.target.value)}
                    placeholder="25" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tarif premium (€)</label>
                  <input type="number" min={0} step={0.01} value={form.tarif_premium} onChange={e => f("tarif_premium", e.target.value)}
                    placeholder="20" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Tarif affiché</label>
                <input value={form.tarif_affichage} onChange={e => f("tarif_affichage", e.target.value)}
                  placeholder="ex: À partir de 20€" className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Lien PayPal</label>
                <input value={form.lien_paypal} onChange={e => f("lien_paypal", e.target.value)}
                  placeholder="https://paypal.me/..." className="w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                <p className="text-xs text-muted-foreground mt-1">Affiché uniquement aux membres standard</p>
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
              <button onClick={() => setModal({ open: false, atelier: null })}
                className="px-4 py-2 text-sm border rounded-full hover:bg-muted transition-colors">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.titre || !form.date_atelier}
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
