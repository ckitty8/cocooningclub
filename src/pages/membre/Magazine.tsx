import { useEffect, useState } from "react";
import MembreLayout from "@/components/membre/MembreLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Newspaper, Loader2, X, Download, Lock, Crown,
} from "lucide-react";

type DocAcces = "membres" | "premium" | "tous";

interface Magazine {
  id: string;
  titre: string;
  description: string | null;
  fichier_url: string | null;
  acces: DocAcces;
  created_at: string;
}

const Magazine = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<Magazine | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, titre, description, fichier_url, acces, created_at")
        .eq("type", "magazine")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(`Erreur : ${error.message}`);
      } else {
        setItems((data ?? []) as Magazine[]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <MembreLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MembreLayout>
    );
  }

  const isPremium = profile?.role === "membre_premium" || profile?.role === "administrateur";

  return (
    <MembreLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Magazine du club</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Retrouvez les éditions du magazine Cocooning Club partagées par l'équipe.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <Newspaper className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Aucun magazine publié pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(m => {
            const isPremiumOnly = m.acces === "premium";
            const accessible = !isPremiumOnly || isPremium;
            return (
              <div key={m.id} className="bg-card border rounded-2xl overflow-hidden flex flex-col group">
                <div className="relative aspect-[3/4] bg-gradient-to-br from-primary/20 via-amber-500/15 to-rose-500/20 flex items-center justify-center">
                  <Newspaper className="w-16 h-16 text-primary/50 group-hover:scale-110 transition-transform" />
                  {isPremiumOnly && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-amber-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                      <Crown className="w-3 h-3" /> Premium
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-foreground text-sm">{m.titre}</h3>
                  {m.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{m.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>

                  <div className="mt-auto pt-3 flex gap-2">
                    {accessible && m.fichier_url ? (
                      <>
                        <button
                          onClick={() => setViewer(m)}
                          className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
                        >
                          Lire
                        </button>
                        <a
                          href={m.fichier_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="border border-foreground/20 text-foreground p-2 rounded-full hover:bg-muted transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </>
                    ) : !accessible ? (
                      <button disabled className="flex-1 bg-muted text-muted-foreground px-3 py-2 rounded-full text-xs font-medium flex items-center justify-center gap-1 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5" /> Réservé Premium
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Fichier indisponible</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PDF Viewer modal */}
      {viewer && viewer.fichier_url && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={() => setViewer(null)}>
          <div className="flex items-center justify-between p-4 text-white" onClick={e => e.stopPropagation()}>
            <h2 className="font-medium truncate pr-4">{viewer.titre}</h2>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={viewer.fichier_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Télécharger"
              >
                <Download className="w-5 h-5" />
              </a>
              <button onClick={() => setViewer(null)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 px-4 pb-4" onClick={e => e.stopPropagation()}>
            <iframe
              src={viewer.fichier_url}
              title={viewer.titre}
              className="w-full h-full bg-white rounded-xl"
            />
          </div>
        </div>
      )}
    </MembreLayout>
  );
};

export default Magazine;
