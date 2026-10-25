import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAntiSpam } from "@/hooks/useAntiSpam";
import { formatDateFr, formatTimeFr, type Workshop } from "@/data/workshops";
import {
  ATELIER_AVEC_DATE_NAISSANCE,
  preInscriptionMembreSchema,
  preInscriptionSchema,
  valeursInitiales,
  type PreInscriptionData,
} from "@/lib/preInscription";
import { enregistrerPreInscription, type IssuePreInscription } from "@/lib/preInscriptionSecours";
import AjouterAgenda from "@/components/AjouterAgenda";

interface PreInscriptionModalProps {
  /** Ateliers proposés dans la liste déroulante. */
  ateliers: Workshop[];
  /** Titre de l'atelier présélectionné ("" pour laisser choisir). */
  atelierInitial: string;
  onFermer: () => void;
  /** Atelier imposé (lien d'inscription partagé) : il n'est plus choisi dans la liste. */
  atelierId?: string;
  /** Affiche le formulaire directement dans la page, sans fenêtre par-dessus. */
  enPage?: boolean;
}

interface Confirmation {
  atelier: Workshop | null;
  titre: string;
  issue: IssuePreInscription["issue"];
}

const champ = "w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring read-only:bg-muted/40 read-only:text-muted-foreground";
const libelle = "block text-sm font-medium text-foreground mb-1.5";
const erreur = "text-destructive text-xs mt-1";

