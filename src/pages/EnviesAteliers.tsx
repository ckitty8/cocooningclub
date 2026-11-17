import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import Requis from "@/components/Requis";
import { Surtitre } from "@/components/vitrine";
import { useAntiSpam } from "@/hooks/useAntiSpam";
import { supabase } from "@/integrations/supabase/client";
import {
  ESPACES_ENVIE, MOMENTS, SOUHAITS, enregistrerEnvie, montantPlafond, phraseMateriel, validerEnvie,
  type EspaceEnvie, type Moment, type Souhait,
} from "@/lib/enviesAteliers";

// Boîte à envies (17/11) : page publique sans connexion, ni dans le menu ni sur Google (noindex, absente
// du plan du site) ; seul un lien discret du pied de page y mène. Les réponses sont lues dans
// Admin → Envies d'ateliers.

const champ = "w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const libelleCls = "mb-1.5 block text-sm font-medium text-foreground";
const facultatif = <span className="font-normal text-muted-foreground"> (facultatif)</span>;
const erreurCls = "mt-1 text-xs text-destructive";

const Groupe = ({ legende, requis, children, erreur, className = "" }: {
  legende: ReactNode; requis?: boolean; children: ReactNode; erreur?: string; className?: string;
}) => (
  <fieldset className={`rounded-xl border bg-muted/30 p-4 ${className}`}>
    <legend className="px-1 text-sm font-medium text-foreground">{legende}{requis && <Requis />}</legend>
    {children}
    {erreur && <p className={erreurCls}>{erreur}</p>}
  </fieldset>
);

