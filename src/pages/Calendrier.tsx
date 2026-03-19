import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin, Clock, Users, Euro, X } from "lucide-react";
import { workshops, FRENCH_MONTHS, parseWorkshopDate, Workshop } from "@/data/workshops";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FRENCH_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const inscriptionSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères.").max(100),
  email: z.string().trim().email("Veuillez entrer un email valide.").max(255),
  workshop: z.string().min(1, "Veuillez choisir un atelier."),
});
type InscriptionData = z.infer<typeof inscriptionSchema>;

// Build lookup: "year-month-day" -> workshop index
const workshopsByDate: Record<string, number> = {};
workshops.forEach((ws, i) => {
  const d = parseWorkshopDate(ws.date);
  workshopsByDate[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = i;
});

const Calendrier = () => {
  const firstDate = parseWorkshopDate(workshops[0].date);
  const [viewYear, setViewYear] = useState(firstDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(firstDate.getMonth());
  const [selected, setSelected] = useState<Workshop | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InscriptionData>({
    resolver: zodResolver(inscriptionSchema),
    defaultValues: { name: "", email: "", workshop: "" },
  });

  const openModal = (ws: Workshop) => {
    reset({ name: "", email: "", workshop: ws.title });
    setModalOpen(true);
  };

  const onSubmit = async (data: InscriptionData) => {
    const { error } = await supabase.from("inscriptions").insert({
      name: data.name, email: data.email, workshop: data.workshop,
    });
    if (error) { toast.error("Une erreur est survenue. Veuillez réessayer."); return; }
    toast.success(`Merci ${data.name} ! Votre inscription à "${data.workshop}" a bien été prise en compte.`);
    setModalOpen(false);
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

  // Workshops this month (for sidebar list)
  const monthWorkshops = workshops.filter((ws) => {
    const d = parseWorkshopDate(ws.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

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
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
              Calendrier des ateliers
            </h1>
            <p className="text-muted-foreground">
              Retrouvez tous nos ateliers créatifs et réservez votre place.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-10 items-start">
            {/* Calendar */}
            <div className="flex-1 min-w-0">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-6">
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
              <div className="grid grid-cols-7 mb-2 border-b pb-2">
                {FRENCH_DAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold tracking-[0.1em] uppercase text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  if (!day) return <div key={i} className="h-20 md:h-24" />;
                  const key = `${viewYear}-${viewMonth}-${day}`;
                  const wsIndex = workshopsByDate[key];
                  const ws = wsIndex !== undefined ? workshops[wsIndex] : null;
                  const isSelected = selected?.title === ws?.title && ws !== null;

                  return (
                    <button
                      key={i}
                      onClick={() => ws && setSelected(isSelected ? null : ws)}
                      disabled={!ws}
                      className={`
                        h-20 md:h-24 rounded-xl p-2 text-left flex flex-col transition-all border
                        ${ws
                          ? isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer"
                          : "border-transparent cursor-default"
                        }
                      `}
                    >
                      <span className={`text-sm font-semibold ${!ws ? "text-muted-foreground" : ""}`}>
                        {day}
                      </span>
                      {ws && (
                        <span className={`text-xs mt-1 leading-tight line-clamp-2 ${isSelected ? "text-primary-foreground/90" : "text-primary"}`}>
                          {ws.title}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-40">
              {selected ? (
                /* Selected workshop detail */
                <div className="bg-card rounded-2xl border overflow-hidden">
                  <div className="bg-primary/10 p-6 border-b flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl font-semibold text-foreground">{selected.title}</h3>
                    <button
                      onClick={() => setSelected(null)}
                      className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-muted-foreground text-sm leading-relaxed">{selected.description}</p>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{selected.date} · {selected.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{selected.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Users className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{selected.spots} places restantes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Euro className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{selected.price}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => openModal(selected)}
                      className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity mt-2"
                    >
                      Réserver ma place
                    </button>
                  </div>
                </div>
              ) : (
                /* Month workshop list */
                <div className="bg-card rounded-2xl border p-6">
                  <h3 className="font-display text-base font-semibold text-foreground mb-4">
                    {monthWorkshops.length > 0
                      ? `${monthWorkshops.length} atelier${monthWorkshops.length > 1 ? "s" : ""} ce mois`
                      : "Aucun atelier ce mois"}
                  </h3>
                  {monthWorkshops.length > 0 ? (
                    <ul className="space-y-3">
                      {monthWorkshops.map((ws) => (
                        <li key={ws.title}>
                          <button
                            onClick={() => setSelected(ws)}
                            className="w-full text-left p-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors"
                          >
                            <p className="text-sm font-medium text-foreground">{ws.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{ws.date} · {ws.time}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Naviguez vers un autre mois pour voir les prochains ateliers.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Reservation modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-md p-8 border">
            <button
              onClick={() => setModalOpen(false)}
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
