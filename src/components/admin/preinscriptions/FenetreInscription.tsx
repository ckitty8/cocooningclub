import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Mail, MapPin, MessageSquare, Pencil, Phone, X } from "lucide-react";
import { toast } from "sonner";
import BadgePhotos from "@/components/BadgePhotos";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/utils/logAction";
import { detailPhotos, type AutorisationImage } from "@/lib/autorisationImage";
import { inscIdentite } from "@/lib/inscriptionIdentite";
import { clesModele, remplirModele, telephonePourWhatsApp } from "@/lib/messagesInscription";
import {
  ROLES_BADGE, STATUT_BADGE, STATUT_LABEL, type AtelierListe, type Inscription, type StatutInscription, type StatutPaiement,
} from "./types";

type Onglet = "infos" | "paiement" | "messages" | "historique";
type Canal = "mail" | "whatsapp";

interface Props {
  insc: Inscription;
  /** Pré-inscriptions affichées dans la liste, pour passer à la personne précédente ou suivante. */
  liste: Inscription[];
  atelier?: AtelierListe;
  autorisation?: AutorisationImage;
  templates: Record<string, string>;
  occupe: boolean;
  onClose: () => void;
  onNavigate: (insc: Inscription) => void;
  /** Retourne true si le statut a bien changé. */
  onStatut: (insc: Inscription, statut: StatutInscription) => Promise<boolean>;
  onPaiement: (insc: Inscription, paiement: StatutPaiement) => Promise<void>;
  onModifier: (insc: Inscription) => void;
}

interface LigneHistorique {
  action: string | null;
  auteur: string | null;
  horodatage: string | null;
}

const LIBELLES_ACTION: Record<string, string> = {
  "inscription.validate": "Pré-inscription validée",
  "inscription.refuse": "Pré-inscription refusée",
  "inscription.reset": "Remise en attente",
  "inscription.update": "Informations modifiées",
  "inscription.paiement": "Paiement mis à jour",
  "inscription.mail": "Mail préparé",
  "inscription.whatsapp": "WhatsApp préparé",
  "inscription.create_manual": "Ajoutée par l'équipe",
};

const dateHeure = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });

const dateLongue = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const champ = "w-full border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary";

