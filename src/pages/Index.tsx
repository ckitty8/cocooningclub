import { Sparkles, Calendar, Heart, Users } from "lucide-react";
import heroImage from "@/assets/hero-workshop.jpg";

const workshops = [
  {
    title: "Atelier Bougies Parfumées",
    date: "Samedi 22 Mars",
    time: "14h – 17h",
    spots: 8,
    description: "Créez vos propres bougies avec des cires naturelles et des huiles essentielles.",
  },
  {
    title: "Aquarelle & Détente",
    date: "Samedi 5 Avril",
    time: "10h – 13h",
    spots: 10,
    description: "Initiez-vous à l'aquarelle dans une ambiance douce et bienveillante.",
  },
  {
    title: "Macramé Mural",
    date: "Samedi 19 Avril",
    time: "14h – 17h",
    spots: 6,
    description: "Apprenez les nœuds de base et repartez avec votre création murale.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto flex items-center justify-between py-4 px-6">
          <span className="font-display text-2xl font-bold text-foreground tracking-tight">
            Cocooning Club
          </span>
          <div className="hidden md:flex gap-8 font-body text-sm text-muted-foreground">
            <a href="#ateliers" className="hover:text-primary transition-colors">Ateliers</a>
            <a href="#apropos" className="hover:text-primary transition-colors">À propos</a>
            <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center pt-20">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Ateliers créatifs à taille humaine
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground leading-tight">
              Sortez de la routine,{" "}
              <span className="italic text-primary">créez.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Cocooning Club propose des ateliers créatifs 1 à 2 fois par mois dans une ambiance chaleureuse et bienveillante. Pas besoin d'être artiste, juste d'avoir envie de déconnecter.
            </p>
            <a
              href="#ateliers"
              className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Découvrir les prochains ateliers
            </a>
          </div>
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl">
              <img src={heroImage} alt="Table d'atelier créatif avec bougies, peinture et matériaux" className="w-full h-[500px] object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-card rounded-2xl p-4 shadow-lg border">
              <div className="flex items-center gap-3">
                <div className="bg-secondary/30 p-2 rounded-full">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">+200</p>
                  <p className="text-xs text-muted-foreground">participants heureux</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-card" id="apropos">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-4">
            Un moment pour soi
          </h2>
          <p className="text-center text-muted-foreground max-w-lg mx-auto mb-16">
            Nos ateliers sont pensés comme des bulles de douceur. On déconnecte, on crée, on partage.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Sparkles, title: "Créativité", desc: "Des thèmes variés chaque mois : bougie, aquarelle, macramé, poterie…" },
              { icon: Users, title: "Convivialité", desc: "Petits groupes pour un moment chaleureux et des échanges authentiques." },
              { icon: Heart, title: "Bienveillance", desc: "Aucun niveau requis. On vient comme on est, on repart le cœur léger." },
            ].map((item) => (
              <div key={item.title} className="bg-background rounded-2xl p-8 text-center space-y-4 border hover:shadow-lg transition-shadow">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workshops */}
      <section className="py-24" id="ateliers">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-4">
            Prochains ateliers
          </h2>
          <p className="text-center text-muted-foreground max-w-lg mx-auto mb-16">
            Réservez votre place pour un moment créatif inoubliable.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {workshops.map((ws) => (
              <div key={ws.title} className="bg-card rounded-2xl border overflow-hidden hover:shadow-lg transition-shadow group">
                <div className="bg-primary/5 p-6 border-b">
                  <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4" />
                    {ws.date} · {ws.time}
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground">{ws.title}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-muted-foreground text-sm leading-relaxed">{ws.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{ws.spots} places disponibles</span>
                    <button className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
                      Réserver
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-24 bg-card" id="contact">
        <div className="container mx-auto px-6 max-w-xl text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Envie de nous rejoindre ?
          </h2>
          <p className="text-muted-foreground mb-8">
            Suivez-nous sur les réseaux ou écrivez-nous pour ne rien manquer des prochains ateliers.
          </p>
          <a
            href="mailto:hello@cocooningclub.fr"
            className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
          >
            hello@cocooningclub.fr
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2026 Cocooning Club · Tous droits réservés
        </div>
      </footer>
    </div>
  );
};

export default Index;
