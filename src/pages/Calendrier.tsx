import { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X, MapPin, Users, Euro, Calendar as CalendarIcon, Clock, List, LayoutGrid } from "lucide-react";
import Footer from "@/components/Footer";

const locales = { fr };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const TYPE_COLORS: Record<string, string> = {
  bougie: "#e8a87c",
  peinture: "#7eb5a6",
  textile: "#c6a0d4",
  poterie: "#d4a76a",
  nature: "#8bc48a",
  art: "#e6c86e",
  "bien-etre": "#e89ba0",
  general: "#b0b0b0",
};

interface Atelier {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  type: string;
  price: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Atelier;
}

const Calendrier = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  const [reservationCounts, setReservationCounts] = useState<Record<string, number>>({});
  const [userReservations, setUserReservations] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Atelier | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reserving, setReserving] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: ateliersData } = await supabase
      .from("ateliers")
      .select("*")
      .order("date", { ascending: true });

    if (ateliersData) {
      setAteliers(ateliersData as Atelier[]);
      setActiveTypes(new Set(ateliersData.map((a: Atelier) => a.type)));
    }

    // Fetch reservation counts for all ateliers
    const { data: reservData } = await supabase
      .from("reservations")
      .select("atelier_id")
      .in("status", ["confirmee", "presente"]);

    if (reservData) {
      const counts: Record<string, number> = {};
      reservData.forEach((r: { atelier_id: string }) => {
        counts[r.atelier_id] = (counts[r.atelier_id] || 0) + 1;
      });
      setReservationCounts(counts);
    }

    // Fetch user's reservations if logged in
    if (user) {
      const { data: myReservations } = await supabase
        .from("reservations")
        .select("atelier_id")
        .eq("member_id", user.id)
        .neq("status", "annulee");

      if (myReservations) {
        setUserReservations(new Set(myReservations.map((r: { atelier_id: string }) => r.atelier_id)));
      }
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAteliers = useMemo(
    () => ateliers.filter((a) => activeTypes.has(a.type)),
    [ateliers, activeTypes]
  );

  const events: CalendarEvent[] = useMemo(
    () =>
      filteredAteliers.map((a) => {
        const startDate = new Date(a.date + "T10:00:00");
        const endDate = new Date(a.date + "T17:00:00");
        return { id: a.id, title: a.title, start: startDate, end: endDate, resource: a };
      }),
    [filteredAteliers]
  );

  const allTypes = useMemo(() => [...new Set(ateliers.map((a) => a.type))], [ateliers]);

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: TYPE_COLORS[event.resource.type] || TYPE_COLORS.general,
        borderRadius: "8px",
        border: "none",
        color: "#333",
        fontSize: "0.8rem",
        padding: "2px 6px",
      },
    };
  }, []);

  const getPlacesRestantes = (atelier: Atelier) => {
    const reserved = reservationCounts[atelier.id] || 0;
    return atelier.capacity - reserved;
  };

  const handleReserver = async () => {
    if (!selected) return;

    if (!user) {
      navigate("/connexion");
      return;
    }

    if (userReservations.has(selected.id)) {
      toast.info("Vous êtes déjà inscrit(e) à cet atelier.");
      return;
    }

    const placesRestantes = getPlacesRestantes(selected);
    if (placesRestantes <= 0) {
      toast.error("Cet atelier est complet.");
      return;
    }

    setReserving(true);
    const { error } = await supabase.from("reservations").insert({
      member_id: user.id,
      atelier_id: selected.id,
      status: "confirmee",
    });

    if (error) {
      if (error.code === "23505") {
        toast.info("Vous êtes déjà inscrit(e) à cet atelier.");
      } else {
        toast.error("Erreur lors de la réservation.");
      }
      setReserving(false);
      return;
    }

    toast.success("Réservation confirmée !");
    setReserving(false);
    setSelected(null);
    fetchData();
  };

  const messages = {
    today: "Aujourd'hui",
    previous: "Précédent",
    next: "Suivant",
    month: "Mois",
    week: "Semaine",
    day: "Jour",
    agenda: "Agenda",
    noEventsInRange: "Aucun atelier sur cette période.",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto flex flex-col items-center py-6 px-6 relative">
          <Link to="/connexion" className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:inline-flex border border-foreground/40 px-5 py-2 text-xs tracking-[0.2em] uppercase text-foreground hover:bg-foreground hover:text-background transition-colors">
            Espace Membre
          </Link>
          <Link to="/" className="font-display text-3xl md:text-5xl font-bold text-foreground tracking-[0.08em] uppercase leading-tight text-center">
            Cocooning Club
          </Link>
          <div className="flex gap-8 mt-4 font-body text-sm tracking-[0.12em] uppercase text-foreground/80">
            <Link to="/" className="hover:text-primary transition-colors">Accueil</Link>
            <Link to="/calendrier" className="text-primary font-semibold">Calendrier</Link>
            <Link to="/connexion" className="hover:text-primary transition-colors">Connexion</Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-center text-foreground mb-4">
          Calendrier des ateliers
        </h1>
        <p className="text-center text-muted-foreground max-w-lg mx-auto mb-8">
          Retrouvez tous nos ateliers créatifs et réservez votre place.
        </p>

        {/* Filters and view toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {allTypes.map((type) => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className="px-4 py-2 rounded-full text-xs font-medium border transition-all capitalize"
                style={{
                  backgroundColor: activeTypes.has(type) ? TYPE_COLORS[type] || "#b0b0b0" : "transparent",
                  borderColor: TYPE_COLORS[type] || "#b0b0b0",
                  color: activeTypes.has(type) ? "#333" : "#666",
                  opacity: activeTypes.has(type) ? 1 : 0.5,
                }}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-2 rounded-lg border transition-colors ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "text-foreground/60 hover:bg-muted"}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg border transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-foreground/60 hover:bg-muted"}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar view */}
        {viewMode === "calendar" && (
          <div className="bg-card rounded-2xl border p-4 md:p-6" style={{ minHeight: 600 }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              culture="fr"
              messages={messages}
              views={["month"]}
              defaultView="month"
              date={currentDate}
              onNavigate={setCurrentDate}
              onSelectEvent={(event: CalendarEvent) => setSelected(event.resource)}
              eventPropGetter={eventStyleGetter}
              popup
            />
          </div>
        )}

        {/* List view */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {filteredAteliers.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Aucun atelier trouvé.</p>
            )}
            {filteredAteliers.map((atelier) => {
              const places = getPlacesRestantes(atelier);
              const isComplet = places <= 0;
              return (
                <div
                  key={atelier.id}
                  onClick={() => setSelected(atelier)}
                  className="bg-card rounded-2xl border p-6 hover:shadow-lg transition-shadow cursor-pointer flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[atelier.type] || TYPE_COLORS.general }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-lg font-semibold text-foreground">{atelier.title}</h3>
                      {isComplet && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">Complet</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{atelier.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-foreground/70">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {format(new Date(atelier.date), "EEEE d MMMM yyyy", { locale: fr })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {atelier.time}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {atelier.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {isComplet ? (
                        <span className="text-destructive font-medium">Complet</span>
                      ) : (
                        <span>{places} place{places > 1 ? "s" : ""} restante{places > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal détail atelier */}
      {selected && (() => {
        const places = getPlacesRestantes(selected);
        const isComplet = places <= 0;
        const alreadyBooked = userReservations.has(selected.id);
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={() => setSelected(null)}>
            <div
              className="bg-background rounded-3xl border shadow-2xl w-full max-w-md mx-4 p-8 relative animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[selected.type] || TYPE_COLORS.general }}
                />
                <span className="text-xs capitalize text-muted-foreground">{selected.type}</span>
                {isComplet && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full ml-auto">Complet</span>
                )}
              </div>

              <h3 className="font-display text-2xl font-bold text-foreground mb-2">{selected.title}</h3>
              <p className="text-sm text-muted-foreground mb-6">{selected.description}</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <CalendarIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{format(new Date(selected.date), "EEEE d MMMM yyyy", { locale: fr })} · {selected.time}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{selected.location}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <Users className="w-4 h-4 text-primary flex-shrink-0" />
                  {isComplet ? (
                    <span className="text-destructive font-medium">Atelier complet</span>
                  ) : (
                    <span>
                      <strong>{places}</strong> place{places > 1 ? "s" : ""} restante{places > 1 ? "s" : ""}
                      <span className="text-muted-foreground ml-1">/ {selected.capacity}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <Euro className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{selected.price}</span>
                </div>
              </div>

              {alreadyBooked ? (
                <div className="w-full bg-secondary/20 text-secondary-foreground py-3 rounded-xl text-sm font-medium text-center">
                  ✓ Vous êtes inscrit(e) à cet atelier
                </div>
              ) : isComplet ? (
                <div className="w-full bg-muted text-muted-foreground py-3 rounded-xl text-sm font-medium text-center">
                  Atelier complet
                </div>
              ) : (
                <button
                  onClick={handleReserver}
                  disabled={reserving}
                  className="block w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity text-center disabled:opacity-50"
                >
                  {reserving ? "Réservation en cours..." : user ? "Réserver ma place" : "Se connecter pour réserver"}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      <Footer />
    </div>
  );
};

export default Calendrier;
