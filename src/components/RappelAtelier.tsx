import { Calendar, Clock, MapPin } from "lucide-react";
import { formatDateFr, formatTimeFr, type Workshop } from "@/data/workshops";
import { heureDeFin } from "@/lib/dureeAtelier";
import { adresseLisible, googleMapsSearchUrl } from "@/utils/googleMaps";

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
            <>
              {atelier.adresse ? (
                // Le nom du lieu est le lien vers la carte (adresse en clair, ou lien Google Maps saisi dans le champ adresse).
                <a href={googleMapsSearchUrl(atelier.adresse)} target="_blank" rel="noopener noreferrer"
                  className="inline-block py-0.5 font-medium text-terracotta underline underline-offset-2 hover:no-underline">
                  {atelier.lieu}
                </a>
              ) : (
                <span className="font-medium">{atelier.lieu}</span>
              )}
              {adresseLisible(atelier.adresse) && <span className="block break-words text-muted-foreground">{adresseLisible(atelier.adresse)}</span>}
            </>
          ) : (
            <span className="text-muted-foreground">Lieu communiqué par l'équipe</span>
          )}
        </span>
      </li>
    </ul>
  );
};

export default RappelAtelier;
