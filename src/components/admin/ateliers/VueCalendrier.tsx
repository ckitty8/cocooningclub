import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  JOURS_COURTS, MOIS_FR, casesDuMois, couleurEspace, moisSuivant,
} from "@/lib/calendrierAteliers";
import { aujourdhuiIso } from "@/lib/adhesions";

export interface AtelierCalendrier {
  id: string;
  titre: string;
  date_atelier: string;
  heure_debut: string | null;
  lieu: string | null;
  statut: string;
  places_max: number;
  places_disponibles: number;
  antenne_id: string;
}

interface Props {
  ateliers: AtelierCalendrier[];
  /** Couleur de l'espace d'un atelier. */
  slugDe: (atelierAntenneId: string) => string | undefined;
  onCreer: (dateIso: string) => void;
}

const heure = (h: string | null) => (h ? h.slice(0, 5) : "");

/** Calendrier mensuel des ateliers : un atelier = une pastille de la couleur de son espace (hachurée si brouillon). */
const VueCalendrier = ({ ateliers, slugDe, onCreer }: Props) => {
  const auj = aujourdhuiIso();
  const [annee, setAnnee] = useState(Number(auj.slice(0, 4)));
  const [mois, setMois] = useState(Number(auj.slice(5, 7)) - 1);
  const [choisi, setChoisi] = useState<string | null>(null);

  const aller = (pas: 1 | -1) => {
    const n = moisSuivant(annee, mois, pas);
    setAnnee(n.annee);
    setMois(n.mois);
  };
  const duJour = (iso: string) => ateliers.filter(a => a.date_atelier === iso);
  const selection = choisi ? duJour(choisi) : [];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px] items-start">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => aller(-1)} aria-label="Mois précédent" className="h-9 w-9 rounded-full border flex items-center justify-center hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
          <h2 className="font-display text-xl min-w-[170px] text-center">{MOIS_FR[mois]} {annee}</h2>
          <button onClick={() => aller(1)} aria-label="Mois suivant" className="h-9 w-9 rounded-full border flex items-center justify-center hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => { setAnnee(Number(auj.slice(0, 4))); setMois(Number(auj.slice(5, 7)) - 1); }}
            className="text-xs px-3 py-1.5 border rounded-full hover:bg-muted">Aujourd'hui</button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {JOURS_COURTS.map(j => <div key={j} className="text-center text-xs uppercase tracking-widest text-muted-foreground">{j}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {casesDuMois(annee, mois).map((iso, i) => {
            if (!iso) return <div key={i} className="min-h-[76px] sm:min-h-[104px]" />;
            const ateliersDuJour = duJour(iso);
            return (
              <div key={iso} role="gridcell" onClick={() => setChoisi(iso)}
                className={`min-h-[76px] sm:min-h-[104px] cursor-pointer rounded-xl border bg-card p-1.5 text-xs transition-colors hover:bg-muted/40 ${iso === auj ? "border-primary ring-1 ring-primary" : ""} ${iso === choisi ? "bg-primary/5" : ""}`}>
                <span className="font-semibold">{Number(iso.slice(8))}</span>
                {ateliersDuJour.map(a => (
                  <Link key={a.id} to={`/admin/ateliers/${a.id}`} onClick={e => e.stopPropagation()}
                    title={`${a.titre}${a.statut === "brouillon" ? " (brouillon)" : ""}`}
                    className={`mt-1 block truncate rounded-md px-1.5 py-0.5 text-[11px] text-white ${a.statut === "brouillon" ? "bg-[repeating-linear-gradient(45deg,#b9aea8,#b9aea8_6px,#cfc6c1_6px,#cfc6c1_12px)] !text-foreground" : ""}`}
                    style={a.statut === "brouillon" ? undefined : { backgroundColor: couleurEspace(slugDe(a.antenne_id)) }}>
                    {heure(a.heure_debut)} {a.titre}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <aside className="bg-card border rounded-2xl p-4">
        {choisi ? (
          <>
            <h3 className="font-display text-lg capitalize">
              {new Date(choisi + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{selection.length === 0 ? "Aucun atelier ce jour-là" : `${selection.length} atelier${selection.length > 1 ? "s" : ""}`}</p>
            <ul className="space-y-2">
              {selection.map(a => (
                <li key={a.id} className="rounded-xl border p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium"><span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: couleurEspace(slugDe(a.antenne_id)) }} />{a.titre}</p>
                  <p className="text-xs text-muted-foreground mt-1">{heure(a.heure_debut)}{a.lieu ? ` · ${a.lieu}` : ""} · {a.places_max - a.places_disponibles}/{a.places_max} places prises</p>
                  <div className="mt-2 flex gap-2">
                    <Link to={`/admin/ateliers/${a.id}`} className="px-3 py-1 text-xs border rounded-full hover:bg-muted">Fiche</Link>
                    <Link to={`/admin/pre-inscriptions?atelier=${a.id}`} className="px-3 py-1 text-xs border rounded-full hover:bg-muted">Pré-inscriptions</Link>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={() => onCreer(choisi)} className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <Plus className="w-4 h-4" /> Créer un atelier ce jour-là
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Cliquez sur un jour pour voir ses ateliers ou en créer un.</p>
        )}
        <div className="mt-5 border-t pt-3 text-xs text-muted-foreground space-y-1">
          {[["papotages", "Papotages"], ["creatifs", "Créatifs"], ["business", "Business"]].map(([slug, nom]) => (
            <p key={slug} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: couleurEspace(slug) }} />{nom}</p>
          ))}
          <p className="flex items-center gap-2"><span className="h-2.5 w-5 rounded-sm bg-[repeating-linear-gradient(45deg,#b9aea8,#b9aea8_4px,#cfc6c1_4px,#cfc6c1_8px)]" />Brouillon</p>
        </div>
      </aside>
    </div>
  );
};

export default VueCalendrier;
