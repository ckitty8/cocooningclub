import { useEffect, useState } from "react";
import { aujourdhuiIso } from "@/lib/adhesions";
import { formaterSaisieDate, isoDepuisSaisie, saisieDepuisIso } from "@/lib/dates";

interface Props {
  id: string;
  /** Date au format AAAA-MM-JJ, ou chaîne vide. */
  value: string;
  /** Appelée avec une date AAAA-MM-JJ valide, ou une chaîne vide tant que la saisie est incomplète ou invalide. */
  onChange: (iso: string) => void;
  className?: string;
  disabled?: boolean;
}

const PREMIERE_ANNEE = "1900-01-01";

/** Date de naissance tapée à la main (« jj/mm/aaaa », barres obliques automatiques), sans passer par le champ date du navigateur. */
const ChampDateNaissance = ({ id, value, onChange, className, disabled }: Props) => {
  const [texte, setTexte] = useState(() => saisieDepuisIso(value));

  // Une modification venue de l'extérieur (ouverture d'une autre fiche, remise à zéro) remplace le texte ;
  // la frappe en cours, elle, n'est jamais écrasée.
  useEffect(() => {
    setTexte(courant => (isoDepuisSaisie(courant) === (value || null) || (!value && courant !== "" && !isoDepuisSaisie(courant)) ? courant : saisieDepuisIso(value)));
  }, [value]);

  const iso = isoDepuisSaisie(texte);
  const horsLimites = iso !== null && (iso < PREMIERE_ANNEE || iso > aujourdhuiIso());
  const invalide = texte.length === 10 && (iso === null || horsLimites);

  const saisir = (brut: string) => {
    const formate = formaterSaisieDate(brut);
    setTexte(formate);
    const date = isoDepuisSaisie(formate);
    onChange(date && date >= PREMIERE_ANNEE && date <= aujourdhuiIso() ? date : "");
  };

  return (
    <>
      <input id={id} type="text" inputMode="numeric" autoComplete="bday" placeholder="jj/mm/aaaa" maxLength={10}
        value={texte} disabled={disabled} onChange={e => saisir(e.target.value)}
        aria-invalid={invalide} aria-describedby={invalide ? `${id}-erreur` : undefined} className={className} />
      {invalide && <p id={`${id}-erreur`} role="alert" className="text-xs text-destructive mt-1">Date invalide : tapez jour/mois/année (ex. 12/04/1988), pas dans le futur.</p>}
    </>
  );
};

export default ChampDateNaissance;
