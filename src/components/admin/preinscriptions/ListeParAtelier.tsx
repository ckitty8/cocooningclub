import { Check, ChevronDown, ChevronRight, ClipboardSignature, FileSpreadsheet, Mail, MessageSquare, RotateCcw, X } from "lucide-react";
import { inscIdentite } from "@/lib/inscriptionIdentite";
import type { GroupeAtelier } from "@/lib/preInscriptions";
import { OffrePastille } from "@/components/OffrePastille";
import { euros } from "@/lib/droits";
import { phrasePlacesPrises } from "@/lib/placesAtelier";
import { libelleCreneau } from "@/lib/creneau";
import { ROLES_BADGE, STATUT_BADGE, STATUT_LABEL, type AtelierListe, type InfoDroit, type Inscription, type StatutInscription, reponseLibelle } from "./types";

interface Props {
  groupes: GroupeAtelier<AtelierListe, Inscription>[];
  ouverts: Record<string, boolean>;
  onBasculer: (atelierId: string) => void;
  /** Droit de chaque pré-inscription (par identifiant) ; absent tant que la migration des offres n'est pas appliquée. */
  droits?: Map<string, InfoDroit>;
  actingOn: string | null;
  onOuvrir: (insc: Inscription, onglet?: "infos" | "messages", canal?: "mail" | "whatsapp") => void;
  onStatut: (insc: Inscription, statut: StatutInscription) => void | Promise<void>;
  /** Export Excel de toutes les pré-inscriptions d'un atelier. */
  onExporter?: (atelier: AtelierListe, inscriptions: Inscription[]) => void;
  /** Feuille d'émargement (paysage, à imprimer) des pré-inscriptions validées d'un atelier. */
  onEmargement?: (atelier: AtelierListe, inscriptions: Inscription[]) => void;
  /** Case « Présente » des inscriptions validées. */
  onPresence?: (insc: Inscription, present: boolean) => void;
}

const dateCourte = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

const depuis = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const bouton = "flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-40";
// Sur téléphone, mail / WhatsApp / remise en attente restent accessibles dans le détail : la ligne reste lisible.
const boutonLarge = "hidden sm:flex h-8 w-8 items-center justify-center rounded-full border transition-colors disabled:opacity-40";

/** Accordéon : un bloc par atelier, avec ses pré-inscriptions et des actions rapides. */
const ListeParAtelier = ({ groupes, ouverts, onBasculer, droits, actingOn, onOuvrir, onStatut, onExporter, onEmargement, onPresence }: Props) => (
  <div className="space-y-3">
    {groupes.map(({ atelier, items, aTraiter, confirmees, total, toutes }) => {
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
                  {dateCourte(atelier.date_atelier)} · {total} pré-inscription{total > 1 ? "s" : ""} · {phrasePlacesPrises(atelier.places_max, atelier.places_disponibles, confirmees)}
                </span>
              </span>
              <span className={`font-body shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${aTraiter > 0 ? STATUT_BADGE.en_attente : "bg-green-100 text-green-700"}`}>
                {aTraiter > 0 ? `${aTraiter} à traiter` : "Tout est traité"}
              </span>
            </button>
          </h2>

          {ouvert && onExporter && total > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/20 px-5 py-2">
              <button onClick={() => onExporter(atelier, toutes)} title={`Télécharger les ${total} pré-inscriptions de cet atelier et leurs réponses`}
                className="font-body flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" /> Exporter en Excel ({total})
              </button>
              {onEmargement && (
                <button onClick={() => onEmargement(atelier, toutes)} title={`Feuille à imprimer (paysage) avec les ${confirmees} inscrites validées et une colonne Signature`}
                  className="font-body flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                  <ClipboardSignature className="h-3.5 w-3.5" aria-hidden="true" /> Feuille d'émargement ({confirmees})
                </button>
              )}
            </div>
          )}
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
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-terracotta" aria-hidden="true">
                        {(id.prenom || id.nom || "?")[0]?.toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{nom}</span>
                          {role && <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${role.cls}`}>{role.label}</span>}
                          {droits?.get(insc.id)?.offres.map(o => <OffrePastille key={o.formule_id} offre={o} />)}
                        </span>
                        <span className="block text-xs text-muted-foreground truncate">{id.email ?? id.telephone ?? "—"} · reçue le {depuis(insc.inscrit_le)}</span>
                      </span>
                    </button>

                    {droits?.get(insc.id) && (
                      <span className={`hidden sm:inline shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        droits.get(insc.id)!.droit.etat === "a_payer" ? "bg-amber-100 text-amber-700"
                        : droits.get(insc.id)!.droit.etat === "inclus" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {droits.get(insc.id)!.droit.etat === "a_payer" ? `À payer${droits.get(insc.id)!.droit.montant > 0 ? ` · ${euros(droits.get(insc.id)!.droit.montant)}` : ""}`
                          : droits.get(insc.id)!.droit.etat === "inclus" ? "Inclus" : "Gratuit"}
                      </span>
                    )}

                    {/* Réponses données sur le formulaire de pré-inscription de cet atelier. */}
                    <span className="hidden lg:block shrink-0 text-xs leading-relaxed text-muted-foreground">
                      <span className="block">Droit à l'image : <span className="font-medium text-foreground">{reponseLibelle(insc.autorisation_image, "Autorise", "N'autorise pas")}</span></span>
                      <span className="block">Groupe WhatsApp : <span className="font-medium text-foreground">{reponseLibelle(insc.accord_whatsapp, "Accepte", "N'accepte pas")}</span></span>
                      {insc.creneau && <span className="block">Présence prévue : <span className="font-medium text-foreground">{libelleCreneau(insc.creneau)}</span></span>}
                      {insc.instagram && <span className="block">Instagram : <span className="font-medium text-foreground">{insc.instagram}</span></span>}
                    </span>
                    <span className={`hidden sm:inline shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_BADGE[insc.statut]}`}>{STATUT_LABEL[insc.statut]}</span>
                    {onPresence && insc.statut === "confirme" && (
                      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground" title="Cocher si la personne était présente à l'atelier">
                        <input type="checkbox" checked={!!insc.present} onChange={e => onPresence(insc, e.target.checked)}
                          aria-label={`${nom} présente`} className="h-6 w-6 accent-primary" />
                        Présente
                      </label>
                    )}

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
                          <button onClick={() => onOuvrir(insc, "messages", "mail")} title="Envoyer un mail" aria-label={`Mail à ${nom}`} disabled={!id.email}
                            className={`${boutonLarge} hover:bg-muted`}><Mail className="w-4 h-4" /></button>
                          <button onClick={() => onOuvrir(insc, "messages", "whatsapp")} title="Envoyer un WhatsApp" aria-label={`WhatsApp à ${nom}`} disabled={!id.telephone}
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
