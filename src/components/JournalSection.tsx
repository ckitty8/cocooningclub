import { BookOpen, Lock } from "lucide-react";

const JournalSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-6">
      <div className="max-w-4xl mx-auto bg-card rounded-3xl border overflow-hidden md:grid md:grid-cols-2">
        {/* Left — visual */}
        <div className="bg-primary/5 p-10 md:p-14 flex flex-col justify-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-medium w-fit">
            <Lock className="w-3.5 h-3.5" />
            Réservé aux membres
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground leading-tight">
            Le Journal du Club
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Chaque mois, nos membres reçoivent un journal exclusif : inspirations créatives, tutoriels pas-à-pas, interviews d'artisanes et coulisses de nos ateliers.
          </p>
        </div>

        {/* Right — details */}
        <div className="p-10 md:p-14 flex flex-col justify-center space-y-6">
          <div className="space-y-4">
            {[
              { title: "Tutoriels exclusifs", desc: "Des guides illustrés pour prolonger la créativité chez vous." },
              { title: "Interviews d'artisanes", desc: "Rencontrez les créatrices qui animent nos ateliers." },
              { title: "Accès anticipé", desc: "Réservez vos places avant l'ouverture au public." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-display font-semibold text-foreground text-sm">{item.title}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <a
            href="#contact"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-opacity w-fit"
          >
            Devenir membre
          </a>
        </div>
      </div>
    </div>
  </section>
);

export default JournalSection;
