// Mention publique du tarif d'un atelier (17/11) : « Gratuit » ou « Payant pour les non-adhérentes ».
// Le choix se fait dans Admin → Ateliers (« Pour les non-adhérentes : Gratuit / Payant ») ; il repose sur le prix
// non-adhérente (`tarif_standard`) : 0 ou vide = gratuit. Aucune colonne en plus.

export interface TarifAtelier {
  tarif_standard?: number | null;
  tarif_affichage?: string | null;
}

/** true si l'atelier est gratuit pour les non-adhérentes (prix vide ou 0 €). */
export const estGratuit = (a: TarifAtelier) => !(Number(a.tarif_standard) > 0);

/** « 15 € », « 12,50 € ». */
export const prixEnEuros = (n: number) =>
  `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")}\u00a0€`;

/** Texte affiché au public : « Gratuit » ou « Payant pour les non-adhérentes : 15 € » (ou le tarif affiché saisi). */
export const mentionTarif = (a: TarifAtelier): string => {
  if (estGratuit(a)) return "Gratuit";
  const detail = a.tarif_affichage?.trim() || prixEnEuros(Number(a.tarif_standard));
  return `Payant pour les non-adhérentes : ${detail}`;
};