const EnviesAteliers = () => {
  const antiSpam = useAntiSpam();
  const [plafond, setPlafond] = useState<number | null>(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [contact, setContact] = useState("");
  const [espace, setEspace] = useState<EspaceEnvie | "">("");
  const [idee, setIdee] = useState("");
  const [details, setDetails] = useState("");
  const [souhait, setSouhait] = useState<Souhait | "">("");
  const [materiel, setMateriel] = useState("");
  const [budget, setBudget] = useState("");
  const [moments, setMoments] = useState<Moment[]>([]);
  const [consentement, setConsentement] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [envoyee, setEnvoyee] = useState(false);

  // Plafond du matériel réglé par les administratrices (texte générique tant qu'il n'est pas lu).
  useEffect(() => {
    supabase.from("parametres_envies").select("plafond_materiel").maybeSingle().then(({ data }) => {
      if (data?.plafond_materiel != null) setPlafond(Number(data.plafond_materiel));
    });
  }, []);

  const basculerMoment = (m: Moment) => setMoments(prev => (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]));

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validerEnvie({ prenom, espace: espace || undefined, idee, souhait: souhait || undefined, consentement });
    setErreurs(e);
    if (Object.keys(e).length) {
      document.getElementById(`envie-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    // Champ piège rempli : un robot. On fait comme si tout allait bien, sans rien envoyer.
    if (antiSpam.piegeRempli()) { setEnvoyee(true); return; }
    setEnvoi(true);
    await antiSpam.attendreDelai();
    await enregistrerEnvie({
      prenom, nom, contact, espace: espace as EspaceEnvie, idee, details, souhait: souhait as Souhait,
      materiel, budget, moments,
    });
    setEnvoi(false);
    setEnvoyee(true);
    window.scrollTo(0, 0);
  };

  const recommencer = () => {
    setEspace(""); setIdee(""); setDetails(""); setSouhait(""); setMateriel(""); setBudget(""); setMoments([]);
    setErreurs({}); setEnvoyee(false); antiSpam.reset();
  };

  const montant = montantPlafond(plafond);

  return (
    <div className="theme-vitrine flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1 pt-24">
        <section className="container mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
          <div className="space-y-3 text-center">
            <Surtitre>Boîte à envies</Surtitre>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">Tes envies d'ateliers</h1>
            <p className="mx-auto max-w-lg text-muted-foreground">
              Une idée d'atelier, un savoir-faire à partager ou simplement une envie ? Dis-le-nous : chaque réponse est lue par l'équipe du club.
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
            {envoyee ? (
              <div className="space-y-4 py-6 text-center" role="status">
                <p className="font-display text-3xl">Merci pour ton idée 💛</p>
                <p className="text-muted-foreground">L'équipe la lira très vite.</p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button type="button" onClick={recommencer} className="rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-muted">
                    Proposer une autre idée
                  </button>
                  <Link to="/calendrier" className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                    Voir les prochains ateliers
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={envoyer} noValidate className="space-y-5">
                {antiSpam.honeypot}

                <div className="flex gap-3 rounded-2xl border-l-4 border-primary bg-muted/40 p-4 text-sm leading-relaxed">
                  <span aria-hidden="true">💛</span>
                  <p>
                    <strong>Bon à savoir</strong><br />
                    Nos ateliers sont organisés <strong>bénévolement</strong> par les membres du club.
                    Pour les ateliers <strong>Créatifs</strong> et <strong>Papotages</strong>, {phraseMateriel(plafond)}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground"><span className="text-red-700">*</span> Champ obligatoire</p>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="envie-prenom" className={libelleCls}>Prénom<Requis /></label>
                    <input id="envie-prenom" className={champ} value={prenom} onChange={e => setPrenom(e.target.value)} autoComplete="given-name" maxLength={100} aria-invalid={!!erreurs.prenom} />
                    {erreurs.prenom && <p className={erreurCls}>{erreurs.prenom}</p>}
                  </div>
                  <div>
                    <label htmlFor="envie-nom" className={libelleCls}>Nom{facultatif}</label>
                    <input id="envie-nom" className={champ} value={nom} onChange={e => setNom(e.target.value)} autoComplete="family-name" maxLength={100} />
                  </div>
                </div>

                <div>
                  <label htmlFor="envie-contact" className={libelleCls}>E-mail ou téléphone{facultatif}</label>
                  <input id="envie-contact" className={champ} value={contact} onChange={e => setContact(e.target.value)} maxLength={255} />
                  <p className="mt-1.5 text-xs text-muted-foreground">Seulement si tu veux qu'on te recontacte à propos de ton idée.</p>
                </div>

                <Groupe legende="Ton envie concerne" requis erreur={erreurs.espace}>
                  <div className="space-y-3" role="radiogroup">
                    {ESPACES_ENVIE.map((e, i) => (
                      <label key={e.valeur} className="flex cursor-pointer items-start gap-3 text-sm">
                        <input
                          id={i === 0 ? "envie-espace" : undefined}
                          type="radio" name="espace" value={e.valeur}
                          checked={espace === e.valeur} onChange={() => setEspace(e.valeur)}
                          className="mt-0.5 h-6 w-6 shrink-0 accent-primary"
                        />
                        <span>
                          <span className="font-medium">{e.libelle}</span>
                          {e.definition && <span className="block text-xs text-muted-foreground">{e.definition}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </Groupe>

                <div>
                  <label htmlFor="envie-idee" className={libelleCls}>Ton idée d'atelier en quelques mots<Requis /></label>
                  <input id="envie-idee" className={champ} value={idee} onChange={e => setIdee(e.target.value)} maxLength={300} placeholder="Ex. : Atelier couronnes de Noël" aria-invalid={!!erreurs.idee} />
                  {erreurs.idee && <p className={erreurCls}>{erreurs.idee}</p>}
                </div>

                <div>
                  <label htmlFor="envie-details" className={libelleCls}>Raconte-nous{facultatif}</label>
                  <textarea id="envie-details" className={`${champ} min-h-28`} value={details} onChange={e => setDetails(e.target.value)} maxLength={3000} placeholder="Ce que l'on ferait, pour qui, combien de temps…" />
                </div>

                <Groupe legende="Tu aimerais…" requis erreur={erreurs.souhait}>
                  <div className="space-y-2.5">
                    {SOUHAITS.map((s, i) => (
                      <label key={s.valeur} className="flex cursor-pointer items-center gap-3 text-sm">
                        <input
                          id={i === 0 ? "envie-souhait" : undefined}
                          type="radio" name="souhait" value={s.valeur}
                          checked={souhait === s.valeur} onChange={() => setSouhait(s.valeur)}
                          className="h-6 w-6 shrink-0 accent-primary"
                        />
                        {s.libelle}
                      </label>
                    ))}
                  </div>
                </Groupe>

                <fieldset className="space-y-4 rounded-xl border border-dashed border-primary bg-muted/20 p-4">
                  <legend className="px-1 text-sm font-medium">Matériel <span className="font-normal text-muted-foreground">(ateliers Créatifs ou Papotages, facultatif)</span></legend>
                  <div>
                    <label htmlFor="envie-materiel" className={libelleCls}>Matériel nécessaire</label>
                    <textarea id="envie-materiel" className={`${champ} min-h-20`} value={materiel} onChange={e => setMateriel(e.target.value)} maxLength={1000} placeholder="Ex. : couronnes en osier, branches de sapin, rubans…" />
                  </div>
                  <div className="sm:max-w-xs">
                    <label htmlFor="envie-budget" className={libelleCls}>Budget estimé</label>
                    <input id="envie-budget" className={champ} value={budget} onChange={e => setBudget(e.target.value)} maxLength={50} placeholder="Ex. : 25 €" />
                  </div>
                  {montant && (
                    <p className="text-xs text-muted-foreground">L'association peut prendre en charge le matériel dans la limite de <strong>{montant}</strong> par atelier.</p>
                  )}
                </fieldset>

                <Groupe legende={<>Les moments qui t'arrangent{facultatif}</>}>
                  <div className="flex flex-wrap gap-x-6 gap-y-2.5">
                    {MOMENTS.map(m => (
                      <label key={m.valeur} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" checked={moments.includes(m.valeur)} onChange={() => basculerMoment(m.valeur)} className="h-6 w-6 shrink-0 accent-primary" />
                        {m.libelle}
                      </label>
                    ))}
                  </div>
                </Groupe>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-muted-foreground">
                    <input id="envie-consentement" type="checkbox" checked={consentement} onChange={e => setConsentement(e.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 accent-primary" aria-invalid={!!erreurs.consentement} />
                    <span>
                      J'accepte que l'équipe du Cocooning Club conserve mes réponses pour organiser ses ateliers
                      (voir la <Link to="/confidentialite" className="text-terracotta underline">politique de confidentialité</Link>).<Requis />
                    </span>
                  </label>
                  {erreurs.consentement && <p className={erreurCls}>{erreurs.consentement}</p>}
                </div>

                <button type="submit" disabled={envoi} className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                  {envoi ? "Envoi…" : "Envoyer mon envie"}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default EnviesAteliers;
