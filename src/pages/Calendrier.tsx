import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin, Clock, Users, Euro, X } from "lucide-react";
import { workshops, FRENCH_MONTHS, parseWorkshopDate, Workshop } from "@/data/workshops";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FRENCH_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const PIERRE_ORACLE = "Atelier Créatif — Pierre & Oracle";

const inscriptionSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(100),
  email: z.string().trim().email("Veuillez entrer un email valide.").max(255),
  workshop: z.string().min(1, "Veuillez choisir un atelier."),
  birthdate: z.string().optional(),
}).refine((d) => d.workshop !== PIERRE_ORACLE || (!!d.birthdate && d.birthdate.trim().length > 0), {
  message: "La date de naissance est requise pour cet atelier.",
  path: ["birthdate"],
});
type InscriptionData = z.infer<typeof inscriptionSchema>;

// Build lookup: "year-month-day" -> workshop index
const workshopsByDate: Record<string, number> = {};
workshops.forEach((ws, i) => {
  const d = parseWorkshopDate(ws.date);
  workshopsByDate[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = i;
});

const Calendrier = () => {
  const [searchParams] = useSearchParams();
  const firstDate = parseWorkshopDate(workshops[0].date);
  const [viewYear, setViewYear] = useState(firstDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(firstDate.getMonth());
  const [popinWorkshop, setPopinWorkshop] = useState<Workshop | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);

  // Open pop-in from URL param (e.g. ?workshop=2 from a card click on home page)
  useEffect(() => {
    const param = searchParams.get("workshop");
    if (param !== null) {
      const idx = parseInt(param);
      if (!isNaN(idx) && idx >= 0 && idx < workshops.length) {
        const ws = workshops[idx];
        const d = parseWorkshopDate(ws.date);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setPopinWorkshop(ws);
      }
    }
  }, [searchParams]);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<InscriptionData>({
    resolver: zodResolver(inscriptionSchema),
    defaultValues: { name: "", email: "", workshop: "", birthdate: "" },
  });

  const selectedWorkshop = watch("workshop");

  const openReserve = (ws: Workshop) => {
    reset({ name: "", email: "", workshop: ws.title });
    setReserveOpen(true);
  };

  const onSubmit = async (data: InscriptionData) => {
    const { error } = await supabase.from("inscriptions").insert({
      name: data.name,
      email: data.email,
      workshop: data.workshop,
      ...(data.birthdate ? { birthdate: data.birthdate } : {}),
    });
    if (error) { toast.error("Une erreur est survenue. Veuillez réessayer."); return; }
    toast.success(`Merci ${data.name} ! Votre inscription à "${data.workshop}" a bien été prise en compte.`);
    setReserveOpen(false);
    reset();
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
  while (days.length % 7 !== 0) days.push(null);

  const selectedDate = popinWorkshop ? parseWorkshopDate(popinWorkshop.date) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto flex flex-col items-center py-6 px-6 relative">
          <a
            href="/#contact"
            className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:inline-flex border border-foreground/40 px-5 py-2 text-xs tracking-[0.2em] uppercase text-foreground hover:bg-foreground hover:text-background transition-colors"
          >
            Espace Membre
          </a>
          <Link to="/">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-[0.08em] uppercase leading-tight text-center hover:opacity-80 transition-opacity">
              Cocooning Club
            </h2>
          </Link>
          <span className="text-xs tracking-[0.35em] uppercase text-muted-foreground mt-1">Club</span>
          <div className="flex gap-8 mt-4 font-body text-sm tracking-[0.12em] uppercase text-foreground/80">
            <Link to="/#apropos" className="hover:text-primary transition-colors">À propos</Link>
            <Link to="/#ateliers" className="hover:text-primary transition-colors">Nos Ateliers</Link>
            <Link to="/calendrier" className="text-primary font-medium">Calendrier</Link>
            <Link to="/#contact" className="hover:text-primary transition-colors">Contact</Link>
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
              Cliquez sur une date pour voir le détail de l'atelier.
            </p>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={prevMonth}
              className="w-10 h-10 rounded-full border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl font-semibold text-foreground capitalize">
              {FRENCH_MONTHS[viewMonth]} {viewYear}
            </h2>
            <button
              onClick={nextMonth}
              className="w-10 h-10 rounded-full border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b pb-3 mb-2">
            {FRENCH_DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              if (!day) return <div key={i} className="h-16 md:h-20" />;

              const key = `${viewYear}-${viewMonth}-${day}`;
              const wsIndex = workshopsByDate[key];
              const ws = wsIndex !== undefined ? workshops[wsIndex] : null;
              const isSelected =
                selectedDate &&
                selectedDate.getFullYear() === viewYear &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getDate() === day;

              return (
                <button
                  key={i}
                  onClick={() => ws && setPopinWorkshop(ws)}
                  disabled={!ws}
                  className={`
                    h-16 md:h-20 flex flex-col items-center justify-center gap-1 rounded-xl transition-all
                    ${ws
                      ? isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-primary/8 cursor-pointer"
                      : "cursor-default"
                    }
                  `}
                >
                  <span className={`text-sm font-medium ${!ws && !isSelected ? "text-muted-foreground" : ""}`}>
                    {day}
                  </span>
                  {ws && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                  )}
                </button>
              );
            })}
          </div>
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
                  {popinWorkshop.date} · {popinWorkshop.time}
                </p>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {popinWorkshop.title}
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
                  <span>{popinWorkshop.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{popinWorkshop.time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Users className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{popinWorkshop.spots} places restantes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Euro className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{popinWorkshop.price}</span>
                </div>
              </div>
              <button
                onClick={() => openReserve(popinWorkshop)}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Réserver ma place
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reservation modal */}
      {reserveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setReserveOpen(false)} />
          <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-md p-8 border">
            <button
              onClick={() => setReserveOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-2xl font-bold text-foreground mb-2">Réserver ma place</h3>
            <p className="text-muted-foreground text-sm mb-6">Remplissez le formulaire pour confirmer votre inscription.</p>
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
                <label className="block text-sm font-medium text-foreground mb-1">Atelier</label>
                <select {...register("workshop")} className="w-full border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Choisir un atelier</option>
                  {workshops.map((ws) => (
                    <option key={ws.title} value={ws.title}>{ws.title} — {ws.date}</option>
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
                {isSubmitting ? "Envoi en cours…" : "Confirmer mon inscription"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendrier;
