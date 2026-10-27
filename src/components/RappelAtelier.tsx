import { Calendar, Clock, MapPin } from "lucide-react";
import { formatDateFr, formatTimeFr, type Workshop } from "@/data/workshops";
import { heureDeFin } from "@/lib/dureeAtelier";
import { googleMapsSearchUrl } from "@/utils/googleMaps";

/** Rappel de la date, de l'heure et du lieu de l'atelier, affiché dans la fiche de pré-inscription. */
const RappelAtelier = ({ atelier }: { atelier: Workshop }) => {
  const annee = new Date(atelier.date_atelier + "T00:00:00").getFullYear();
  const fin = heureDeFin(atelier.heure_debut, atelier.duree);

  return (
    <ul aria-label="Rappel de l'atelier" className="mt-2 space-y-2 rounded-xl border bg-muted/30 p-4 text-sm text-foreground">
      <li className="flex items-start gap-2">
        <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" aria-hidden="true" />
        <span><span className="sr-only">Date : </span>{formatDateFr(atelier.date_atelier)} {annee}</span>
      </li>
      <li className="flex items-start gap-2">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" aria-hidden="true" />
        <span>
          <span className="sr-only">Heure : </span>
          {formatTimeFr(atelier.heure_debut)}{fin && <> – {formatTimeFr(fin)}</>}
        </span>
      </li>
      <li className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" aria-hidden="true" />
        <span>
          <span className="sr-only">Lieu : </span>
          {atelier.lieu ? (
            atelier.adresse ? (
              <>
                <span className="font-medium">{atelier.lieu}</span>
                <br />
                <a href={googleMapsSearchUrl(atelier.adresse)} target="_blank" rel="noopener noreferrer" className="inline-block py-0.5 text-terracotta underline-offset-2 hover:underline">
                  {atelier.adresse}
                </a>
              </>
            ) : (
              <span className="font-medium">{atelier.lieu}</span>
            )
          ) : (
            <span className="text-muted-foreground">Lieu communiqué par l'équipe</span>
          )}
        </span>
      </li>
    </ul>
  );
};

export default RappelAtelier;
