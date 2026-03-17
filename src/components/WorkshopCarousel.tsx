import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Users, Euro } from "lucide-react";

interface Workshop {
  title: string;
  date: string;
  time: string;
  spots: number;
  description: string;
  location: string;
  price: string;
}

interface WorkshopCarouselProps {
  workshops: Workshop[];
  onReserve: (title: string) => void;
}

const ITEMS_PER_PAGE = 3;

const WorkshopCarousel = ({ workshops, onReserve }: WorkshopCarouselProps) => {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(workshops.length / ITEMS_PER_PAGE);
  const visible = workshops.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <div className="relative">
      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        {visible.map((ws) => (
          <div key={ws.title} className="bg-card rounded-2xl border overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            <div className="bg-primary/5 p-6 border-b">
              <h3 className="font-display text-xl font-semibold text-foreground">{ws.title}</h3>
            </div>
            <div className="p-6 space-y-3 flex-1 flex flex-col">
              <p className="text-muted-foreground text-sm leading-relaxed mb-2">{ws.description}</p>

              <div className="flex items-center gap-2 text-sm text-foreground">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{ws.date} · {ws.time}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{ws.location}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-foreground">
                <Users className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{ws.spots} places restantes</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-foreground">
                <Euro className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{ws.price}</span>
              </div>

              <div className="pt-2 mt-auto">
                <button
                  onClick={() => onReserve(ws.title)}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Réserver
                </button>
              </div>
            </div>
          </div>
        ))}
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