// Fenêtre de pré-inscription, utilisée par l'accueil et le calendrier.
// Elle est montée à chaque ouverture : le formulaire et le chrono anti-robot
// repartent de zéro.
const PreInscriptionModal = ({ ateliers, atelierInitial, onFermer, atelierId, enPage = false }: PreInscriptionModalProps) => {
  const { profile } = useAuth();
  const antiSpam = useAntiSpam();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<PreInscriptionData>({
    resolver: zodResolver(profile ? preInscriptionMembreSchema : preInscriptionSchema),
    defaultValues: valeursInitiales(atelierInitial, profile),
  });

  const onSubmit = async (data: PreInscriptionData) => {
    const trouve = (atelierId ? ateliers.find(a => a.id === atelierId) : ateliers.find(a => a.titre === data.workshop)) ?? null;
    // Atelier de remplacement (détails indisponibles) : utilisable pour l'envoi, pas pour l'affichage.
    const atelier = trouve && trouve.date_atelier ? trouve : null;
    const demande = {
      data,
      atelierId: trouve?.id ?? atelierId ?? null,
      atelierTitre: trouve?.titre ?? data.workshop,
      profil: profile ? { id: profile.id, prenom: profile.prenom, nom: profile.nom, email: profile.email } : null,
    };

    // Robot sûr (champ piège rempli) : on simule une réussite sans rien enregistrer.
    if (!profile && antiSpam.piegeRempli()) {
      setConfirmation({ atelier, titre: demande.atelierTitre, issue: "enregistree" });
      return;
    }

    // Envoi très rapide (remplissage automatique) : on patiente au lieu de jeter la demande.
    // Les coordonnées ne sont jamais perdues : base, puis demande de secours, puis navigateur.
    let issue: IssuePreInscription;
    try {
      if (!profile) await antiSpam.attendreDelai();
      issue = await enregistrerPreInscription(demande);
    } catch {
      issue = await enregistrerPreInscription({ ...demande, atelierId: null });
    }

    if (issue.issue === "doublon") {
      toast.error(issue.message);
      return;
    }

    // Les places ne sont décomptées qu'à la validation par l'équipe (trigger en base).
    setConfirmation({ atelier, titre: demande.atelierTitre, issue: issue.issue });
  };

  return (
    <div
      className={enPage ? "" : "fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm"}
      onClick={enPage ? undefined : onFermer}
    >
      <div
        {...(enPage ? {} : { role: "dialog", "aria-modal": true })}
        aria-label="Pré-inscription"
        className={enPage
          ? "bg-card rounded-2xl md:rounded-3xl border shadow-xl w-full max-w-xl mx-auto p-5 md:p-8 relative"
          : "bg-background rounded-2xl md:rounded-3xl border shadow-2xl w-full max-w-xl mx-3 p-5 md:p-8 relative max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"}
        onClick={e => e.stopPropagation()}
      >
        {!enPage && (
          <button
            onClick={onFermer}
            aria-label="Fermer"
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {confirmation ? (
          <div className="text-center space-y-5">
            <div className="flex justify-center">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
            </div>
            <div>
              <h3 className="font-brand text-2xl text-foreground mb-1">
                {confirmation.issue === "locale" ? "Demande bien notée" : "Pré-inscription enregistrée !"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {confirmation.issue === "locale" ? (
                  <>
                    Nous n'avons pas pu joindre le serveur, mais votre demande pour <span className="font-medium text-foreground">"{confirmation.titre}"</span> est
                    gardée sur cet appareil et sera envoyée automatiquement dès que possible. Rouvrez simplement le site avec une connexion.
                  </>
                ) : (
                  <>
                    Votre demande pour <span className="font-medium text-foreground">"{confirmation.titre}"</span>
                    {confirmation.atelier && <> le {formatDateFr(confirmation.atelier.date_atelier)} à {formatTimeFr(confirmation.atelier.heure_debut)}</>} a été envoyée.
                    <span className="text-xs mt-2 block">
                      {confirmation.issue === "secours"
                        ? "L'équipe a bien reçu vos coordonnées et reviendra vers vous par email ou WhatsApp."
                        : "Vous recevrez une confirmation par email ou WhatsApp après validation par l'équipe."}
                    </span>
                  </>
                )}
              </p>
            </div>
            {confirmation.atelier && confirmation.issue !== "locale" && (
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-foreground">Gardez la date dans votre calendrier</p>
                <AjouterAgenda atelier={confirmation.atelier} />
              </div>
            )}
            {!enPage && (
              <button onClick={onFermer} className="text-sm text-muted-foreground hover:text-foreground transition-colors pt-2">
                Fermer
              </button>
            )}
          </div>
        ) : (
          <>
            <h3 className="font-brand text-2xl text-foreground mb-1">Pré-inscription</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Votre demande sera validée par l'équipe et vous serez notifié(e) par email ou WhatsApp.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-4">
              {antiSpam.honeypot}

              <div>
                <label className={libelle}>Nom complet</label>
                <input {...register("name")} readOnly={!!profile} placeholder="Marie Dupont" className={champ} />
                {errors.name && <p className={erreur}>{errors.name.message}</p>}
              </div>

              <div>
                <label className={libelle}>Email</label>
                <input {...register("email")} readOnly={!!profile} type="email" placeholder="marie@email.com" className={champ} />
                {errors.email && <p className={erreur}>{errors.email.message}</p>}
              </div>

              <div>
                <label className={libelle}>
                  Téléphone <span className="text-muted-foreground font-normal">(optionnel — pour WhatsApp)</span>
                </label>
                <input {...register("phone")} type="tel" placeholder="06 12 34 56 78" className={champ} />
                {errors.phone && <p className={erreur}>{errors.phone.message}</p>}
              </div>

              <div>
                <label className={libelle}>Atelier</label>
                {atelierId ? (
                  <>
                    <p className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-foreground">
                      {watch("workshop")}
                      {ateliers.find(a => a.id === atelierId)?.date_atelier && <> — {formatDateFr(ateliers.find(a => a.id === atelierId)!.date_atelier)}</>}
                    </p>
                    <input type="hidden" {...register("workshop")} />
                  </>
                ) : (
                  <select {...register("workshop")} className={champ}>
                    <option value="">Choisir un atelier…</option>
                    {ateliers.map(ws => (
                      <option key={ws.id} value={ws.titre}>
                        {ws.titre} — {formatDateFr(ws.date_atelier)}
                      </option>
                    ))}
                  </select>
                )}
                {errors.workshop && <p className={erreur}>{errors.workshop.message}</p>}
              </div>

              {watch("workshop") === ATELIER_AVEC_DATE_NAISSANCE && (
                <div>
                  <label className={libelle}>Date de naissance</label>
                  <input {...register("birthdate")} type="date" className={champ} />
                  {errors.birthdate && <p className={erreur}>{errors.birthdate.message}</p>}
                </div>
              )}

              <div>
                <label className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  <input {...register("cgu")} type="checkbox" className="h-6 w-6 shrink-0 accent-primary" />
                  <span>
                    J'accepte les{" "}
                    <Link to="/cgu" target="_blank" className="text-terracotta underline underline-offset-2">conditions générales d'utilisation</Link>
                    {" "}et la{" "}
                    <Link to="/confidentialite" target="_blank" className="text-terracotta underline underline-offset-2">politique de confidentialité</Link>.
                  </span>
                </label>
                {errors.cgu && <p className={erreur}>{errors.cgu.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity mt-2 disabled:opacity-50"
              >
                {isSubmitting ? "Envoi en cours…" : "Envoyer ma pré-inscription"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default PreInscriptionModal;
