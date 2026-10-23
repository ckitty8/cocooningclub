import { Camera } from "lucide-react";
import { detailPhotos, etatPhotos, LIBELLES_PHOTOS, type AutorisationImage, type EtatPhotos } from "@/lib/autorisationImage";

const STYLES: Record<EtatPhotos, string> = {
  accord: "bg-green-100 text-green-700",
  refus: "bg-red-100 text-red-600",
  expire: "bg-orange-100 text-orange-700",
  inconnu: "bg-gray-100 text-gray-500",
};

/** Pastille « photos : accord / refus… » d'une personne, d'après son dernier bulletin d'adhésion. */
const BadgePhotos = ({ autorisation }: { autorisation: AutorisationImage | null | undefined }) => {
  const etat = etatPhotos(autorisation);
  return (
    <span
      title={detailPhotos(autorisation)}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[etat]}`}
    >
      <Camera className="h-3 w-3 shrink-0" aria-hidden="true" />
      {LIBELLES_PHOTOS[etat]}
    </span>
  );
};

export default BadgePhotos;
