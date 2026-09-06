// Charte graphique officielle du club (Canva).
// Couleurs primaires = accent distinctif de chaque antenne.
// Couleurs secondaires = palette commune du site (cf. src/index.css :
// --primary = rust, --background/--card = peche, --foreground = brun).

export const CHARTE_COMMUNE = {
  rust: "#b95b43",  // rouge terracotta
  peche: "#fde4d4", // pêche pâle
  brun: "#633b32",  // brun foncé
};

export interface AntenneTheme {
  nom: string;
  accent: string; // couleur distinctive de l'antenne, sur fond clair (10%)
}

export const ANTENNES_THEME: Record<"papotages" | "creatifs" | "business", AntenneTheme> = {
  papotages: { nom: "Papotages", accent: "#ce8f7e" }, // rose poudré
  creatifs:  { nom: "Créatifs",  accent: "#82947a" }, // vert sauge
  business:  { nom: "Business",  accent: "#9e6678" }, // mauve
};
