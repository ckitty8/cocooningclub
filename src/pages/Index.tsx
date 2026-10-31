import { useState, useEffect, FormEvent } from "react";
import { ArrowRight, Feather, HandHeart, Heart, MessagesSquare, Pencil, Users } from "lucide-react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import { Bouton, GrilleValeurs, Surtitre, TitreSection, type Valeur } from "@/components/vitrine";
import WorkshopCarousel from "@/components/WorkshopCarousel";
import TestimonialsSection from "@/components/TestimonialsSection";
import JournalSection from "@/components/JournalSection";
import Footer from "@/components/Footer";
import PreInscriptionModal from "@/components/PreInscriptionModal";
import { supabase } from "@/integrations/supabase/client";
import photoFondatrices from "@/assets/accueil/fondatrices.webp";
import photoGroupe from "@/assets/accueil/groupe.webp";
import photoAtelier from "@/assets/hero-workshop-960.webp";
import { ESPACES_PAR_SLUG } from "@/lib/espaces";
import { trackVisit } from "@/utils/trackVisit";
import { usePublicAteliers } from "@/hooks/usePublicAteliers";
import { useAntiSpam } from "@/hooks/useAntiSpam";
import { messageErreurServeur } from "@/utils/messageErreurServeur";

const ATELIERS_COLUMNS = "id, titre, date_atelier, heure_debut, duree, places_disponibles, places_max, description, description_courte, lieu, adresse, tarif_affichage, tarif_standard, statut, date_fin_inscription, matin, apres_midi, espaces(slug)";


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

const VALEURS: Valeur[] = [
  { icone: Users, titre: "Convivialité", description: "Se retrouver et partager de bons moments en toute simplicité." },
  { icone: Feather, titre: "Bienveillance", description: "Accueillir chacune telle qu'elle est, sans jugement ni pression." },
  { icone: MessagesSquare, titre: "Partage", description: "Nos expériences, nos passions et nos différences sont une vraie richesse." },
  { icone: Pencil, titre: "Créativité", description: "Oser découvrir, expérimenter et imaginer ensemble." },
  { icone: HandHeart, titre: "Entraide", description: "Un conseil, un encouragement ou un coup de main peuvent faire toute la différence." },
];

