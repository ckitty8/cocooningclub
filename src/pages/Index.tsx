import { useState } from "react";
import { Sparkles, Calendar, Heart, Users, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-workshop.jpg";

const workshops = [
  { title: "Atelier Bougies Parfumées", date: "Samedi 22 Mars", time: "14h – 17h", spots: 8, description: "Créez vos propres bougies avec des cires naturelles et des huiles essentielles." },
  { title: "Aquarelle & Détente", date: "Samedi 5 Avril", time: "10h – 13h", spots: 10, description: "Initiez-vous à l'aquarelle dans une ambiance douce et bienveillante." },
  { title: "Macramé Mural", date: "Samedi 19 Avril", time: "14h – 17h", spots: 6, description: "Apprenez les nœuds de base et repartez avec votre création murale." },
  { title: "Poterie & Modelage", date: "Samedi 3 Mai", time: "10h – 13h", spots: 8, description: "Découvrez le travail de la terre et façonnez votre premier objet en argile." },
  { title: "Broderie Moderne", date: "Samedi 17 Mai", time: "14h – 17h", spots: 10, description: "Apprenez les points essentiels et créez un motif contemporain sur tambour." },
  { title: "Atelier Terrarium", date: "Samedi 31 Mai", time: "10h – 13h", spots: 8, description: "Composez votre mini-jardin sous verre avec des plantes tropicales." },
  { title: "Lettering & Calligraphie", date: "Samedi 14 Juin", time: "14h – 17h", spots: 10, description: "Initiez-vous au brush lettering et repartez avec une œuvre encadrée." },
  { title: "Savons Naturels", date: "Samedi 28 Juin", time: "10h – 13h", spots: 8, description: "Fabriquez vos savons artisanaux aux huiles végétales et parfums naturels." },
  { title: "Tissage sur Cadre", date: "Samedi 12 Juillet", time: "14h – 17h", spots: 6, description: "Créez une pièce tissée unique en jouant avec les textures et les couleurs." },
  { title: "Atelier Céramique", date: "Samedi 26 Juillet", time: "10h – 13h", spots: 8, description: "Modelez et décorez une tasse ou un bol en céramique artisanale." },
  { title: "Couronnes de Fleurs Séchées", date: "Samedi 9 Août", time: "14h – 17h", spots: 10, description: "Composez une couronne décorative avec des fleurs séchées et stabilisées." },
  { title: "Initiation Crochet", date: "Samedi 23 Août", time: "10h – 13h", spots: 8, description: "Apprenez les mailles de base et réalisez votre premier accessoire au crochet." },
];

const inscriptionSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(100),
  email: z.string().trim().email("Veuillez entrer un email valide.").max(255),
  workshop: z.string().min(1, "Veuillez choisir un atelier."),
});

type InscriptionData = z.infer<typeof inscriptionSchema>;

const Index = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [preselectedWorkshop, setPreselectedWorkshop] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InscriptionData>({
    resolver: zodResolver(inscriptionSchema),
    defaultValues: { name: "", email: "", workshop: "" },
  });

  const openModal = (workshopTitle?: string) => {
    reset({ name: "", email: "", workshop: workshopTitle || "" });
    setPreselectedWorkshop(workshopTitle || "");
    setModalOpen(true);
  };

  const onSubmit = async (data: InscriptionData) => {
    const { error } = await supabase.from("inscriptions").insert({
      name: data.name,
      email: data.email,
      workshop: data.workshop,
    });

    if (error) {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
      return;
    }

    toast.success(`Merci ${data.name} ! Votre inscription à "${data.workshop}" a bien été prise en compte.`);
    setModalOpen(false);
    reset();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto flex flex-col items-center py-6 px-6 relative">
          {/* Member button - absolute right */}
          <a
            href="#contact"
            className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:inline-flex border border-foreground/40 px-5 py-2 text-xs tracking-[0.2em] uppercase text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            Espace Membre
          </a>

          {/* Centered title */}
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-[0.08em] uppercase leading-tight text-center">
            Cocooning Club
          </h2>
          <span className="text-xs tracking-[0.35em] uppercase text-muted-foreground mt-1">Club</span>

          {/* Navigation links */}
          <div className="flex gap-8 mt-4 font-body text-sm tracking-[0.12em] uppercase text-foreground/80">
            <a href="#apropos" className="hover:text-primary transition-colors">À propos</a>
            <a href="#ateliers" className="hover:text-primary transition-colors">Nos Ateliers</a>
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
            <button
              onClick={() => openModal()}
              className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Découvrir les prochains ateliers
            </button>
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
                    <button
                      onClick={() => openModal(ws.title)}
                      className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                    >
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

      {/* Modal d'inscription */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div
            className="bg-background rounded-3xl border shadow-2xl w-full max-w-md mx-4 p-8 relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display text-2xl font-bold text-foreground mb-1">Inscription</h3>
            <p className="text-sm text-muted-foreground mb-6">Remplissez le formulaire pour réserver votre place.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nom complet</label>
                <input
                  {...register("name")}
                  placeholder="Marie Dupont"
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="marie@email.com"
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Atelier</label>
                <select
                  {...register("workshop")}
                  className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Choisir un atelier…</option>
                  {workshops.map((ws) => (
                    <option key={ws.title} value={ws.title}>
                      {ws.title} — {ws.date}
                    </option>
                  ))}
                </select>
                {errors.workshop && <p className="text-destructive text-xs mt-1">{errors.workshop.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity mt-2 disabled:opacity-50"
              >
                Confirmer l'inscription
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
