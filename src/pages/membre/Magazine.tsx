import { ComponentType, ReactNode, useEffect, useState } from "react";
import MembreLayout from "@/components/membre/MembreLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Newspaper, BookOpen, ExternalLink, Loader2, X, Download, type LucideIcon,
} from "lucide-react";

type DocType = "magazine" | "guide" | "lien_externe";
type DocAcces = "membres" | "premium" | "tous";

interface Doc {
  id: string;
  titre: string;
  description: string | null;
  type: DocType;
  fichier_chemin: string | null;
  lien_externe: string | null;
  url_image: string | null;
  acces: DocAcces;
  created_at: string;
}

const typeIcon: Record<DocType, LucideIcon> = {
  magazine:     Newspaper,
  guide:        BookOpen,
  lien_externe: ExternalLink,
};

const typeLabel: Record<DocType, string> = {
  magazine:     "Magazine",
  guide:        "Guide",
  lien_externe: "Ressource",
};

// Page partagée entre /espace-membre/magazine et
// /espace-membre-premium/magazine — voir App.tsx pour le routing.
type LayoutComp = ComponentType<{ children: ReactNode }>;

const Magazine = ({ Layout = MembreLayout }: { Layout?: LayoutComp } = {}) => {
  const [items, setItems] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{ titre: string; url: string } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      // Pas de filtre par type : la RLS limite déjà aux docs auxquels le
      // membre a accès (via le champ `acces`). On affiche donc tout ce
      // que l'admin a publié pour ce niveau d'accès, peu importe le type.
      const { data, error } = await supabase
        .from("documents")
        .select("id, titre, description, type, fichier_chemin, lien_externe, url_image, acces, created_at")
        .order("created_at", { ascending: false });

      if (error) toast.error(`Erreur : ${error.message}`);
      else setItems((data ?? []) as Doc[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleOpen = async (d: Doc) => {
    if (d.lien_externe) {
      window.open(d.lien_externe, "_blank", "noopener,noreferrer");
      return;
    }
    if (!d.fichier_chemin) {
      toast.error("Fichier indisponible.");
      return;
    }
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(d.fichier_chemin, 60 * 5);
    if (error || !data?.signedUrl) {
      toast.error(`Impossible d'ouvrir : ${error?.message ?? "URL non signée"}`);
      return;
    }
    setViewer({ titre: d.titre, url: data.signedUrl });
  };

  const handleDownload = async (d: Doc) => {
    if (!d.fichier_chemin) return;
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(d.fichier_chemin, 60 * 5, { download: true });
    if (error || !data?.signedUrl) {
      toast.error(`Impossible de télécharger : ${error?.message ?? "URL non signée"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Retrouvez les magazines, guides et ressources partagés par l'équipe.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <Newspaper className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucune publication pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(d => {
            const Icon = typeIcon[d.type];
            const isLink = d.type === "lien_externe" || (!d.fichier_chemin && !!d.lien_externe);
            return (
              <div key={d.id} className="bg-card border rounded-2xl overflow-hidden flex flex-col group">
                <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-primary/15 to-amber-500/15 flex items-center justify-center overflow-hidden">
                  {d.url_image ? (
                    <img src={d.url_image} alt="" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                  ) : (
                    <Icon className="w-10 h-10 text-primary/50 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="absolute top-3 left-3 text-xs bg-background/80 text-foreground px-2 py-0.5 rounded-full">
                    {typeLabel[d.type]}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-foreground text-sm">{d.titre}</h3>
                  {d.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{d.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>

                  <div className="mt-auto pt-3 flex gap-2">
                    <button
                      onClick={() => handleOpen(d)}
                      className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded-full text-xs font-medium hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-1.5"
                    >
                      {isLink ? <><ExternalLink className="w-3.5 h-3.5" /> Ouvrir</> : "Lire"}
                    </button>
                    {!isLink && d.fichier_chemin && (
                      <button
                        onClick={() => handleDownload(d)}
                        className="border border-foreground/20 text-foreground p-2 rounded-full hover:bg-muted transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Viewer modal */}
      {viewer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={() => setViewer(null)}>
          <div className="flex items-center justify-between p-4 text-white" onClick={e => e.stopPropagation()}>
            <h2 className="font-medium truncate pr-4">{viewer.titre}</h2>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={viewer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              <button onClick={() => setViewer(null)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 px-4 pb-4" onClick={e => e.stopPropagation()}>
            <iframe
              src={viewer.url}
              title={viewer.titre}
              className="w-full h-full bg-white rounded-xl"
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Magazine;
