// Charte graphique Canva des 3 antennes du club.
// Couleurs estimées visuellement à partir de la maquette Canva partagée
// (logos + pastilles de couleur) — aucun code hex exact n'a été fourni.
// À corriger ici si les codes exacts sont communiqués depuis Canva.

// Couleurs communes aux 3 antennes (déjà proches de --primary/--foreground
// du site, cf. src/index.css).
export const CHARTE_COMMUNE = {
  rust: "#C15A34",  // rouge terracotta
  peche: "#F8E1CB", // pêche pâle
  brun: "#55341F",  // brun foncé
};

export interface AntenneTheme {
  nom: string;
  accent: string; // couleur distinctive de l'antenne, sur fond clair (10%)
}

export const ANTENNES_THEME: Record<"papotages" | "creatifs" | "business", AntenneTheme> = {
  papotages: { nom: "Papotages", accent: "#CB9686" }, // rose poudré
  creatifs:  { nom: "Créatifs",  accent: "#839A78" }, // vert sauge
  business:  { nom: "Business",  accent: "#A06E8A" }, // mauve
};
