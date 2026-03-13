import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface Workshop {
  title: string;
  date: string;
  time: string;
  spots: number;
  description: string;
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
          <div key={ws.title} className="bg-card rounded-2xl border overflow-hidden hover:shadow-lg transition-shadow">
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
                  onClick={() => onReserve(ws.title)}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
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
