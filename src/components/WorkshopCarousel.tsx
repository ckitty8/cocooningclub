import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Users, Euro } from "lucide-react";
import type { Workshop } from "@/data/workshops";
import { formatDateFr, formatTimeFr } from "@/data/workshops";

interface WorkshopCarouselProps {
  workshops: Workshop[];
  onReserve: (title: string) => void;
  selectedIndex?: number | null;
}

const ITEMS_PER_PAGE = 3;

const WorkshopCarousel = ({ workshops, onReserve, selectedIndex }: WorkshopCarouselProps) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(workshops.length / ITEMS_PER_PAGE);
  const visible = workshops.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  // Navigate to the page containing the selected workshop
  useEffect(() => {
    if (selectedIndex != null) {
      setPage(Math.floor(selectedIndex / ITEMS_PER_PAGE));
    }
  }, [selectedIndex]);

  return (
    <div className="relative">
      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {visible.map((ws, visibleIdx) => {
          const actualIndex = page * ITEMS_PER_PAGE + visibleIdx;
          const isSelected = selectedIndex === actualIndex;

          return (
            <div
              key={actualIndex}
              onClick={() => navigate(`/calendrier?workshop=${actualIndex}`)}
              className="bg-card rounded-2xl border overflow-hidden flex flex-col cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/30"
            >
              <div className="p-6 border-b bg-primary/5">
                <h3 className="font-display text-xl font-semibold text-foreground">{ws.titre}</h3>
              </div>
              <div className="p-6 space-y-3 flex-1 flex flex-col">
                <p className="text-muted-foreground text-sm leading-relaxed mb-2">{ws.description}</p>

                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{formatDateFr(ws.date_atelier)} · {formatTimeFr(ws.heure_debut)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{ws.lieu}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Users className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{ws.places_disponibles} places restantes</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Euro className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{ws.tarif_affichage}</span>
                </div>

                <div className="pt-2 mt-auto">
                  <button
                    onClick={(e) => { e.stopPropagation(); onReserve(ws.titre); }}

                    className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Réserver
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-10">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="w-10 h-10 rounded-full border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === page ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page === totalPages - 1}
          className="w-10 h-10 rounded-full border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default WorkshopCarousel;
