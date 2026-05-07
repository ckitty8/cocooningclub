import { useEffect, useState } from "react";
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Testimonial {
  id: string;
  texte: string;
  auteur: string;
  atelier: string | null;
  note: number;
}

const VISIBLE = 2;

const TestimonialsSection = () => {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // On affiche uniquement les avis approuvés ET mis en avant.
    // L'auteur s'affiche en "Prénom L." si lié à un membre, sinon
    // sur nom_auteur (témoignage admin libre).
    supabase
      .from("avis")
      .select("id, note, commentaire, nom_auteur, mis_en_avant, moderation, utilisateurs(prenom, nom), inscriptions(ateliers(titre))")
      .eq("moderation", "approuve")
      .eq("mis_en_avant", true)
      .order("cree_le", { ascending: false })
      .limit(12)
      .then(({ data, error }) => {
        if (error || !data) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = data.map((a: any) => {
          const u = a.utilisateurs;
          const auteur = u?.prenom
            ? `${u.prenom} ${u.nom?.[0] ?? ""}.`.trim()
            : a.nom_auteur || "—";
          return {
            id: a.id,
            texte: a.commentaire ?? "",
            auteur,
            atelier: a.inscriptions?.ateliers?.titre ?? null,
            note: a.note,
          };
        });
        setItems(mapped);
      });
  }, []);

  if (items.length === 0) return null;

  const pageSize = Math.min(VISIBLE, items.length);
  const lastIndex = Math.max(0, items.length - pageSize);
  const visible = items.slice(index, index + pageSize);

  const prev = () => setIndex(i => Math.max(0, i - 1));
  const next = () => setIndex(i => Math.min(lastIndex, i + 1));

  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-4">
          Ce qu'elles en disent
        </h2>
        <p className="text-center text-muted-foreground max-w-lg mx-auto mb-16">
          Découvrez les retours de nos participantes après leurs ateliers.
        </p>

        <div className="relative max-w-4xl mx-auto">
          {items.length > pageSize && (
            <button
              onClick={prev}
              disabled={index === 0}
              className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 bg-background border rounded-full p-2 shadow hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            {visible.map(t => (
              <div key={t.id} className="bg-background rounded-2xl border p-6 md:p-8 space-y-4 relative">
                <Quote className="w-8 h-8 text-primary/20 absolute top-6 right-6" />
                <div className="flex gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < t.note ? "fill-current" : "opacity-30"}`} />
                  ))}
                </div>
                <p className="text-foreground leading-relaxed italic">"{t.texte}"</p>
                <div>
                  <p className="font-display font-semibold text-foreground">{t.auteur}</p>
                  {t.atelier && <p className="text-xs text-muted-foreground">{t.atelier}</p>}
                </div>
              </div>
            ))}
          </div>

          {items.length > pageSize && (
            <button
              onClick={next}
              disabled={index >= lastIndex}
              className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 bg-background border rounded-full p-2 shadow hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {items.length > pageSize && (
            <div className="flex justify-center gap-3 mt-8">
              {Array.from({ length: lastIndex + 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`w-3 h-3 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-primary/20"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