const FenetreInscription = ({
  insc, liste, atelier, autorisation, templates, occupe, onClose, onNavigate, onStatut, onPaiement, onModifier,
}: Props) => {
  const [onglet, setOnglet] = useState<Onglet>("infos");
  const [canal, setCanal] = useState<Canal>("mail");
  const [sujet, setSujet] = useState("");
  const [corps, setCorps] = useState("");
  const [historique, setHistorique] = useState<LigneHistorique[] | null>(null);

  const id = inscIdentite(insc);
  const nom = `${id.prenom} ${id.nom}`.trim() || "Sans nom";
  const role = insc.utilisateurs?.role ? ROLES_BADGE[insc.utilisateurs.role] : null;
  const position = liste.findIndex(i => i.id === insc.id);

  // Modèle proposé : « validation » tant que la décision n'est pas refusée.
  const valide = insc.statut !== "annule";
  const modele = useMemo(() => {
    const cles = clesModele(valide, canal);
    return {
      sujet: cles.sujet ? remplirModele(templates[cles.sujet] ?? "", insc) : "",
      corps: remplirModele(templates[cles.corps] ?? "", insc),
    };
  }, [valide, canal, templates, insc]);

  useEffect(() => {
    setSujet(modele.sujet);
    setCorps(modele.corps);
  }, [modele]);

  useEffect(() => {
    setOnglet("infos");
  }, [insc.id]);

  // L'historique est lu dans le journal des actions de l'équipe (aucune donnée supplémentaire à enregistrer).
  useEffect(() => {
    if (onglet !== "historique") return;
    let annule = false;
    supabase
      .from("vue_logs")
      .select("action, auteur, horodatage")
      .eq("enregistrement_cible_id", insc.id)
      .order("horodatage")
      .then(({ data }) => { if (!annule) setHistorique((data as LigneHistorique[]) ?? []); });
    return () => { annule = true; };
  }, [onglet, insc.id, insc.statut, insc.statut_paiement]);

  const envoyer = (voie: Canal, estValide: boolean, texteSujet: string, texteCorps: string) => {
    if (voie === "mail") {
      if (!id.email) { toast.error("Pas d'email renseigné"); return; }
      window.location.href = `mailto:${encodeURIComponent(id.email)}?subject=${encodeURIComponent(texteSujet)}&body=${encodeURIComponent(texteCorps)}`;
    } else {
      if (!id.telephone) { toast.error("Pas de téléphone renseigné"); return; }
      window.open(`https://wa.me/${telephonePourWhatsApp(id.telephone)}?text=${encodeURIComponent(texteCorps)}`, "_blank", "noopener,noreferrer");
    }
    logAction(voie === "mail" ? "inscription.mail" : "inscription.whatsapp", "inscriptions", insc.id, {
      prenom: id.prenom, nom: id.nom, atelier: insc.ateliers?.titre, decision: estValide ? "validation" : "refus",
    });
  };

  const validerEtEnvoyer = async () => {
    const ok = await onStatut(insc, "confirme");
    if (!ok) return;
    const cles = clesModele(true, "mail");
    const futur = { ...insc, statut: "confirme" as const };
    envoyer("mail", true, remplirModele(templates[cles.sujet] ?? "", futur), remplirModele(templates[cles.corps] ?? "", futur));
  };

  const ongletsDef: [Onglet, string][] = [["infos", "Infos"], ["paiement", "Paiement"], ["messages", "Messages"], ["historique", "Historique"]];
  const paiements: [StatutPaiement, string][] = [["non_requis", "Non requis"], ["en_attente", "En attente"], ["paye", "Payé"]];

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-foreground/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={`Pré-inscription de ${nom}`} onClick={onClose}>
      <div className="bg-background border rounded-2xl shadow-2xl w-full max-w-3xl my-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div className="flex items-center gap-4 min-w-0">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-2xl text-primary" aria-hidden="true">
              {(id.prenom || id.nom || "?")[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-2xl truncate">{nom}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {role && <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${role.cls}`}>{role.label}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_BADGE[insc.statut]}`}>{STATUT_LABEL[insc.statut]}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => onNavigate(liste[position - 1])} disabled={position <= 0} aria-label="Personne précédente"
              className="h-9 w-9 rounded-full border flex items-center justify-center hover:bg-muted disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => onNavigate(liste[position + 1])} disabled={position < 0 || position >= liste.length - 1} aria-label="Personne suivante"
              className="h-9 w-9 rounded-full border flex items-center justify-center hover:bg-muted disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={onClose} aria-label="Fermer" className="h-9 w-9 rounded-full border flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div role="tablist" className="flex gap-6 border-b px-6 mt-4">
          {ongletsDef.map(([cle, libelle]) => (
            <button key={cle} role="tab" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}
              className={`pb-2.5 text-sm font-medium border-b-2 -mb-px ${onglet === cle ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {libelle}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 min-h-[260px]">
          {onglet === "infos" && (
            <div className="grid gap-6 sm:grid-cols-2 text-sm">
              <div className="space-y-2 text-muted-foreground">
                <p className="font-medium text-foreground">Coordonnées</p>
                {id.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 shrink-0" />{id.email}</p>}
                {id.telephone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 shrink-0" />{id.telephone}</p>}
                {id.dateNaissance && <p>Date de naissance : {dateLongue(id.dateNaissance)}</p>}
                <p>Reçue le {dateHeure(insc.inscrit_le)}</p>
                <button onClick={() => onModifier(insc)} className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 text-xs border rounded-full hover:bg-muted text-foreground">
                  <Pencil className="w-3 h-3" /> Modifier
                </button>
              </div>
              <div className="space-y-2 text-muted-foreground">
                <p className="font-medium text-foreground">Atelier</p>
                {insc.ateliers && (
                  <>
                    <p className="text-foreground font-medium">{insc.ateliers.titre}</p>
                    <p className="flex items-center gap-2"><Calendar className="w-4 h-4 shrink-0" />{dateLongue(insc.ateliers.date_atelier)} · {insc.ateliers.heure_debut.slice(0, 5)}</p>
                    {insc.ateliers.lieu && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" />{insc.ateliers.lieu}</p>}
                  </>
                )}
                <p className="font-medium text-foreground pt-2">Consentement photo et vidéo</p>
                <p><BadgePhotos autorisation={insc.utilisateur_id ? autorisation : undefined} /></p>
                <p className="text-xs">{insc.utilisateur_id ? detailPhotos(autorisation) : "Personne sans compte : aucun bulletin d'adhésion."}</p>
              </div>
            </div>
          )}

          {onglet === "paiement" && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium mb-2">Paiement</p>
                <div role="group" aria-label="Statut du paiement" className="inline-flex rounded-full border bg-card p-0.5">
                  {paiements.map(([cle, libelle]) => (
                    <button key={cle} onClick={() => onPaiement(insc, cle)} aria-pressed={insc.statut_paiement === cle}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${insc.statut_paiement === cle ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                      {libelle}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground">
                Tarif de l'atelier : {atelier?.tarif_standard ? `${atelier.tarif_standard} €` : "gratuit"}.
              </p>
            </div>
          )}

          {onglet === "messages" && (
            <div className="space-y-3 text-sm">
              {insc.statut === "en_attente" && (
                <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  La décision n'est pas prise : voici le message de validation. Pour un refus, refusez d'abord la pré-inscription.
                </p>
              )}
              <div className="flex gap-2">
                {([["mail", "Mail", Mail], ["whatsapp", "WhatsApp", MessageSquare]] as const).map(([cle, libelle, Icone]) => (
                  <button key={cle} onClick={() => setCanal(cle)} aria-pressed={canal === cle}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${canal === cle ? "bg-foreground text-background border-foreground" : "hover:bg-muted"}`}>
                    <Icone className="w-3.5 h-3.5" /> {libelle}
                  </button>
                ))}
              </div>
              {canal === "mail" && (
                <div>
                  <label htmlFor="msg-sujet" className="block text-xs font-medium mb-1">Objet</label>
                  <input id="msg-sujet" value={sujet} onChange={e => setSujet(e.target.value)} className={champ} />
                </div>
              )}
              <div>
                <label htmlFor="msg-corps" className="block text-xs font-medium mb-1">Message</label>
                <textarea id="msg-corps" value={corps} onChange={e => setCorps(e.target.value)} rows={7} className={champ} />
              </div>
              <button
                onClick={() => envoyer(canal, valide, sujet, corps)}
                disabled={canal === "mail" ? !id.email : !id.telephone}
                className="px-4 py-2 rounded-full text-sm font-medium border hover:bg-muted disabled:opacity-40"
              >
                {canal === "mail" ? "Ouvrir le mail" : "Ouvrir WhatsApp"}
              </button>
            </div>
          )}

          {onglet === "historique" && (
            <ol className="border-l-2 ml-2 pl-5 space-y-4 text-sm">
              <li className="relative">
                <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                Pré-inscription reçue
                <span className="block text-xs text-muted-foreground">{dateHeure(insc.inscrit_le)}</span>
              </li>
              {(historique ?? []).map((l, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  {LIBELLES_ACTION[l.action ?? ""] ?? l.action}
                  <span className="block text-xs text-muted-foreground">
                    {l.horodatage ? dateHeure(l.horodatage) : ""}{l.auteur ? ` · ${l.auteur}` : ""}
                  </span>
                </li>
              ))}
              {historique !== null && historique.length === 0 && (
                <li className="text-xs text-muted-foreground">Aucune action de l'équipe pour l'instant.</li>
              )}
            </ol>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4">
          <button onClick={() => onStatut(insc, "annule")} disabled={occupe || insc.statut === "annule"}
            className="px-4 py-2 rounded-full text-sm border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-40">
            ✕ Refuser
          </button>
          <div className="flex flex-wrap gap-2">
            {insc.statut !== "en_attente" && (
              <button onClick={() => onStatut(insc, "en_attente")} disabled={occupe}
                className="px-4 py-2 rounded-full text-sm border hover:bg-muted disabled:opacity-40">Remettre en attente</button>
            )}
            <button onClick={() => onStatut(insc, "confirme")} disabled={occupe || insc.statut === "confirme"}
              className="px-4 py-2 rounded-full text-sm border hover:bg-muted disabled:opacity-40">✓ Valider</button>
            <button onClick={validerEtEnvoyer} disabled={occupe || insc.statut === "confirme" || !id.email}
              className="px-5 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
              title={!id.email ? "Pas d'email renseigné" : undefined}>
              ✓ Valider et envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FenetreInscription;
