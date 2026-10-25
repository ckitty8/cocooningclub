import { useEffect, useState } from "react";
import { Camera, FileText, Loader2, Printer } from "lucide-react";
import MembreLayout from "@/components/membre/MembreLayout";
import BulletinAdhesion from "@/components/membre/BulletinAdhesion";
import BadgePhotos from "@/components/BadgePhotos";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  aujourdhuiIso, formaterNumero, fondFormule, LIBELLES_STATUT, MODES_REGLEMENT, statutAdhesion, type ModeReglement,
} from "@/lib/adhesions";
import { supportsLisibles } from "@/lib/autorisationImage";
import { autorisationDepuisChamps } from "@/lib/bulletin";
import { dateFr } from "@/lib/dates";

interface MonAdhesionLigne {
  id: string;
  numero: number;
  utilisateur_id: string;
  statut: string;
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
  cree_le: string;
  formules: {
    nom: string;
    description: string | null;
    couleur: string;
    prix: number;
    duree_mois: number;
    formule_espaces: { espace_id: string }[];
  } | null;
}


const Rangee = ({ libelle, children }: { libelle: string; children: React.ReactNode }) => (
  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2.5 border-b last:border-b-0 text-sm">
    <dt className="text-muted-foreground">{libelle}</dt>
    <dd className="font-medium text-right">{children}</dd>
  </div>
);

