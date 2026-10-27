import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bug, CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import MembreLayout from "@/components/membre/MembreLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { messageErreurServeur } from "@/utils/messageErreurServeur";
import {
  CATEGORIE_ANOMALIE, DESCRIPTION_MAX, LIBELLES_SUITE, TITRE_MAX, ZONES_SIGNALEMENT,
  composerDescription, resumeAppareil, suiteDuSignalement, validerSignalement, type Suite,
} from "@/lib/signalement";

interface Signalement {
  id: string;
  titre: string;
  cree_le: string;
}

const champ = "w-full rounded-xl border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

const COULEUR_SUITE: Record<Suite, string> = {
  recu: "bg-muted text-foreground",
  pris_en_compte: "bg-green-100 text-green-900",
  en_discussion: "bg-amber-100 text-amber-900",
  classe: "bg-muted text-muted-foreground",
};

const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

/** « Signaler un problème » : une anomalie remonte dans la boîte à idées des administratrices (catégorie « Anomalie Site internet »). */
const Signaler = () => {
  const { profile } = useAuth();
  const [titre, setTitre] = useState("");
  const [zone, setZone] = useState("");
  const [description, setDescription] = useState("");
  const [joindreAppareil, setJoindreAppareil] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [signalements, setSignalements] = useState<Signalement[] | null>(null);
  const [reactions, setReactions] = useState<{ idee_id: string; reaction: string }[]>([]);

  const charger = async () => {
    const [sRes, rRes] = await Promise.all([
      supabase.from("idees").select("id, titre, cree_le").eq("categorie", CATEGORIE_ANOMALIE).order("cree_le", { ascending: false }),
      supabase.from("idee_reactions").select("idee_id, reaction"),
    ]);
    setSignalements(sRes.error ? [] : ((sRes.data ?? []) as Signalement[]));
    setReactions((rRes.data ?? []) as { idee_id: string; reaction: string }[]);
  };

  useEffect(() => { document.title = "Signaler un problème · Cocooning Club"; charger(); }, []);

  const suiteDe = useMemo(() => {
    const parIdee = new Map<string, string[]>();
    for (const r of reactions) parIdee.set(r.idee_id, [...(parIdee.get(r.idee_id) ?? []), r.reaction]);
    return (id: string): Suite => suiteDuSignalement(parIdee.get(id) ?? []);
  }, [reactions]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    const probleme = validerSignalement(titre, description);
    if (probleme) { toast.error(probleme); return; }
    setEnvoi(true);
    const appareil = joindreAppareil ? resumeAppareil(navigator.userAgent, window.screen.width, window.screen.height) : null;
    const { error } = await supabase.from("idees").insert({
      utilisateur_id: profile.id,
      categorie: CATEGORIE_ANOMALIE,
      titre: titre.trim(),
      description: composerDescription(description, zone, appareil),
    });
    setEnvoi(false);
    if (error) {
      console.error("[Signaler]", error);
      toast.error(messageErreurServeur(error));
      return;
    }
    setTitre(""); setZone(""); setDescription("");
    setEnvoye(true);
    charger();
  };

  return (
    <MembreLayout>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Bug className="h-6 w-6 text-terracotta" aria-hidden="true" />
          Signaler un problème
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Une page qui ne s'affiche pas, un bouton qui ne répond pas, une erreur ? Dis-nous ce qui s'est passé : l'équipe le reçoit dans sa boîte à idées.
          Pour une idée d'amélioration, utilise plutôt la <Link to="/espace-membre/boite-a-idees" className="text-terracotta underline underline-offset-2">boîte à idées</Link>.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <form onSubmit={envoyer} className="min-w-0 space-y-4 rounded-2xl border bg-card p-6">
          {envoye && (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Merci, ton signalement est bien arrivé. L'équipe le regarde et tu peux suivre sa suite à côté.
            </p>
          )}
          <div>
            <label htmlFor="sig-titre" className="mb-1.5 block text-sm font-medium">Ce qui ne marche pas *</label>
            <input id="sig-titre" value={titre} onChange={e => { setTitre(e.target.value); setEnvoye(false); }} maxLength={TITRE_MAX}
              placeholder="Ex. Je n'arrive pas à m'inscrire à un atelier" className={champ} />
          </div>
          <div>
            <label htmlFor="sig-zone" className="mb-1.5 block text-sm font-medium">Où ça se passe ?</label>
            <select id="sig-zone" value={zone} onChange={e => setZone(e.target.value)} className={champ}>
              <option value="">— je ne sais pas / ça dépend —</option>
              {ZONES_SIGNALEMENT.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sig-desc" className="mb-1.5 block text-sm font-medium">Que s'est-il passé ? *</label>
            <textarea id="sig-desc" value={description} onChange={e => setDescription(e.target.value)} rows={6} maxLength={DESCRIPTION_MAX}
              placeholder="Ce que tu as fait, ce que tu attendais, ce que tu as vu à la place (un message d'erreur, une page vide…)." className={champ} />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" checked={joindreAppareil} onChange={e => setJoindreAppareil(e.target.checked)} className="h-6 w-6 shrink-0 accent-primary" />
            <span>
              Joindre mon navigateur et la taille de mon écran
              <span className="block text-xs text-muted-foreground">Cela aide l'équipe à retrouver le problème. Rien d'autre n'est envoyé.</span>
            </span>
          </label>
          <button type="submit" disabled={envoi}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {envoi ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            Envoyer le signalement
          </button>
        </form>

        <section className="min-w-0 rounded-2xl border bg-card p-6">
          <h2 className="mb-3 font-semibold text-foreground">Mes signalements</h2>
          {signalements === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-terracotta" aria-label="Chargement" />
          ) : signalements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun signalement pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {signalements.map(s => {
                const suite = suiteDe(s.id);
                return (
                  <li key={s.id} className="rounded-xl border p-3 text-sm">
                    <p className="font-medium text-foreground">{s.titre}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {dateFr(s.cree_le)}
                      <span className={`rounded-full px-2 py-0.5 font-medium ${COULEUR_SUITE[suite]}`}>{LIBELLES_SUITE[suite]}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Seules toi et les administratrices voient tes signalements.</p>
        </section>
      </div>
    </MembreLayout>
  );
};

export default Signaler;
