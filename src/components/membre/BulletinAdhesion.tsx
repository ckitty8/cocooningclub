import { MODES_REGLEMENT, formaterNumero, type ModeReglement } from "@/lib/adhesions";
import { SUPPORTS_IMAGE, type SupportImage } from "@/lib/autorisationImage";
import { autorisationDepuisChamps } from "@/lib/bulletin";
import { dateFr } from "@/lib/dates";

export interface DonneesBulletin {
  personne: {
    nom: string | null;
    prenom: string | null;
    telephone: string | null;
    email: string | null;
    commune: string | null;
    activite: string | null;
  };
  adhesion: {
    numero: number;
    utilisateur_id: string;
    mode_reglement: string;
    montant: number;
    cotisation_recue_le: string | null;
    date_validation: string | null;
    valable_jusqu_au: string | null;
    engagement_accepte_le: string | null;
    whatsapp: boolean;
    autorisation_image: boolean;
    image_supports: string[];
    image_signee_le: string | null;
  };
  formule: { nom: string; description: string | null; prix: number; duree_mois: number } | null;
}

const case_ = (cochee: boolean) => (cochee ? "☑" : "☐");
const Ligne = ({ libelle, valeur }: { libelle: string; valeur: string | null }) => (
  <p><span className="text-muted-foreground">{libelle} : </span><span className="font-medium">{valeur || "—"}</span></p>
);

