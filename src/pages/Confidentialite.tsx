import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

const Confidentialite = () => {
  return (
    <div className="theme-creme flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="container mx-auto max-w-3xl flex-1 px-6 pb-16 pt-32 md:pb-20 md:pt-36">
        <h1 className="mb-2 font-brand text-3xl text-foreground md:text-5xl">
          Politique de confidentialité
        </h1>
        <p className="text-sm text-muted-foreground mb-10">Dernière mise à jour : 9 septembre 2026</p>

        <div className="space-y-8 text-sm md:text-base text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-brand text-xl text-foreground">1. Responsable du traitement</h2>
            <p>
              Cocooning Club, association basée en Seine-et-Marne (Gagny · Chelles · Le Raincy), est responsable
              du traitement des données personnelles collectées sur ce site. Pour toute question, vous pouvez
              nous contacter à l'adresse{" "}
              <a href="mailto:le.cocooning.club@gmail.com" className="text-terracotta underline underline-offset-2">
                le.cocooning.club@gmail.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-brand text-xl text-foreground">2. Données que nous collectons</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="text-foreground font-medium">Formulaire d'inscription aux ateliers :</span> nom,
                email, téléphone, et, pour certains ateliers, date de naissance.
              </li>
              <li>
                <span className="text-foreground font-medium">Formulaire de contact :</span> les informations que
                vous nous transmettez volontairement.
              </li>
              <li>
                <span className="text-foreground font-medium">Espace membre :</span> identifiant de connexion et
                données de compte nécessaires à l'accès à votre espace personnel.
              </li>
              <li>
                <span className="text-foreground font-medium">Mesure d'audience :</span> un identifiant anonyme
                stocké dans votre navigateur, la page consultée, le référent et le type de navigateur, à des fins
                statistiques internes uniquement.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-brand text-xl text-foreground">3. Pourquoi nous utilisons ces données</h2>
            <p>
              Vos données sont utilisées pour gérer les inscriptions aux ateliers, répondre à vos demandes de
              contact, administrer votre espace membre et comprendre la fréquentation du site afin de
              l'améliorer. Nous ne vendons ni ne partageons vos données avec des tiers à des fins commerciales.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-brand text-xl text-foreground">4. Durée de conservation</h2>
            <p>
              Vos données sont conservées le temps nécessaire à la gestion de votre relation avec l'association
              (inscriptions, adhésion) et supprimées ou anonymisées au-delà, sauf obligation légale contraire.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-brand text-xl text-foreground">5. Vos droits</h2>
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et
              Libertés, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et
              d'opposition concernant vos données personnelles. Pour exercer ces droits, contactez-nous à{" "}
              <a href="mailto:le.cocooning.club@gmail.com" className="text-terracotta underline underline-offset-2">
                le.cocooning.club@gmail.com
              </a>
              . Vous pouvez également introduire une réclamation auprès de la CNIL (www.cnil.fr).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-brand text-xl text-foreground">6. Hébergement et sécurité</h2>
            <p>
              Les données sont hébergées et sécurisées via Supabase. L'accès à l'espace d'administration est
              restreint aux membres autorisés de l'association.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Confidentialite;
