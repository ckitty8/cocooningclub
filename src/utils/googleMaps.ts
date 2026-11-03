/** Vrai si le texte est un lien web (certains ateliers ont un lien Google Maps collé dans le champ « adresse »). */
export const estLien = (texte: string): boolean => /^https?:\/\//i.test(texte.trim());

/** Lien vers la carte : un lien collé tel quel est conservé, une adresse en clair lance une recherche Google Maps. */
export const googleMapsSearchUrl = (adresse: string) =>
  estLien(adresse) ? adresse.trim() : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;

/** Adresse à écrire en toutes lettres, ou null quand le champ ne contient qu'un lien. */
export const adresseLisible = (adresse: string | null | undefined): string | null =>
  adresse && adresse.trim() && !estLien(adresse) ? adresse.trim() : null;