/** Le bulletin d'adhésion de la personne, rempli, tel qu'il se présente sur papier (aperçu et impression). */
const BulletinAdhesion = ({ personne, adhesion, formule }: DonneesBulletin) => {
  const photo = autorisationDepuisChamps(adhesion, adhesion.utilisateur_id);
  const mode = adhesion.mode_reglement as ModeReglement;

  return (
    <div className="bulletin-imprimable space-y-6">
      <article className="rounded-2xl border bg-white p-6 sm:p-8 text-sm shadow-sm">
        <header className="flex items-start justify-between gap-4 border-b pb-4 mb-5">
          <div>
            <p className="font-display text-2xl text-terracotta">Le Cocooning Club</p>
            <p className="text-xs italic text-muted-foreground">Une bulle de douceur pour créer, partager et avancer</p>
          </div>
          <div className="text-right">
            <h2 className="font-display text-xl">Bulletin d'adhésion</h2>
            <p className="text-xs text-muted-foreground">N° d'adhérente {formaterNumero(adhesion.numero)}</p>
          </div>
        </header>

        <section className="mb-5">
          <h3 className="font-semibold mb-2"><span className="text-terracotta">01</span> · Mes coordonnées</h3>
          <div className="grid gap-1 sm:grid-cols-2">
            <Ligne libelle="Nom" valeur={personne.nom} />
            <Ligne libelle="Prénom" valeur={personne.prenom} />
            <Ligne libelle="Téléphone" valeur={personne.telephone} />
            <Ligne libelle="Adresse e-mail" valeur={personne.email} />
            <Ligne libelle="Commune" valeur={personne.commune} />
            <Ligne libelle="Activité" valeur={personne.activite} />
          </div>
        </section>

        <section className="mb-5">
          <h3 className="font-semibold mb-2"><span className="text-terracotta">02</span> · Ma formule</h3>
          {formule ? (
            <p>
              <span className="font-medium">☑ {formule.nom}</span> — {Number(formule.prix)} € / {formule.duree_mois} mois
              {formule.description && <span className="block text-muted-foreground">{formule.description}</span>}
            </p>
          ) : <p className="text-muted-foreground">Formule non renseignée.</p>}
          <p className="mt-1 text-xs italic text-muted-foreground">
            Les rencontres incluses dans la formule sont accessibles pendant {formule?.duree_mois ?? 12} mois, selon la programmation et les places disponibles.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="font-semibold mb-2"><span className="text-terracotta">03</span> · Cotisation et durée</h3>
          <p><span className="text-muted-foreground">Cotisation versée : </span><span className="font-medium">{Number(adhesion.montant)} €</span></p>
          <p>
            <span className="text-muted-foreground">Mode de règlement : </span>
            {(Object.keys(MODES_REGLEMENT) as ModeReglement[]).map(m => (
              <span key={m} className={`mr-3 ${m === mode ? "font-medium" : "text-muted-foreground"}`}>{case_(m === mode)} {MODES_REGLEMENT[m]}</span>
            ))}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            L'adhésion est valable {formule?.duree_mois ?? 12} mois à compter de la date d'inscription validée par l'association. Le renouvellement n'est pas automatique.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="font-semibold mb-2"><span className="text-terracotta">04</span> · Mon engagement</h3>
          <p>{case_(adhesion.engagement_accepte_le !== null)} Je demande mon adhésion au Cocooning Club et reconnais avoir pu consulter les statuts et le règlement intérieur de l'association, que je m'engage à respecter.</p>
          <p>{case_(adhesion.whatsapp)} Je souhaite rejoindre le groupe WhatsApp du club (facultatif). Mon numéro de téléphone sera visible par les autres membres du groupe.</p>
          <p className="mt-2 text-muted-foreground">Signé le {dateFr(adhesion.engagement_accepte_le ?? adhesion.image_signee_le)}</p>
        </section>

        <section className="rounded-xl bg-[#fde4d4] p-4">
          <h3 className="font-semibold text-terracotta mb-2">Cadre réservé à l'association</h3>
          <div className="grid gap-1 sm:grid-cols-2">
            <Ligne libelle="N° d'adhérente" valeur={formaterNumero(adhesion.numero)} />
            <Ligne libelle="Date de validation" valeur={dateFr(adhesion.date_validation)} />
            <Ligne libelle="Adhésion valable jusqu'au" valeur={dateFr(adhesion.valable_jusqu_au)} />
            <Ligne libelle="Cotisation reçue le" valeur={dateFr(adhesion.cotisation_recue_le)} />
          </div>
        </section>
      </article>

      <article className="rounded-2xl border bg-white p-6 sm:p-8 text-sm shadow-sm break-before-page">
        <header className="mb-5 border-b pb-4">
          <h2 className="font-display text-xl text-terracotta">Autorisation photo &amp; vidéo</h2>
          <p className="text-xs italic text-muted-foreground">Parce que les jolis moments méritent parfois d'être partagés…</p>
        </header>
        <section className="mb-4">
          <h3 className="font-semibold mb-2"><span className="text-terracotta">01</span> · Coordonnées</h3>
          <div className="grid gap-1 sm:grid-cols-3">
            <Ligne libelle="Nom" valeur={personne.nom} />
            <Ligne libelle="Prénom" valeur={personne.prenom} />
            <Ligne libelle="N° d'adhérente" valeur={formaterNumero(adhesion.numero)} />
          </div>
        </section>
        <section className="mb-4">
          <h3 className="font-semibold mb-2"><span className="text-terracotta">02</span> · Prises de vue</h3>
          <p>J'accepte d'être photographiée et/ou filmée : <span className="font-medium">{case_(adhesion.autorisation_image)} Oui &nbsp; {case_(!adhesion.autorisation_image)} Non</span></p>
        </section>
        <section className="mb-4">
          <h3 className="font-semibold mb-2"><span className="text-terracotta">03</span> · Utilisation de mon image</h3>
          {(Object.keys(SUPPORTS_IMAGE) as SupportImage[]).map(s => (
            <p key={s}>{case_(adhesion.autorisation_image && adhesion.image_supports.includes(s))} {SUPPORTS_IMAGE[s].libelle}</p>
          ))}
          <p className="mt-1 text-xs italic text-muted-foreground">Seules les cases cochées valent autorisation. Les images ne seront pas vendues ni utilisées pour une campagne publicitaire sponsorisée sans accord complémentaire.</p>
        </section>
        <section>
          <h3 className="font-semibold mb-2"><span className="text-terracotta">04</span> · Mon consentement</h3>
          <p className="text-xs text-muted-foreground">
            Autorisation accordée pour une durée de 3 ans à compter de la signature. Vous pouvez la retirer à tout moment en contactant l'association. Votre choix est entièrement facultatif et n'a aucune conséquence sur votre adhésion ou votre participation aux activités du club.
          </p>
          <p className="mt-2">
            <span className="text-muted-foreground">Signé le : </span><span className="font-medium">{dateFr(adhesion.image_signee_le ?? adhesion.engagement_accepte_le)}</span>
            {adhesion.autorisation_image && photo.image_valable_jusqu_au && (
              <span className="text-muted-foreground"> · valable jusqu'au {dateFr(photo.image_valable_jusqu_au)}</span>
            )}
          </p>
        </section>
      </article>
    </div>
  );
};

export default BulletinAdhesion;
