import { Check, ChevronDown, ChevronRight, Mail, MessageSquare, RotateCcw, X } from "lucide-react";
import BadgePhotos from "@/components/BadgePhotos";
import type { AutorisationImage } from "@/lib/autorisationImage";
import { inscIdentite } from "@/lib/inscriptionIdentite";
import type { GroupeAtelier } from "@/lib/preInscriptions";
import { ROLES_BADGE, STATUT_BADGE, STATUT_LABEL, type AtelierListe, type Inscription, type StatutInscription } from "./types";

interface Props {
  groupes: GroupeAtelier<AtelierListe, Inscription>[];
  ouverts: Record<string, boolean>;
  onBasculer: (atelierId: string) => void;
  autorisations: Map<string, AutorisationImage>;
  actingOn: string | null;
  onOuvrir: (insc: Inscription) => void;
  onStatut: (insc: Inscription, statut: StatutInscription) => void;
}

const dateCourte = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const depuis = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const bouton = "flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-40";
// Sur téléphone, mail / WhatsApp / remise en attente restent accessibles dans le détail : la ligne reste lisible.
const boutonLarge = "hidden sm:flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-40";

/** Accordéon : un bloc par atelier, avec ses pré-inscriptions et des actions rapides. */
const ListeParAtelier = ({ groupes, ouverts, onBasculer, autorisations, actingOn, onOuvrir, onStatut }: Props) => (
  <div className="space-y-3">
    {groupes.map(({ atelier, items, aTraiter, total }) => {
      const ouvert = !!ouverts[atelier.id];
      return (
        <section key={atelier.id} className="bg-card rounded-2xl border overflow-hidden">
          <h2>
            <button
              onClick={() => onBasculer(atelier.id)}
              aria-expanded={ouvert}
              className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            >
              {ouvert ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
              <span className="min-w-0 flex-1">
                <span className="font-display text-lg leading-tight block">{atelier.titre}</span>
                <span className="font-body text-xs text-muted-foreground">
                  {dateCourte(atelier.date_atelier)} · {total} pré-inscription{total > 1 ? "s" : ""} · {atelier.places_max - atelier.places_disponibles}/{atelier.places_max} places prises
                </span>
              </span>
              <span className={`font-body shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${aTraiter > 0 ? STATUT_BADGE.en_attente : "bg-green-100 text-green-700"}`}>
                {aTraiter > 0 ? `${aTraiter} à traiter` : "Tout est traité"}
              </span>
            </button>
          </h2>

          {ouvert && (
            <ul className="border-t divide-y">
              {items.length === 0 && (
                <li className="px-5 py-6 text-sm text-muted-foreground">
                  {total === 0 ? "Aucune pré-inscription pour cet atelier." : "Aucune pré-inscription avec ces filtres."}
                </li>
              )}
              {items.map(insc => {
                const id = inscIdentite(insc);
                const nom = `${id.prenom} ${id.nom}`.trim() || "Sans nom";
                const role = insc.utilisateurs?.role ? ROLES_BADGE[insc.utilisateurs.role] : null;
                const occupe = actingOn === insc.id;
                return (
                  <li key={insc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <button onClick={() => onOuvrir(insc)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Ouvrir la pré-inscription de ${nom}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-primary" aria-hidden="true">
                        {(id.prenom || id.nom || "?")[0]?.toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{nom}</span>
                          {role && <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${role.cls}`}>{role.label}</span>}
                        </span>
                        <span className="block text-xs text-muted-foreground truncate">{id.email ?? id.telephone ?? "—"} · reçue le {depuis(insc.inscrit_le)}</span>
                      </span>
                    </button>

                    <span className="hidden lg:block shrink-0">
                      <BadgePhotos autorisation={insc.utilisateur_id ? autorisations.get(insc.utilisateur_id) : undefined} />
                    </span>
                    <span className={`hidden sm:inline shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_BADGE[insc.statut]}`}>{STATUT_LABEL[insc.statut]}</span>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {insc.statut === "en_attente" ? (
                        <>
                          <button onClick={() => onStatut(insc, "confirme")} disabled={occupe} title="Valider" aria-label={`Valider ${nom}`}
                            className={`${bouton} bg-primary border-primary text-primary-foreground hover:opacity-90`}><Check className="w-4 h-4" /></button>
                          <button onClick={() => onStatut(insc, "annule")} disabled={occupe} title="Refuser" aria-label={`Refuser ${nom}`}
                            className={`${bouton} text-destructive hover:bg-destructive/10`}><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => onOuvrir(insc)} title="Envoyer un mail" aria-label={`Mail à ${nom}`} disabled={!id.email}
                            className={`${boutonLarge} hover:bg-muted`}><Mail className="w-4 h-4" /></button>
                          <button onClick={() => onOuvrir(insc)} title="Envoyer un WhatsApp" aria-label={`WhatsApp à ${nom}`} disabled={!id.telephone}
                            className={`${boutonLarge} hover:bg-muted`}><MessageSquare className="w-4 h-4" /></button>
                          <button onClick={() => onStatut(insc, "en_attente")} disabled={occupe} title="Remettre en attente" aria-label={`Remettre ${nom} en attente`}
                            className={`${boutonLarge} hover:bg-muted`}><RotateCcw className="w-4 h-4" /></button>
                        </>
                      )}
                      <button onClick={() => onOuvrir(insc)} title="Ouvrir le détail" aria-label={`Détail de ${nom}`}
                        className={`${bouton} hover:bg-muted`}><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      );
    })}
  </div>
);

export default ListeParAtelier;