const Index = () => {
  const { ateliers, setAteliers, loading: ateliersLoading, error: ateliersError, reload: reloadAteliers } =
    usePublicAteliers(ATELIERS_COLUMNS);
  // Titre de l'atelier présélectionné dans la fenêtre de pré-inscription
  // ("" = aucun), ou null quand la fenêtre est fermée.
  const [preInscription, setPreInscription] = useState<string | null>(null);
  // Sur mobile/tactile il n'y a pas de :hover : on permet aussi de retourner
  // un espace au tap, en plus du survol souris sur desktop.
  const [flippedEspace, setFlippedEspace] = useState<number | null>(null);

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
    // Thème crème des pages vitrine (variables dans index.css).
    <div className="theme-vitrine min-h-screen bg-background text-foreground">
      <SiteHeader actif="Accueil" />

      {/* Hero */}
      <section className="pt-20">
        <div className="container mx-auto grid items-center gap-10 px-6 py-12 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <div className="space-y-5">
            <Surtitre>À propos</Surtitre>
            <h1 className="font-display text-5xl leading-[1.1] text-foreground sm:text-6xl lg:text-7xl">
              Le Cocooning Club
            </h1>
            <p className="text-lg leading-snug text-terracotta md:text-xl">
              Des rencontres, de la créativité, de l'entraide et surtout, de belles aventures entre femmes !
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              Le Cocooning Club est une association née en Seine-Saint-Denis (93) d'une envie simple : rassembler
              les femmes autour de moments de partage, de créativité et de convivialité, avec des ateliers à
              Gagny, Chelles et Le Raincy.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              Un club où chacune peut trouver sa place, qu'elle ait envie de papoter autour d'un café, de découvrir
              une activité créative ou de faire grandir son projet professionnel.
            </p>
            <div className="flex flex-wrap gap-3">
              <Bouton to="/#espaces">Découvrir nos espaces</Bouton>
              <Bouton to="/notre-histoire" variante="contour">Notre histoire</Bouton>
            </div>
          </div>
          <div className="relative order-first overflow-hidden rounded-3xl shadow-md lg:order-none">
            <img
              src={photoFondatrices}
              width={1400}
              height={1000}
              // React 18 ne connaît pas encore fetchPriority : on passe l'attribut HTML brut.
              {...{ fetchpriority: "high" }}
              alt="Cinq femmes du Cocooning Club, souriantes, serrées les unes contre les autres"
              className="aspect-[7/5] w-full object-cover"
            />
            <p className="absolute inset-x-[16%] top-[13%] text-center font-display text-xl leading-tight text-foreground sm:inset-x-[20%] sm:top-[18%] sm:text-4xl">
              Plus qu’un club, une communauté de femmes inspirantes
            </p>
          </div>
        </div>
      </section>

      {/* Nos espaces */}
      <section className="scroll-mt-20 py-20 md:py-24" id="espaces">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center">
            <Surtitre>Notre univers</Surtitre>
            <TitreSection>Trois univers pour se retrouver</TitreSection>
            <span className="mx-auto block h-0.5 w-10 bg-primary" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              Trois espaces complémentaires, pensés pour répondre à toutes vos envies : se rencontrer, créer et
              entreprendre, avec des ateliers à Gagny, Chelles et Le Raincy. Toujours dans la même ambiance :
              bienveillante, conviviale et sans pression.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                logo: ESPACES_PAR_SLUG.papotages.logo,
                title: "Papotages",
                to: "/papotages",
                desc: "Des rencontres informelles pour échanger, se confier et créer du lien autour d'un café.",
              },
              {
                logo: ESPACES_PAR_SLUG.creatifs.logo,
                title: "Créatifs",
                to: "/creatifs",
                desc: "Peinture, bougie, macramé, poterie… des ateliers manuels pour se reconnecter à soi.",
              },
              {
                logo: ESPACES_PAR_SLUG.business.logo,
                title: "Business",
                to: "/business",
                desc: "Entrepreneuriat, développement pro et perso : des ateliers pour avancer entourée.",
              },
            ].map((espace, i) => (
              <div
                key={espace.title}
                className="group h-64 [perspective:1200px] cursor-pointer"
                onClick={() => setFlippedEspace(prev => (prev === i ? null : i))}
              >
                <div className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] ${flippedEspace === i ? "[transform:rotateY(180deg)]" : ""}`}>
                  {/* Face avant */}
                  <div className="absolute inset-0 [backface-visibility:hidden] bg-card rounded-2xl p-6 border flex items-center justify-center">
                    {/* Logo de l'espace (charte graphique) : il contient déjà le nom,
                        le titre reste présent pour les lecteurs d'écran et Google. */}
                    <img
                      src={espace.logo}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="max-h-full max-w-full object-contain"
                    />
                    <h3 className="sr-only">{espace.title}</h3>
                  </div>
                  {/* Face arrière */}
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-card rounded-2xl p-8 border flex items-center justify-center text-center">
                    <div className="space-y-3">
                      <p className="text-muted-foreground text-sm leading-relaxed">{espace.desc}</p>
                      <Link
                        to={espace.to}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-terracotta underline underline-offset-2"
                      >
                        Découvrir l'espace {espace.title}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notre histoire */}
      <section className="grid bg-card md:grid-cols-2">
        <div className="flex items-center px-6 pt-10 md:p-10">
          <img
            src={photoGroupe}
            width={1400}
            height={1050}
            alt="Les cinq fondatrices du Cocooning Club souriantes, autour d'un bouquet de fleurs, avec le logo du club sur une tablette"
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-md"
          />
        </div>
        <div className="max-w-xl space-y-5 px-6 py-14 md:px-12 md:py-20 lg:px-16">
          <Surtitre>Notre histoire</Surtitre>
          <TitreSection className="text-left">Une idée devenue une belle aventure collective</TitreSection>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Tout a commencé avec Maëlle et une envie toute simple : retrouver du contact humain, faire de nouvelles
            rencontres et créer un espace où les femmes pourraient se retrouver.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            De cette idée est née une aventure collective, portée aujourd'hui par cinq femmes aux personnalités et
            aux talents complémentaires : Maëlle, Christelle, Aurélie, Coraline et Fabienne.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
            Cinq parcours différents, une même envie : imaginer des moments qui rassemblent et faire grandir une
            communauté féminine locale.
          </p>
          <Bouton to="/notre-histoire">Lire notre histoire</Bouton>
        </div>
      </section>

      {/* Nos valeurs */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-6">
          <div className="mb-12 space-y-4 text-center">
            <Surtitre>Nos valeurs</Surtitre>
            <TitreSection>Ce qui nous anime au quotidien</TitreSection>
          </div>
          <GrilleValeurs valeurs={VALEURS} />
        </div>
      </section>

      {/* Appel à rejoindre le club */}
      <section className="container mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl bg-card">
          <img
            src={photoAtelier}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover md:block"
          />
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-r from-card via-card/60 to-transparent md:block" />
          <div className="relative flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div className="max-w-xl space-y-3">
              <Surtitre>Et si la prochaine belle rencontre, c'était toi ?</Surtitre>
              <TitreSection className="text-left">Rejoins l'aventure</TitreSection>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Que tu viennes pour un café, un atelier ou un projet professionnel, tu trouveras au Cocooning Club
                des femmes qui partagent cette envie de se rencontrer, de créer et d'avancer ensemble.
              </p>
            </div>
            <Link
              to="/calendrier"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full bg-white px-7 py-3 text-sm font-medium text-foreground shadow-md transition-colors hover:text-terracotta md:self-center"
            >
              Découvrir nos événements
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Prochains ateliers */}
      <section className="scroll-mt-20 py-20 md:py-24" id="ateliers">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-12 max-w-lg space-y-4 text-center">
            <Surtitre>Nos événements</Surtitre>
            <TitreSection>Prochains ateliers</TitreSection>
            <p className="text-muted-foreground">
              Réservez votre place, quel que soit l'espace qui vous attire.
            </p>
            <div className="pt-2">
              <Bouton to="/calendrier" variante="contour">Voir tous nos événements</Bouton>
            </div>
          </div>
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
      <section className="scroll-mt-20 bg-card py-20 md:py-24" id="contact">
        <div className="container mx-auto px-6 max-w-xl">
          <div className="mb-10 space-y-4 text-center">
            <Surtitre>Contact</Surtitre>
            <TitreSection>Envie de nous rejoindre{"\u00a0"}?</TitreSection>
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
