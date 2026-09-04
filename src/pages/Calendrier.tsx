import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, MapPin, Clock, Users, Euro, X, Calendar, CalendarPlus, Download, CheckCircle2 } from "lucide-react";
import { FRENCH_MONTHS, formatDateFr, formatTimeFr, parseDateAtelier } from "@/data/workshops";
import type { Workshop } from "@/data/workshops";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { googleCalendarUrl, downloadIcsFile } from "@/utils/calendarLinks";
import { googleMapsSearchUrl } from "@/utils/googleMaps";
import { trackVisit } from "@/utils/trackVisit";

const FRENCH_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const PIERRE_ORACLE = "Atelier Créatif — Pierre & Oracle";

const inscriptionSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(100),
  email: z.string().trim().email("Veuillez entrer un email valide.").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  workshop: z.string().min(1, "Veuillez choisir un atelier."),
  birthdate: z.string().optional(),
}).refine((d) => d.workshop !== PIERRE_ORACLE || (!!d.birthdate && d.birthdate.trim().length > 0), {
  message: "La date de naissance est requise pour cet atelier.",
  path: ["birthdate"],
});
type InscriptionData = z.infer<typeof inscriptionSchema>;

const Calendrier = () => {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const [ateliers, setAteliers] = useState<Workshop[]>([]);
  const [popinWorkshop, setPopinWorkshop] = useState<Workshop | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [confirmedWorkshop, setConfirmedWorkshop] = useState<Workshop | null>(null);

  // Fetch workshops from Supabase
  useEffect(() => {
    trackVisit("/calendrier");
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("ateliers")
      .select("id, titre, date_atelier, heure_debut, duree, places_disponibles, places_max, description, lieu, adresse, tarif_affichage, tarif_standard, statut, date_fin_inscription")
      .in("statut", ["publie", "complet"])
      .gte("date_atelier", today)
      .order("date_atelier")
      .then(({ data, error }) => {
        if (error) {
          console.error("[Calendrier.fetchAteliers]", error);
          return;
        }
        if (data) setAteliers(data as Workshop[]);
      });
  }, []);

  // Ouvre la pop-in si l'URL contient ?workshop=N (clic depuis le
  // carrousel home qui passe l'index dans le query param).
  useEffect(() => {
    const param = searchParams.get("workshop");
    if (param !== null && ateliers.length > 0) {
      const idx = parseInt(param);
      if (!isNaN(idx) && idx >= 0 && idx < ateliers.length) {
        setPopinWorkshop(ateliers[idx]);
      }
    }
  }, [searchParams, ateliers]);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<InscriptionData>({
    resolver: zodResolver(inscriptionSchema),
    defaultValues: { name: "", email: "", phone: "", workshop: "", birthdate: "" },
  });

  const selectedWorkshop = watch("workshop");

  const openReserve = (ws: Workshop) => {
    reset({ name: "", email: "", phone: "", workshop: ws.titre, birthdate: "" });
    setConfirmedWorkshop(null);
    setReserveOpen(true);
  };

  const onSubmit = async (data: InscriptionData) => {
    const atelier = ateliers.find((a) => a.titre === data.workshop);
    const nameParts = data.name.trim().split(/\s+/);
    const prenom = nameParts[0] || "";
    const nom = nameParts.slice(1).join(" ") || prenom;

    // Si l'utilisateur est connecté on lie l'inscription à son compte
    // (utilisateur_id) pour qu'elle apparaisse correctement dans son
    // espace membre et avec le bon rôle côté admin. On garde quand même
    // les champs invité au cas où le formulaire a été modifié.
    const { error } = await supabase.from("inscriptions").insert({
      atelier_id: atelier?.id ?? null,
      utilisateur_id: profile?.id ?? null,
      prenom_invite: prenom,
      nom_invite: nom,
      email_invite: data.email,
      statut: "en_attente",
      statut_paiement: atelier && atelier.tarif_standard > 0 ? "en_attente" : "non_requis",
      ...(data.phone ? { telephone_invite: data.phone } : {}),
      ...(data.birthdate ? { date_naissance: data.birthdate } : {}),
    });
    if (error) { toast.error("Une erreur est survenue. Veuillez réessayer."); return; }
    if (atelier) {
      setConfirmedWorkshop(atelier);
    } else {
      toast.success(
        `Merci ${prenom} ! Votre pré-inscription a bien été enregistrée. Vous recevrez une confirmation par email ou WhatsApp après validation.`,
        { duration: 6000 }
      );
      setReserveOpen(false);
    }
    reset();
  };


  const selectedDate = popinWorkshop ? parseDateAtelier(popinWorkshop.date_atelier) : null;

  // Regroupe les ateliers par mois (clé "YYYY-MM") en gardant l'ordre
  // chronologique. Plus facile à scanner qu'une grille mensuelle classique.
  const ateliersParMois = ateliers.reduce<Record<string, Workshop[]>>((acc, ws) => {
    const d = parseDateAtelier(ws.date_atelier);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ws);
    return acc;
  }, {});
  const moisOrdonnes = Object.keys(ateliersParMois).sort();

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
          <Link to="/">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-[0.08em] uppercase leading-tight text-center hover:opacity-80 transition-opacity">
              Cocooning Club
            </h2>
          </Link>
          <span className="text-xs tracking-[0.35em] uppercase text-muted-foreground mt-1">Club</span>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-4 font-body text-xs md:text-sm tracking-[0.12em] uppercase text-foreground/80">
            <Link to="/#apropos" className="hover:text-primary transition-colors">À propos</Link>
            <Link to="/#ateliers" className="hover:text-primary transition-colors">Nos Ateliers</Link>
            <Link to="/calendrier" className="text-primary font-medium">Calendrier</Link>
            <Link to="/#contact" className="hover:text-primary transition-colors">Contact</Link>
            <Link to="/login" className="md:hidden hover:text-primary transition-colors">Espace Membre</Link>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="pt-40 pb-24">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
              Calendrier des ateliers
            </h1>
            <p className="text-muted-foreground">
              Tous les rendez-vous à venir, regroupés par mois. Cliquez sur un atelier pour le détail.
            </p>
          </div>

          {/* Liste chronologique des ateliers groupés par mois */}
          {ateliers.length === 0 ? (
            <div className="text-center py-16 border rounded-2xl bg-card">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun atelier programmé pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {moisOrdonnes.map(moisKey => {
                const [year, monthIdx] = moisKey.split("-").map(Number);
                const ateliersMois = ateliersParMois[moisKey];
                return (
                  <section key={moisKey}>
                    {/* Bandeau mois */}
                    <div className="flex items-baseline gap-3 mb-5 border-b pb-3">
                      <h2 className="font-display text-2xl font-semibold text-foreground capitalize">
                        {FRENCH_MONTHS[monthIdx]}
                      </h2>
                      <span className="text-sm tracking-[0.15em] uppercase text-muted-foreground">
                        {year}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {ateliersMois.length} atelier{ateliersMois.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Cartes ateliers */}
                    <div className="space-y-3">
                      {ateliersMois.map(ws => {
                        const d = parseDateAtelier(ws.date_atelier);
                        const isSelected = selectedDate &&
                          selectedDate.getTime() === d.getTime() &&
                          popinWorkshop?.id === ws.id;
                        const full = ws.statut === "complet" || ws.places_disponibles <= 0;
                        return (
                          <button
                            key={ws.id}
                            onClick={() => setPopinWorkshop(ws)}
                            className={`w-full text-left flex items-stretch gap-4 rounded-2xl border bg-card p-4 hover:shadow-md transition-all ${
                              isSelected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/30"
                            }`}
                          >
                            {/* Bloc date à gauche */}
                            <div className="shrink-0 w-16 md:w-20 rounded-xl bg-primary/10 text-primary flex flex-col items-center justify-center py-2">
                              <span className="text-xs font-semibold tracking-[0.1em] uppercase">
                                {FRENCH_DAYS[(d.getDay() + 6) % 7]}
                              </span>
                              <span className="text-2xl md:text-3xl font-display font-bold leading-none mt-1">
                                {d.getDate()}
                              </span>
                              <span className="text-[10px] tracking-[0.1em] uppercase mt-0.5">
                                {FRENCH_MONTHS[d.getMonth()].slice(0, 3)}
                              </span>
                            </div>

                            {/* Contenu */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-display text-lg font-semibold text-foreground">
                                  {ws.titre}
                                </h3>
                                {full && (
                                  <span className="text-[10px] tracking-[0.1em] uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                    Complet
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> {formatTimeFr(ws.heure_debut)} · {ws.duree}
                                </span>
                                {ws.lieu && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {ws.adresse ? (
                                      <a
                                        href={googleMapsSearchUrl(ws.adresse)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="hover:underline"
                                      >
                                        {ws.lieu}
                                      </a>
                                    ) : ws.lieu}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5" /> {ws.places_disponibles}/{ws.places_max}
                                </span>
                                {ws.tarif_affichage && (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Euro className="w-3.5 h-3.5" /> {ws.tarif_affichage}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Flèche */}
                            <ChevronRight className="w-4 h-4 self-center text-muted-foreground shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Workshop detail pop-in */}
      {popinWorkshop && !reserveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setPopinWorkshop(null)}
          />
          <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-md border overflow-hidden">
            {/* Header */}
            <div className="bg-primary/8 px-6 py-5 border-b flex items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.15em] uppercase text-primary font-medium mb-1">
                  {formatDateFr(popinWorkshop.date_atelier)} · {formatTimeFr(popinWorkshop.heure_debut)}
                </p>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {popinWorkshop.titre}
                </h3>
              </div>
              <button
                onClick={() => setPopinWorkshop(null)}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-muted-foreground text-sm leading-relaxed">
                {popinWorkshop.description}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  {popinWorkshop.adresse ? (
                    <a
                      href={googleMapsSearchUrl(popinWorkshop.adresse)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {popinWorkshop.lieu}
                    </a>
                  ) : (
                    <span>{popinWorkshop.lieu}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{formatTimeFr(popinWorkshop.heure_debut)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Users className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{popinWorkshop.places_disponibles} places restantes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Euro className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{popinWorkshop.tarif_affichage}</span>
                </div>
                {popinWorkshop.date_fin_inscription && (
                  <div className="flex items-center gap-2 text-sm text-foreground col-span-2">
                    <CalendarPlus className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>Inscriptions jusqu'au {formatDateFr(popinWorkshop.date_fin_inscription)}</span>
                  </div>
                )}
              </div>
              {popinWorkshop.date_fin_inscription && new Date(popinWorkshop.date_fin_inscription + "T23:59:59") < new Date() ? (
                <button disabled className="w-full bg-muted text-muted-foreground py-3 rounded-xl text-sm font-medium cursor-not-allowed">
                  Inscriptions closes
                </button>
              ) : (
                <button
                  onClick={() => openReserve(popinWorkshop)}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Réserver ma place
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reservation modal */}
      {reserveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setReserveOpen(false)} />
          <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-xl p-8 border">
            <button
              onClick={() => setReserveOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            {confirmedWorkshop ? (
              <div className="text-center space-y-5">
                <div className="flex justify-center">
                  <CheckCircle2 className="w-14 h-14 text-green-500" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground mb-1">Pré-inscription enregistrée !</h3>
                  <p className="text-sm text-muted-foreground">
                    Votre demande pour <span className="font-medium text-foreground">"{confirmedWorkshop.titre}"</span> le {formatDateFr(confirmedWorkshop.date_atelier)} à {formatTimeFr(confirmedWorkshop.heure_debut)} a été envoyée.
                    <br />
                    <span className="text-xs mt-2 block">Vous recevrez une confirmation par email ou WhatsApp après validation par l'équipe.</span>
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-sm font-medium text-foreground">Gardez la date dans votre calendrier</p>
                  <a
                    href={googleCalendarUrl(confirmedWorkshop)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    Google Calendar
                  </a>
                  <button
                    onClick={() => downloadIcsFile(confirmedWorkshop)}
                    className="w-full flex items-center justify-center gap-2 border border-foreground/20 text-foreground py-3 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Apple Calendar / Outlook (.ics)
                  </button>
                </div>

                <button
                  onClick={() => setReserveOpen(false)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-display text-2xl font-bold text-foreground mb-2">Pré-inscription</h3>
                <p className="text-muted-foreground text-sm mb-6">Votre demande sera validée par l'équipe et vous serez notifié(e) par email ou WhatsApp.</p>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nom complet</label>
                    <input {...register("name")} className="w-full border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Votre nom" />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                    <input {...register("email")} type="email" className="w-full border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="votre@email.com" />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Téléphone <span className="text-muted-foreground font-normal">(optionnel — pour WhatsApp)</span>
                    </label>
                    <input {...register("phone")} type="tel" className="w-full border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" placeholder="06 12 34 56 78" />
                    {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Atelier</label>
                    <select {...register("workshop")} className="w-full border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Choisir un atelier</option>
                      {ateliers.map((ws) => (
                        <option key={ws.id} value={ws.titre}>{ws.titre} — {formatDateFr(ws.date_atelier)}</option>
                      ))}
                    </select>
                    {errors.workshop && <p className="text-xs text-destructive mt-1">{errors.workshop.message}</p>}
                  </div>
                  {selectedWorkshop === PIERRE_ORACLE && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Date de naissance</label>
                      <input
                        {...register("birthdate")}
                        type="date"
                        className="w-full border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors.birthdate && <p className="text-xs text-destructive mt-1">{errors.birthdate.message}</p>}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {isSubmitting ? "Envoi en cours…" : "Envoyer ma pré-inscription"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendrier;
