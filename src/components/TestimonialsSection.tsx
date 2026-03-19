import { useState } from "react";
import { Quote, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  { name: "Sophie L.", text: "Un vrai moment de déconnexion. J'ai adoré l'atelier bougies, l'ambiance était incroyable !", workshop: "Atelier Bougies" },
  { name: "Camille R.", text: "Je n'avais jamais touché un pinceau et pourtant je suis repartie avec une aquarelle dont je suis fière. Merci !", workshop: "Aquarelle & Détente" },
  { name: "Léa M.", text: "Le macramé c'était top ! Petit groupe, super animatrice, je recommande à 100%.", workshop: "Macramé Mural" },
  { name: "Julie D.", text: "J'ai offert ma création en céramique à ma mère, elle était ravie. Vivement le prochain atelier !", workshop: "Atelier Céramique" },
];

const VISIBLE = 2;

const TestimonialsSection = () => {
  const [index, setIndex] = useState(0);

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(testimonials.length - VISIBLE, i + 1));

  const visible = testimonials.slice(index, index + VISIBLE);

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
          {/* Flèche gauche */}
          <button
            onClick={prev}
            disabled={index === 0}
            className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 bg-background border rounded-full p-2 shadow hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {visible.map((t) => (
              <div key={t.name} className="bg-background rounded-2xl border p-8 space-y-4 relative">
                <Quote className="w-8 h-8 text-primary/20 absolute top-6 right-6" />
                <p className="text-foreground leading-relaxed italic">"{t.text}"</p>
                <div>
                  <p className="font-display font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.workshop}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Flèche droite */}
          <button
            onClick={next}
            disabled={index >= testimonials.length - VISIBLE}
            className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 bg-background border rounded-full p-2 shadow hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: testimonials.length - VISIBLE + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-primary/20"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
