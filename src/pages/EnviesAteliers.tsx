import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import Requis from "@/components/Requis";
import { Surtitre } from "@/components/vitrine";
import { useAntiSpam } from "@/hooks/useAntiSpam";
import { supabase } from "@/integrations/supabase/client";
import {
  ESPACES_ENVIE, JOURS, MAX_IDEES, MAX_LONGUEUR_PLAGE, MAX_PLAGES, SOUHAITS, enregistrerEnvoi, ideesRemplies, montantPlafond,
  phraseMateriel, validerEnvoi, type EspaceEnvie, type Jour, type Souhait,
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
  const [idees, setIdees] = useState<string[]>([""]);
  const [details, setDetails] = useState("");
  const [souhait, setSouhait] = useState<Souhait | "">("");
  const [materiel, setMateriel] = useState("");
  const [budget, setBudget] = useState("");
  const [jours, setJours] = useState<Jour[]>([]);
  const [plages, setPlages] = useState<string[]>([""]);
  const [consentement, setConsentement] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [envoyees, setEnvoyees] = useState(0);

  // Plafond du matériel réglé par les administratrices (texte générique tant qu'il n'est pas lu).
  useEffect(() => {
    supabase.from("parametres_envies").select("plafond_materiel").maybeSingle().then(({ data }) => {
      if (data?.plafond_materiel != null) setPlafond(Number(data.plafond_materiel));
    });
  }, []);

  const basculerJour = (j: Jour) => setJours(prev => (prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]));
  const modifierIdee = (i: number, texte: string) => setIdees(prev => prev.map((v, n) => (n === i ? texte : v)));
  const retirerIdee = (i: number) => { setIdees(prev => (prev.length > 1 ? prev.filter((_, n) => n !== i) : [""])); setErreurs({}); };
  const ajouterIdee = () => {
    setIdees(prev => [...prev, ""]);
    setTimeout(() => document.getElementById(`envie-idee-${idees.length}`)?.focus(), 0);
  };
  const modifierPlage = (i: number, texte: string) => setPlages(prev => prev.map((p, n) => (n === i ? texte : p)));
  const retirerPlage = (i: number) => setPlages(prev => (prev.length > 1 ? prev.filter((_, n) => n !== i) : [""]));
  const ajouterPlage = () => {
    setPlages(prev => [...prev, ""]);
    setTimeout(() => document.getElementById(`envie-plage-${plages.length}`)?.focus(), 0);
  };

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validerEnvoi({ prenom, espace, idees, souhait, consentement });
    setErreurs(e);
    if (Object.keys(e).length) {
      document.getElementById(`envie-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    // Champ piège rempli : un robot. On fait comme si tout allait bien, sans rien envoyer.
    if (antiSpam.piegeRempli()) { setEnvoyees(nbIdees); return; }
    setEnvoi(true);
    await antiSpam.attendreDelai();
    await enregistrerEnvoi({ prenom, nom, contact, espace, idees, details, souhait, materiel, budget, jours, plages });
    setEnvoi(false);
    setEnvoyees(nbIdees);
    window.scrollTo(0, 0);
  };

  const recommencer = () => {
    setEspace(""); setIdees([""]); setDetails(""); setSouhait(""); setMateriel(""); setBudget(""); setJours([]); setPlages([""]);
    setErreurs({}); setEnvoyees(0); antiSpam.reset();
  };

  const montant = montantPlafond(plafond);
  const nbIdees = Math.max(1, ideesRemplies(idees).length);

  return (
    <div className="theme-vitrine flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1 pt-24">
        <section className="container mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6">
          <div className="space-y-3 text-center">
            <Surtitre>Boîte à envies</Surtitre>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">Tes envies d'ateliers</h1>
            <p className="mx-auto max-w-lg text-muted-foreground">
              Une idée d'atelier (ou plusieurs !), un savoir-faire à partager ou simplement une envie ? Dis-le-nous : chaque réponse est lue par l'équipe du club.
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
            {envoyees > 0 ? (
              <div className="space-y-4 py-6 text-center" role="status">
                <p className="font-display text-3xl">{envoyees > 1 ? "Merci pour tes idées 💛" : "Merci pour ton idée 💛"}</p>
                <p className="text-muted-foreground">{envoyees > 1 ? "L'équipe les lira très vite." : "L'équipe la lira très vite."}</p>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button type="button" onClick={recommencer} className="rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-muted">
                    Proposer d'autres idées
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
                  <p className="mt-1.5 text-xs text-muted-foreground">Seulement si tu veux qu'on te recontacte à propos de tes idées.</p>
                </div>

                <Groupe legende="Ton envie concerne" requis erreur={erreurs.espace}>
                  <div className="space-y-3" role="radiogroup">
                    {ESPACES_ENVIE.map((e, n) => (
                      <label key={e.valeur} className="flex cursor-pointer items-start gap-3 text-sm">
                        <input
                          id={n === 0 ? "envie-espace" : undefined}
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

                <fieldset>
                  <legend className={libelleCls}>Tes idées d'atelier, en quelques mots<Requis /></legend>
                  <p className="mb-2 text-xs text-muted-foreground">Une idée par ligne : ajoute-en autant que tu veux.</p>
                  <ul className="space-y-3">
                    {idees.map((idee, i) => (
                      <li key={i}>
                        <div className="flex items-center gap-2">
                          <label htmlFor={`envie-idee-${i}`} className="sr-only">Idée {i + 1}</label>
                          <input
                            id={`envie-idee-${i}`} className={champ} value={idee} maxLength={300}
                            onChange={e => modifierIdee(i, e.target.value)}
                            placeholder={i === 0 ? "Ex. : Atelier couronnes de Noël" : "Une autre idée…"}
                            aria-invalid={!!erreurs[`idee-${i}`]}
                          />
                          {(idees.length > 1 || idee) && (
                            <button type="button" onClick={() => retirerIdee(i)} aria-label={`Retirer l'idée ${i + 1}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border hover:bg-muted">
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                        {erreurs[`idee-${i}`] && <p className={erreurCls}>{erreurs[`idee-${i}`]}</p>}
                      </li>
                    ))}
                  </ul>
                  {idees.length < MAX_IDEES && (
                    <button type="button" onClick={ajouterIdee} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/50 px-4 py-2 text-sm font-medium text-terracotta hover:bg-muted/40">
                      <Plus className="h-4 w-4" aria-hidden="true" />Ajouter une idée
                    </button>
                  )}
                </fieldset>

                <div>
                  <label htmlFor="envie-details" className={libelleCls}>Raconte-nous{facultatif}</label>
                  <textarea id="envie-details" className={`${champ} min-h-28`} value={details} onChange={e => setDetails(e.target.value)} maxLength={3000} placeholder="Ce que l'on ferait, pour qui, combien de temps…" />
                </div>

                <Groupe legende="Tu aimerais…" requis erreur={erreurs.souhait}>
                  <div className="space-y-2.5">
                    {SOUHAITS.map((x, n) => (
                      <label key={x.valeur} className="flex cursor-pointer items-center gap-3 text-sm">
                        <input
                          id={n === 0 ? "envie-souhait" : undefined}
                          type="radio" name="souhait" value={x.valeur}
                          checked={souhait === x.valeur} onChange={() => setSouhait(x.valeur)}
                          className="h-6 w-6 shrink-0 accent-primary"
                        />
                        {x.libelle}
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
                  <p className="mb-2 text-sm font-medium">Jours <span className="font-normal text-muted-foreground">(plusieurs choix possibles)</span></p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
                    {JOURS.map(j => (
                      <label key={j.valeur} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" checked={jours.includes(j.valeur)} onChange={() => basculerJour(j.valeur)} className="h-6 w-6 shrink-0 accent-primary" />
                        {j.libelle}
                      </label>
                    ))}
                  </div>
                  <p className="mb-2 mt-5 text-sm font-medium">Plages horaires <span className="font-normal text-muted-foreground">(plusieurs possibles)</span></p>
                  <ul className="space-y-3">
                    {plages.map((p, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <label htmlFor={`envie-plage-${i}`} className="sr-only">Plage horaire {i + 1}</label>
                        <input
                          id={`envie-plage-${i}`} className={champ} value={p} maxLength={MAX_LONGUEUR_PLAGE}
                          onChange={e => modifierPlage(i, e.target.value)}
                          placeholder={i === 0 ? "Ex. : 14 h – 17 h 30, ou après 18 h" : "Ex. : le matin avant 12 h"}
                        />
                        {(plages.length > 1 || p) && (
                          <button type="button" onClick={() => retirerPlage(i)} aria-label={`Retirer la plage ${i + 1}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border hover:bg-muted">
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {plages.length < MAX_PLAGES && (
                    <button type="button" onClick={ajouterPlage} className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />Ajouter une plage horaire
                    </button>
                  )}
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
                  {envoi ? "Envoi…" : nbIdees > 1 ? `Envoyer mes ${nbIdees} idées` : "Envoyer mon envie"}
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
