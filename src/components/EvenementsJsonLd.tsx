import { useEffect } from "react";
import { evenementsJsonLd } from "@/seo/evenements";
import type { Workshop } from "@/data/workshops";

/** Ajoute à la page les données structurées « Event » des ateliers affichés (rien d'écrit à l'écran). */
const EvenementsJsonLd = ({ ateliers }: { ateliers: Workshop[] }) => {
  useEffect(() => {
    const donnees = evenementsJsonLd(ateliers);
    if (!donnees) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.evenements = "true";
    script.text = JSON.stringify(donnees);
    document.head.appendChild(script);
    return () => script.remove();
  }, [ateliers]);
  return null;
};

export default EvenementsJsonLd;