const MonAdhesion = () => {
  const { profile } = useAuth();
  const [adhesions, setAdhesions] = useState<MonAdhesionLigne[]>([]);
  const [espaces, setEspaces] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [vue, setVue] = useState<"recap" | "bulletin">("recap");

  useEffect(() => {
    document.title = "Mon adhésion · Cocooning Club";
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    Promise.all([
      supabase.from("adhesions")
        .select("*, formules(nom, description, couleur, prix, duree_mois, formule_espaces(espace_id))")
        .eq("utilisateur_id", profile.id)
        .order("cree_le", { ascending: false }),
      supabase.from("espaces").select("id, nom"),
    ]).then(([aRes, eRes]) => {
      setAdhesions((aRes.data as MonAdhesionLigne[]) ?? []);
      setEspaces(Object.fromEntries(((eRes.data ?? []) as { id: string; nom: string }[]).map(e => [e.id, e.nom])));
      setLoading(false);
    });
  }, [profile?.id]);

  // Le dernier bulletin non refusé est celui qui fait foi ; les autres forment l'historique.
  const courante = adhesions.find(a => a.statut !== "refusee");
  const historique = adhesions.filter(a => a.id !== courante?.id);
  const statut = courante ? statutAdhesion(courante, aujourdhuiIso()) : null;
  const photos = courante ? autorisationDepuisChamps(courante, courante.utilisateur_id) : null;
  const espacesInclus = (courante?.formules?.formule_espaces ?? []).map(fe => espaces[fe.espace_id]).filter(Boolean);

  return (
    <MembreLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mon adhésion</h1>
        <p className="text-muted-foreground text-sm mt-1">Ce que vous avez choisi et rempli sur votre bulletin d'adhésion.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : !courante || !profile ? (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <FileText className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Aucun bulletin d'adhésion enregistré</p>
          <p className="text-sm text-muted-foreground mt-1">
            Si vous avez déjà rendu un bulletin à l'association, il sera visible ici dès qu'il aura été enregistré. Écrivez-nous depuis la page contact du site.
          </p>
        </div>
      ) : (
        <>
          <div role="tablist" className="flex gap-6 border-b mb-6">
            {([["recap", "Récapitulatif"], ["bulletin", "Mon bulletin"]] as const).map(([cle, libelle]) => (
              <button key={cle} role="tab" aria-selected={vue === cle} onClick={() => setVue(cle)}
                className={`pb-2.5 text-sm font-medium border-b-2 -mb-px ${vue === cle ? "border-primary text-terracotta" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {libelle}
              </button>
            ))}
          </div>

          {vue === "recap" ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="bg-card rounded-2xl border overflow-hidden">
                <div className="px-5 py-4 text-white" style={{ backgroundColor: fondFormule(courante.formules?.couleur ?? "") }}>
                  <p className="font-display text-xl">{courante.formules?.nom ?? "Formule"}</p>
                  {courante.formules?.description && <p className="text-xs opacity-90 mt-0.5">{courante.formules.description}</p>}
                </div>
                <dl className="px-5 py-2">
                  <Rangee libelle="Statut"><span>{statut && LIBELLES_STATUT[statut]}</span></Rangee>
                  <Rangee libelle="N° d'adhérente">{formaterNumero(courante.numero)}</Rangee>
                  <Rangee libelle="Cotisation">{Number(courante.montant)} € / {courante.formules?.duree_mois ?? 12} mois</Rangee>
                  <Rangee libelle="Mode de règlement">{MODES_REGLEMENT[courante.mode_reglement as ModeReglement] ?? courante.mode_reglement}</Rangee>
                  <Rangee libelle="Cotisation reçue le">{dateFr(courante.cotisation_recue_le)}</Rangee>
                  <Rangee libelle="Validée le">{dateFr(courante.date_validation)}</Rangee>
                  <Rangee libelle="Valable jusqu'au">{dateFr(courante.valable_jusqu_au)}</Rangee>
                  <Rangee libelle="Espaces inclus">{espacesInclus.length ? espacesInclus.join(", ") : "—"}</Rangee>
                </dl>
              </section>

              <div className="space-y-5">
                <section className="bg-card rounded-2xl border px-5 py-2">
                  <h2 className="font-semibold pt-3 pb-1">Mes coordonnées</h2>
                  <dl>
                    <Rangee libelle="Nom, prénom">{`${profile.nom ?? ""} ${profile.prenom ?? ""}`.trim() || "—"}</Rangee>
                    <Rangee libelle="Téléphone">{profile.telephone || "—"}</Rangee>
                    <Rangee libelle="Adresse e-mail">{profile.email || "—"}</Rangee>
                    <Rangee libelle="Commune">{profile.commune || "—"}</Rangee>
                    <Rangee libelle="Activité">{profile.activite || "—"}</Rangee>
                  </dl>
                </section>

                <section className="bg-card rounded-2xl border px-5 py-2">
                  <h2 className="font-semibold pt-3 pb-1">Mes engagements et autorisations</h2>
                  <dl>
                    <Rangee libelle="Statuts et règlement intérieur">
                      {courante.engagement_accepte_le ? `acceptés le ${dateFr(courante.engagement_accepte_le)}` : "non renseigné"}
                    </Rangee>
                    <Rangee libelle="Groupe WhatsApp">{courante.whatsapp ? "Oui" : "Non"}</Rangee>
                    <Rangee libelle="Consentement photo et vidéo">{photos && <BadgePhotos autorisation={photos} avecLibelle={false} />}</Rangee>
                    {courante.autorisation_image && (
                      <>
                        <Rangee libelle="Supports autorisés">
                          {supportsLisibles(courante.image_supports).join(", ") || "aucun coché"}
                        </Rangee>
                        <Rangee libelle="Autorisation valable jusqu'au">{dateFr(photos?.image_valable_jusqu_au ?? null)}</Rangee>
                      </>
                    )}
                  </dl>
                  <p className="flex items-start gap-2 text-xs text-muted-foreground py-3">
                    <Camera className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    Vous pouvez modifier ou retirer une autorisation à tout moment en contactant l'association.
                  </p>
                </section>
              </div>

              {historique.length > 0 && (
                <section className="lg:col-span-2 bg-card rounded-2xl border px-5 py-3">
                  <h2 className="font-semibold pb-2">Mes autres demandes</h2>
                  <ul className="text-sm divide-y">
                    {historique.map(a => (
                      <li key={a.id} className="flex justify-between gap-3 py-2">
                        <span>N° {formaterNumero(a.numero)} · {a.formules?.nom} · demandée le {new Date(a.cree_le).toLocaleDateString("fr-FR")}</span>
                        <span className="text-muted-foreground">{LIBELLES_STATUT[statutAdhesion(a, aujourdhuiIso())]}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 border rounded-full px-4 py-2 text-sm font-medium hover:bg-muted">
                  <Printer className="w-4 h-4" /> Imprimer ou enregistrer en PDF
                </button>
              </div>
              <BulletinAdhesion
                personne={{
                  nom: profile.nom, prenom: profile.prenom, telephone: profile.telephone, email: profile.email,
                  commune: profile.commune ?? null, activite: profile.activite ?? null,
                }}
                adhesion={courante}
                formule={courante.formules}
              />
            </>
          )}
        </>
      )}
    </MembreLayout>
  );
};

export default MonAdhesion;
