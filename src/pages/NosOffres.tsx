import { useEffect } from "react";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import ContenuNosOffres from "@/components/offres/ContenuNosOffres";
import { useOffresPubliques } from "@/hooks/useOffresPubliques";
import { trackVisit } from "@/utils/trackVisit";

/** Page publique « Nos offres » : les formules d'adhésion, comment adhérer et les questions « Bon à savoir ». */
const NosOffres = () => {
  const { offres, questions, chargement } = useOffresPubliques();

  useEffect(() => {
    trackVisit("/nos-offres");
  }, []);

  return (
    <div className="theme-vitrine min-h-screen bg-background text-foreground">
      <SiteHeader actif="Nos offres" />
      <main className="pt-20">
        <ContenuNosOffres offres={offres} questions={questions} chargement={chargement} />
      </main>
      <Footer />
    </div>
  );
};

export default NosOffres;
