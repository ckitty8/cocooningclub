import { useState, useEffect, FormEvent } from "react";
import { Sparkles, Heart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import WorkshopCarousel from "@/components/WorkshopCarousel";
import TestimonialsSection from "@/components/TestimonialsSection";
import JournalSection from "@/components/JournalSection";
import Footer from "@/components/Footer";
import PreInscriptionModal from "@/components/PreInscriptionModal";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-workshop-1920.webp";
import heroImageSmall from "@/assets/hero-workshop-960.webp";
import logoPapotages from "@/assets/espaces/papotages.webp";
import logoCreatifs from "@/assets/espaces/creatifs.webp";
import logoBusiness from "@/assets/espaces/business.webp";
import { trackVisit } from "@/utils/trackVisit";
import { usePublicAteliers } from "@/hooks/usePublicAteliers";
import { useAntiSpam } from "@/hooks/useAntiSpam";
import { messageErreurServeur } from "@/utils/messageErreurServeur";

const ATELIERS_COLUMNS = "id, titre, date_atelier, heure_debut, duree, places_disponibles, places_max, description, description_courte, lieu, adresse, tarif_affichage, tarif_standard, statut, date_fin_inscription";


// ── Formulaire de contact dynamique ──────────────────────
interface FormFieldConfig {
  id: string;
  label: string;
  field_type: "text" | "email" | "tel" | "textarea" | "select";
  obligatoire: boolean;
  position: number;
  options: string[] | null;
}

const ContactForm = () => {
  const [fields, setFields] = useState<FormFieldConfig[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const antiSpam = useAntiSpam();
  const [error, setError] = useState("");
  const [loadingFields, setLoadingFields] = useState(true);

  useEffect(() => {
    // maybeSingle() au lieu de single() : si la table est vide ou
    // contient plusieurs lignes, on ne lève pas d'erreur PGRST116 qui
    // laisserait le formulaire en loading infini.
    supabase
      .from("formulaires")
      .select("*, form_fields(*)")
      .eq("est_actif", true)
      .order("cree_le")
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[ContactForm.fetchFormulaires]", error);
        const fields = (data as { form_fields?: FormFieldConfig[] } | null)?.form_fields;
        if (fields) {
          const sorted = [...fields].sort((a, b) => a.position - b.position);
          setFields(sorted);
          const init: Record<string, string> = {};
          sorted.forEach(f => { init[f.id] = ""; });
          setValues(init);
        }
        setLoadingFields(false);
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const missing = fields.filter(f => f.obligatoire && !values[f.id]?.trim());
    if (missing.length > 0) {
      setError(`Veuillez remplir : ${missing.map(f => f.label).join(", ")}.`);
      return;
    }
    setSending(true);
    setError("");

    const reponses: Record<string, string> = {};
    fields.forEach(f => { if (values[f.id]) reponses[f.label] = values[f.id]; });

    const emailField = fields.find(f => f.field_type === "email");
    const telField = fields.find(f => f.field_type === "tel");

    // Robot repéré : on simule un envoi réussi sans rien enregistrer.
    const { error: dbError } = antiSpam.isBot()
      ? { error: null }
      : await supabase.from("contact_messages").insert({
          email: emailField ? values[emailField.id] || null : null,
          telephone: telField ? values[telField.id] || null : null,
          reponses,
        });

    if (dbError) {
      setError(messageErreurServeur(dbError));
    } else {
      setSent(true);
    }
    setSending(false);
  };

  const inputClass = "w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const TEXTAREA_MAX_LENGTH = 1000;

  if (loadingFields) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (fields.length === 0) return null;

  if (sent) return (
    <div className="text-center py-10 space-y-3">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <Heart className="w-7 h-7 text-green-600" />
      </div>
      <p className="font-semibold text-lg">Message envoyé !</p>
      <p className="text-sm text-muted-foreground">Nous vous répondrons dans les plus brefs délais.</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="relative space-y-4">
      {antiSpam.honeypot}
      {fields.map(field => (
        <div key={field.id}>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {field.label}{field.obligatoire && " *"}
          </label>
          {field.field_type === "textarea" ? (
            <>
              <textarea
                value={values[field.id] ?? ""}
                onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value.slice(0, TEXTAREA_MAX_LENGTH) }))}
                rows={4}
                maxLength={TEXTAREA_MAX_LENGTH}
                className={`${inputClass} resize-none`}
              />
              <p className={`text-xs mt-1 text-right ${
                (values[field.id]?.length ?? 0) >= TEXTAREA_MAX_LENGTH
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              }`}>
                {values[field.id]?.length ?? 0} / {TEXTAREA_MAX_LENGTH} caractères
              </p>
            </>
          ) : field.field_type === "select" ? (
            <select
              value={values[field.id] ?? ""}
              onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
              className={inputClass}
            >
              <option value="">— Choisir —</option>
              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input
              type={field.field_type}
              value={values[field.id] ?? ""}
              onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
              className={inputClass}
            />
          )}
        </div>
      ))}
      {error && <p className="text-destructive text-sm">{error}</p>}
      <button type="submit" disabled={sending}
        className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
        {sending ? "Envoi en cours..." : "Contactez-nous"}
      </button>
    </form>
  );
};

