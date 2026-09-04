export const googleMapsSearchUrl = (adresse: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
