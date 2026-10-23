// Formats de dates français partagés. Les dates de la base sont des « YYYY-MM-DD » sans fuseau :
// on ajoute l'heure locale pour éviter le décalage d'un jour.

/** « 23/10/2026 », ou « — » si la date est absente. */
export const dateFr = (iso: string | null) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("fr-FR") : "—");

/** « vendredi 23 octobre 2026 ». */
export const dateLongue = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
