import { useEffect, useRef, useState } from "react";
import { CalendarPlus, Download } from "lucide-react";
import type { Workshop } from "@/data/workshops";
import { downloadIcsFile, googleCalendarUrl } from "@/utils/calendarLinks";

interface AjouterAgendaProps {
  atelier: Workshop;
  /** "boutons" : deux boutons côte à côte ; "menu" : un bouton qui ouvre le choix. */
  variante?: "boutons" | "menu";
}

const option =
  "flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-foreground/20 px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-terracotta";

// Ajout d'un atelier à l'agenda : Google Agenda, ou fichier .ics pour
// Apple Calendar et Outlook. Les clics ne remontent pas à la carte parente
// (qui ouvre sinon la fiche de l'atelier).
const AjouterAgenda = ({ atelier, variante = "boutons" }: AjouterAgendaProps) => {
  const [ouvert, setOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);

  // Ferme le menu au clic à l'extérieur ou à la touche Échap.
  useEffect(() => {
    if (!ouvert) return;
    const auClic = (e: MouseEvent) => {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(false);
    };
    const auClavier = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("mousedown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert]);

  const choix = (
    <>
      <a
        href={googleCalendarUrl(atelier)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => { e.stopPropagation(); setOuvert(false); }}
        className={option}
      >
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        Google Agenda
      </a>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); downloadIcsFile(atelier); setOuvert(false); }}
        className={option}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Apple / Outlook (.ics)
      </button>
    </>
  );

  if (variante === "boutons") {
    return <div className="grid gap-2 sm:grid-cols-2">{choix}</div>;
  }

  return (
    <div ref={conteneur} className="relative" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOuvert(o => !o)}
        aria-expanded={ouvert}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-medium text-terracotta transition-colors hover:text-foreground"
      >
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        Ajouter à mon agenda
      </button>
      {ouvert && (
        <div className="absolute inset-x-0 bottom-full z-10 mb-2 space-y-2 rounded-2xl border bg-background p-3 shadow-lg">
          {choix}
        </div>
      )}
    </div>
  );
};

export default AjouterAgenda;
