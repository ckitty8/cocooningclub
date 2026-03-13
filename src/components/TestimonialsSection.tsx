import { Quote } from "lucide-react";

const testimonials = [
  { name: "Sophie L.", text: "Un vrai moment de déconnexion. J'ai adoré l'atelier bougies, l'ambiance était incroyable !", workshop: "Atelier Bougies" },
  { name: "Camille R.", text: "Je n'avais jamais touché un pinceau et pourtant je suis repartie avec une aquarelle dont je suis fière. Merci !", workshop: "Aquarelle & Détente" },
  { name: "Léa M.", text: "Le macramé c'était top ! Petit groupe, super animatrice, je recommande à 100%.", workshop: "Macramé Mural" },
  { name: "Julie D.", text: "J'ai offert ma création en céramique à ma mère, elle était ravie. Vivement le prochain atelier !", workshop: "Atelier Céramique" },
];

const TestimonialsSection = () => (
  <section className="py-24 bg-card">
    <div className="container mx-auto px-6">
      <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-4">
        Ce qu'elles en disent
      </h2>
      <p className="text-center text-muted-foreground max-w-lg mx-auto mb-16">
        Découvrez les retours de nos participantes après leurs ateliers.
      </p>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {testimonials.map((t) => (
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
    </div>
  </section>
);

export default TestimonialsSection;
