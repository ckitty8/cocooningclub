// Formats de dates français partagés. Les dates de la base sont des « YYYY-MM-DD » sans fuseau :
// on ajoute l'heure locale pour éviter le décalage d'un jour.

/** « 23/10/2026 », ou « — » si la date est absente. */
export const dateFr = (iso: string | null) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("fr-FR") : "—");

/** « vendredi 23 octobre 2026 ». */
export const dateLongue = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ── Saisie d'une date à la main (« jj/mm/aaaa ») ─────────────────────────────
// Le champ natif <input type="date"> se tape mal (segments, année qui saute, valeur vide tant que la date est
// incomplète) : on utilise un champ texte avec barres obliques automatiques.

/** Ne garde que les chiffres (8 au plus) et ajoute les « / » : « 12041988 » → « 12/04/1988 ». */
export const formaterSaisieDate = (brut: string): string => {
  const c = brut.replace(/\D/g, "").slice(0, 8);
  if (c.length <= 2) return c;
  if (c.length <= 4) return `${c.slice(0, 2)}/${c.slice(2)}`;
  return `${c.slice(0, 2)}/${c.slice(2, 4)}/${c.slice(4)}`;
};

/** « 12/04/1988 » → « 1988-04-12 » ; null si la date est incomplète ou n'existe pas (31/02, 00/10…). */
export const isoDepuisSaisie = (texte: string): string | null => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texte);
  if (!m) return null;
  const [jour, mois, annee] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
};

/** « 1988-04-12 » → « 12/04/1988 » ; chaîne vide si la date est absente. */
export const saisieDepuisIso = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};
