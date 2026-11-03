import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, Monitor, Smartphone, X } from "lucide-react";
import ContenuNosOffres from "@/components/offres/ContenuNosOffres";
import type { OffrePublique, QuestionBonASavoir } from "@/lib/offres";

interface Props {
  offres: OffrePublique[];
  questions: QuestionBonASavoir[];
  /** Carte entourée (formule en cours de modification). */
  surligneeId?: string | null;
  onClose: () => void;
}

/**
 * Aperçu de la page publique « Nos offres » avec les modifications en cours, même non enregistrées.
 * « Mobile » affiche la page dans la largeur d'un téléphone (une colonne).
 */
const ApercuOffres = ({ offres, questions, surligneeId = null, onClose }: Props) => {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [onClose]);

  const bouton = (actif: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
      actif ? "border-white bg-white text-foreground" : "border-white/50 text-white hover:bg-white/10"
    }`;

  // Rendu hors de l'administration (portail) : la page garde ses polices publiques (Great Vibes), que l'administration remplace.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/60" role="dialog" aria-modal="true" aria-label="Aperçu de la page Nos offres">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#634033] px-4 py-3 text-white">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Eye className="h-4 w-4" aria-hidden="true" /> Aperçu de « Nos offres » · modifications non enregistrées
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setMobile(false)} aria-pressed={!mobile} className={bouton(!mobile)}>
            <Monitor className="h-3.5 w-3.5" aria-hidden="true" /> Ordinateur
          </button>
          <button type="button" onClick={() => setMobile(true)} aria-pressed={mobile} className={bouton(mobile)}>
            <Smartphone className="h-3.5 w-3.5" aria-hidden="true" /> Mobile
          </button>
          <button type="button" onClick={onClose} className={bouton(false)}>
            <X className="h-3.5 w-3.5" aria-hidden="true" /> Fermer l'aperçu
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className={`theme-vitrine mx-auto overflow-hidden bg-background text-foreground shadow-xl ${
            mobile ? "max-w-[390px] rounded-[2rem] border-8 border-[#1d1412]" : "max-w-6xl rounded-xl"
          }`}
        >
          {/* Les liens de l'aperçu ne mènent nulle part : on reste dans l'administration. */}
          <div className="pointer-events-none select-none">
            <ContenuNosOffres offres={offres} questions={questions} mobile={mobile} surligneeId={surligneeId} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ApercuOffres;