const Index = () => {
  const { ateliers, setAteliers, loading: ateliersLoading, error: ateliersError, reload: reloadAteliers } =
    usePublicAteliers(ATELIERS_COLUMNS);
  // Titre de l'atelier présélectionné dans la fenêtre de pré-inscription
  // ("" = aucun), ou null quand la fenêtre est fermée.
  const [preInscription, setPreInscription] = useState<string | null>(null);
  // Sur mobile/tactile il n'y a pas de :hover : on permet aussi de retourner
  // un espace au tap, en plus du survol souris sur desktop.
  const [flippedAntenne, setFlippedAntenne] = useState<number | null>(null);

  useEffect(() => {
    trackVisit("/");

    const channel = supabase
      .channel("ateliers-spots")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ateliers" },
        (payload) => {
          setAteliers((prev) =>
            prev.map((a) =>
              a.id === payload.new.id ? { ...a, places_disponibles: payload.new.places_disponibles } : a
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [setAteliers]);

  const openModal = (workshopTitle = "") => setPreInscription(workshopTitle);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto flex flex-col items-center py-6 px-6 relative">
          <Link
            to="/login"
            className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:inline-flex border border-foreground/40 px-5 py-2 text-xs tracking-[0.2em] uppercase text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            Espace Membre
          </Link>

          <img src="/logo-160.webp" alt="Logo Cocooning Club" width={80} height={80} className="mx-auto mb-2 w-16 md:w-20 h-auto" />
          <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <h2 className="font-brand text-3xl md:text-5xl font-bold text-foreground tracking-[0.08em] uppercase leading-tight text-center hover:opacity-80 transition-opacity">
              Cocooning Club
            </h2>
          </Link>
          <span className="text-xs tracking-[0.35em] uppercase text-muted-foreground mt-1">Club</span>

          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-4 font-body text-xs md:text-sm tracking-[0.12em] uppercase text-foreground/80">
            <a href="#apropos" className="hover:text-primary transition-colors">À propos</a>
            <a href="#ateliers" className="hover:text-primary transition-colors">Nos Ateliers</a>
            <Link to="/calendrier" className="hover:text-primary transition-colors">Calendrier</Link>
            <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
            <Link to="/login" className="md:hidden hover:text-primary transition-colors">Espace Membre</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center pt-80 sm:pt-64 md:pt-52">
        <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Papotages, Créatifs & Business, à taille humaine
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground leading-tight">
              Sortez de la routine,{" "}
              <span className="italic text-primary">connectez.</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-md leading-relaxed">
              Cocooning Club propose des ateliers autour de 3 espaces — Papotages, Créatifs et Business — 1 à 2 fois par mois dans une ambiance chaleureuse et bienveillante. Pas besoin d'être experte, juste d'avoir envie de déconnecter.
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
              <img
                src={heroImage}
                srcSet={`${heroImageSmall} 960w, ${heroImage} 1920w`}
                sizes="(min-width: 768px) 50vw, 100vw"
                width={1920}
                height={1080}
                // React 18 ne connaît pas encore fetchPriority : on passe l'attribut HTML brut.
                {...{ fetchpriority: "high" }}
                alt="Table d'atelier créatif avec bougies allumées, palette d'aquarelle, ciseaux et pelote de laine"
                className="w-full h-[280px] sm:h-[380px] md:h-[500px] object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-card scroll-mt-80 sm:scroll-mt-56 md:scroll-mt-64" id="apropos">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-4">
            Un moment pour soi
          </h2>
          <p className="text-center text-muted-foreground max-w-lg mx-auto mb-16">
            Nos ateliers sont pensés comme des bulles de douceur. On se retrouve, on échange, on avance.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Sparkles, title: "Diversité", desc: "Papotages, ateliers créatifs, sessions business : une palette large pour se retrouver autrement." },
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

      {/* Nos espaces */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-4">
            Nos espaces
          </h2>
          <p className="text-center text-muted-foreground max-w-lg mx-auto mb-16">
            Trois grands espaces d'ateliers pour répondre à toutes vos envies du moment.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                logo: logoPapotages,
                title: "Papotages",
                desc: "Des rencontres informelles pour échanger, se confier et créer du lien autour d'un café.",
              },
              {
                logo: logoCreatifs,
                title: "Créatifs",
                desc: "Peinture, bougie, macramé, poterie… des ateliers manuels pour se reconnecter à soi.",
              },
              {
                logo: logoBusiness,
                title: "Business",
                desc: "Entrepreneuriat, développement pro et perso : des ateliers pour avancer entourée.",
              },
            ].map((antenne, i) => (
              <div
                key={antenne.title}
                className="group h-64 [perspective:1200px] cursor-pointer"
                onClick={() => setFlippedAntenne(prev => (prev === i ? null : i))}
              >
                <div className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] ${flippedAntenne === i ? "[transform:rotateY(180deg)]" : ""}`}>
                  {/* Face avant */}
                  <div className="absolute inset-0 [backface-visibility:hidden] bg-card rounded-2xl p-6 border flex items-center justify-center">
                    {/* Logo de l'espace (charte graphique) : il contient déjà le nom,
                        le titre reste présent pour les lecteurs d'écran et Google. */}
                    <img
                      src={antenne.logo}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="max-h-full max-w-full object-contain"
                    />
                    <h3 className="sr-only">{antenne.title}</h3>
                  </div>
                  {/* Face arrière */}
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-card rounded-2xl p-8 border flex items-center justify-center text-center">
                    <p className="text-muted-foreground text-sm leading-relaxed">{antenne.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workshops */}
      <section className="py-24 scroll-mt-80 sm:scroll-mt-56 md:scroll-mt-64" id="ateliers">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-4">
            Prochains ateliers
          </h2>
          <p className="text-center text-muted-foreground max-w-lg mx-auto mb-16">
            Réservez votre place, quel que soit l'espace qui vous attire.
          </p>
          {ateliers.length === 0 ? (
            <div className="text-center py-12 border rounded-2xl bg-card max-w-2xl mx-auto">
              {ateliersLoading ? (
                <p className="text-muted-foreground">Chargement des ateliers…</p>
              ) : ateliersError ? (
                <>
                  <p className="text-muted-foreground mb-4">
                    Impossible de charger les ateliers pour le moment.<br />
                    Vérifie ta connexion puis réessaie.
                  </p>
                  <button
                    onClick={reloadAteliers}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Réessayer
                  </button>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Aucun atelier programmé pour le moment.<br />
                  Inscris-toi à la newsletter pour être prévenu des prochains.
                </p>
              )}
            </div>
          ) : (
            <WorkshopCarousel workshops={ateliers} onReserve={openModal} />
          )}
        </div>
      </section>

      {/* Témoignages */}
      <TestimonialsSection />

      {/* Journal membres */}
      <JournalSection />

      {/* Contact */}
      <section className="py-24 bg-card scroll-mt-80 sm:scroll-mt-56 md:scroll-mt-64" id="contact">
        <div className="container mx-auto px-6 max-w-xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Envie de nous rejoindre ?
            </h2>
            <p className="text-muted-foreground">
              Suivez-nous sur les réseaux ou écrivez-nous pour ne rien manquer des prochains ateliers.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {preInscription !== null && (
        <PreInscriptionModal
          ateliers={ateliers}
          atelierInitial={preInscription}
          onFermer={() => setPreInscription(null)}
        />
      )}
    </div>
  );
};

export default Index;
