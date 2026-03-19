import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const FRENCH_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const FRENCH_DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

const MONTH_MAP: Record<string, number> = {
  Janvier: 0, Février: 1, Mars: 2, Avril: 3, Mai: 4, Juin: 5,
  Juillet: 6, Août: 7, Septembre: 8, Octobre: 9, Novembre: 10, Décembre: 11,
};

interface Workshop {
  title: string;
  date: string;
}

interface WorkshopCalendarProps {
  workshops: Workshop[];
  selectedIndex: number | null;
  onSelectWorkshop: (index: number) => void;
}

function parseWorkshopDate(dateStr: string): Date {
  // e.g. "Samedi 22 Mars" -> Date(2026, 2, 22)
  const parts = dateStr.split(" ");
  const day = parseInt(parts[1]);
  const month = MONTH_MAP[parts[2]];
  return new Date(2026, month, day);
}

const WorkshopCalendar = ({ workshops, selectedIndex, onSelectWorkshop }: WorkshopCalendarProps) => {
  const firstDate = parseWorkshopDate(workshops[0].date);
  const [viewYear, setViewYear] = useState(firstDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(firstDate.getMonth());

  // When selectedIndex changes, navigate calendar to that month
  useEffect(() => {
    if (selectedIndex != null) {
      const d = parseWorkshopDate(workshops[selectedIndex].date);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [selectedIndex, workshops]);

  // Map "year-month-day" -> workshop index
  const workshopsByDate: Record<string, number> = {};
  workshops.forEach((ws, i) => {
    const d = parseWorkshopDate(ws.date);
    workshopsByDate[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = i;
  });

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1; // Monday = 0

  const days: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);
  while (days.length % 7 !== 0) days.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const selectedDate = selectedIndex != null ? parseWorkshopDate(workshops[selectedIndex].date) : null;

  return (
    <div className="bg-card rounded-2xl border p-6 w-full max-w-sm mx-auto">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-full border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-display text-base font-semibold text-foreground capitalize">
          {FRENCH_MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 rounded-full border flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {FRENCH_DAYS_SHORT.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          if (!day) return <div key={i} className="h-9" />;

          const key = `${viewYear}-${viewMonth}-${day}`;
          const wsIndex = workshopsByDate[key];
          const hasWorkshop = wsIndex !== undefined;
          const isSelected =
            selectedDate &&
            selectedDate.getFullYear() === viewYear &&
            selectedDate.getMonth() === viewMonth &&
            selectedDate.getDate() === day;

          return (
            <button
              key={i}
              onClick={() => hasWorkshop && onSelectWorkshop(wsIndex)}
              disabled={!hasWorkshop}
              className={`
                relative h-9 w-full rounded-lg text-sm transition-all
                ${isSelected
                  ? "bg-primary text-primary-foreground font-semibold"
                  : hasWorkshop
                  ? "text-foreground font-medium hover:bg-primary/10"
                  : "text-muted-foreground cursor-default"
                }
              `}
            >
              {day}
              {hasWorkshop && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected workshop name */}
      {selectedIndex != null && (
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">Atelier sélectionné</p>
          <p className="text-sm font-medium text-foreground mt-0.5">
            {workshops[selectedIndex].title}
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkshopCalendar;
