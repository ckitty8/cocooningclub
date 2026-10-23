export interface Naissance {
  prenom: string;
  date_naissance: string | null;
}

/** « 1990-05-12 » → « 12/05/1990 » (sans passer par Date : pas de décalage de fuseau). */
export const formaterDateNaissance = (iso: string | null | undefined): string => {
  const [annee, mois, jour] = (iso ?? "").split("-");
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : "—";
};

/**
 * Personnes dont c'est l'anniversaire le jour `jourIso` (AAAA-MM-JJ), avec l'âge
 * qu'elles fêtent. Le 29 février est fêté le 28 les années non bissextiles.
 */
export const anniversairesDuJour = (
  personnes: readonly Naissance[],
  jourIso: string,
): { prenom: string; age: number }[] => {
  const [annee, mois, jour] = jourIso.split("-").map(Number);
  const bissextile = (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
  return personnes.flatMap(({ prenom, date_naissance }) => {
    if (!date_naissance) return [];
    const [naissance, m, j] = date_naissance.split("-").map(Number);
    if (!naissance || !m || !j || m !== mois) return [];
    const jourFete = m === 2 && j === 29 && !bissextile ? 28 : j;
    const age = annee - naissance;
    return jourFete === jour && age >= 0 ? [{ prenom, age }] : [];
  });
};
