import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarPlus, CheckCircle2, Download, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAntiSpam } from "@/hooks/useAntiSpam";
import { formatDateFr, formatTimeFr, type Workshop } from "@/data/workshops";
import {
  ATELIER_AVEC_DATE_NAISSANCE,
  envoyerPreInscription,
  preInscriptionMembreSchema,
  preInscriptionSchema,
  valeursInitiales,
  type PreInscriptionData,
} from "@/lib/preInscription";
import { downloadIcsFile, googleCalendarUrl } from "@/utils/calendarLinks";
import { messageErreurServeur } from "@/utils/messageErreurServeur";

interface PreInscriptionModalProps {
  /** Ateliers proposés dans la liste déroulante. */
  ateliers: Workshop[];
  /** Titre de l'atelier présélectionné ("" pour laisser choisir). */
  atelierInitial: string;
  onFermer: () => void;
}

const champ = "w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring read-only:bg-muted/40 read-only:text-muted-foreground";
const libelle = "block text-sm font-medium text-foreground mb-1.5";
const erreur = "text-destructive text-xs mt-1";

// Fenêtre de pré-inscription, utilisée par l'accueil et le calendrier.
// Elle est montée à chaque ouverture : le formulaire et le chrono anti-robot
// repartent de zéro.
const PreInscriptionModal = ({ ateliers, atelierInitial, onFermer }: PreInscriptionModalProps) => {
  const { profile } = useAuth();
  const antiSpam = useAntiSpam();
  const [atelierConfirme, setAtelierConfirme] = useState<Workshop | null>(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<PreInscriptionData>({
    resolver: zodResolver(profile ? preInscriptionMembreSchema : preInscriptionSchema),
    defaultValues: valeursInitiales(atelierInitial, profile),
  });

  const onSubmit = async (data: PreInscriptionData) => {
    const atelier = ateliers.find(a => a.titre === data.workshop);
    if (!atelier) {
      toast.error("Cet atelier n'est plus disponible. Merci d'en choisir un autre.");
      return;
    }

    // Robot repéré (visiteur uniquement : un membre est authentifié) :
    // on simule une pré-inscription réussie sans rien enregistrer.
    const { error } = !profile && antiSpam.isBot()
      ? { error: null }
      : await envoyerPreInscription(data, atelier.id, profile);
    if (error) {
      toast.error(messageErreurServeur(error));
      return;
    }

    // Les places ne sont décomptées qu'à la validation par l'équipe (trigger en base).
    setAtelierConfirme(atelier);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pré-inscription"
        className="bg-background rounded-2xl md:rounded-3xl border shadow-2xl w-full max-w-xl mx-3 p-5 md:p-8 relative max-h-[95vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onFermer}
          aria-label="Fermer"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {atelierConfirme ? (
          <div className="text-center space-y-5">
            <div className="flex justify-center">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-1">Pré-inscription enregistrée !</h3>
              <p className="text-sm text-muted-foreground">
                Votre demande pour <span className="font-medium text-foreground">"{atelierConfirme.titre}"</span> le {formatDateFr(atelierConfirme.date_atelier)} à {formatTimeFr(atelierConfirme.heure_debut)} a été envoyée.
                <span className="text-xs mt-2 block">Vous recevrez une confirmation par email ou WhatsApp après validation par l'équipe.</span>
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-foreground">Gardez la date dans votre calendrier</p>
              <a
                href={googleCalendarUrl(atelierConfirme)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <CalendarPlus className="w-4 h-4" />
                Google Calendar
              </a>
              <button
                onClick={() => downloadIcsFile(atelierConfirme)}
                className="w-full flex items-center justify-center gap-2 border border-foreground/20 text-foreground py-3 rounded-full font-medium text-sm hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" />
                Apple Calendar / Outlook (.ics)
              </button>
            </div>
            <button onClick={onFermer} className="text-sm text-muted-foreground hover:text-foreground transition-colors pt-2">
              Fermer
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-display text-2xl font-bold text-foreground mb-1">Pré-inscription</h3>
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
                <select {...register("workshop")} className={champ}>
                  <option value="">Choisir un atelier…</option>
                  {ateliers.map(ws => (
                    <option key={ws.id} value={ws.titre}>
                      {ws.titre} — {formatDateFr(ws.date_atelier)}
                    </option>
                  ))}
                </select>
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
                  <input {...register("cgu")} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                  <span>
                    J'accepte les{" "}
                    <Link to="/cgu" target="_blank" className="text-primary underline underline-offset-2">conditions générales d'utilisation</Link>
                    {" "}et la{" "}
                    <Link to="/confidentialite" target="_blank" className="text-primary underline underline-offset-2">politique de confidentialité</Link>.
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
