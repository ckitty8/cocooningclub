export interface Workshop {
  title: string;
  date: string;
  time: string;
  spots: number;
  description: string;
  location: string;
  price: string;
}

export const workshops: Workshop[] = [
  { title: "Atelier Bougies Parfumées", date: "Samedi 22 Mars", time: "14h – 17h", spots: 8, description: "Créez vos propres bougies avec des cires naturelles et des huiles essentielles.", location: "Gagny", price: "Gratuit" },
  { title: "Aquarelle & Détente", date: "Samedi 5 Avril", time: "10h – 13h", spots: 10, description: "Initiez-vous à l'aquarelle dans une ambiance douce et bienveillante.", location: "Gagny", price: "Gratuit" },
  { title: "Macramé Mural", date: "Samedi 19 Avril", time: "14h – 17h", spots: 6, description: "Apprenez les nœuds de base et repartez avec votre création murale.", location: "Chelles", price: "Gratuit" },
  { title: "Poterie & Modelage", date: "Samedi 3 Mai", time: "10h – 13h", spots: 8, description: "Découvrez le travail de la terre et façonnez votre premier objet en argile.", location: "Le Raincy", price: "Gratuit" },
  { title: "Broderie Moderne", date: "Samedi 17 Mai", time: "14h – 17h", spots: 10, description: "Apprenez les points essentiels et créez un motif contemporain sur tambour.", location: "Gagny", price: "Gratuit" },
  { title: "Atelier Terrarium", date: "Samedi 31 Mai", time: "10h – 13h", spots: 8, description: "Composez votre mini-jardin sous verre avec des plantes tropicales.", location: "Chelles", price: "Gratuit" },
  { title: "Lettering & Calligraphie", date: "Samedi 14 Juin", time: "14h – 17h", spots: 10, description: "Initiez-vous au brush lettering et repartez avec une œuvre encadrée.", location: "Gagny", price: "Gratuit" },
  { title: "Savons Naturels", date: "Samedi 28 Juin", time: "10h – 13h", spots: 8, description: "Fabriquez vos savons artisanaux aux huiles végétales et parfums naturels.", location: "Le Raincy", price: "Gratuit" },
  { title: "Tissage sur Cadre", date: "Samedi 12 Juillet", time: "14h – 17h", spots: 6, description: "Créez une pièce tissée unique en jouant avec les textures et les couleurs.", location: "Gagny", price: "Gratuit" },
  { title: "Atelier Céramique", date: "Samedi 26 Juillet", time: "10h – 13h", spots: 8, description: "Modelez et décorez une tasse ou un bol en céramique artisanale.", location: "Chelles", price: "Gratuit" },
  { title: "Couronnes de Fleurs Séchées", date: "Samedi 9 Août", time: "14h – 17h", spots: 10, description: "Composez une couronne décorative avec des fleurs séchées et stabilisées.", location: "Le Raincy", price: "Gratuit" },
  { title: "Initiation Crochet", date: "Samedi 23 Août", time: "10h – 13h", spots: 8, description: "Apprenez les mailles de base et réalisez votre premier accessoire au crochet.", location: "Gagny", price: "Gratuit" },
];

export const MONTH_MAP: Record<string, number> = {
  Janvier: 0, Février: 1, Mars: 2, Avril: 3, Mai: 4, Juin: 5,
  Juillet: 6, Août: 7, Septembre: 8, Octobre: 9, Novembre: 10, Décembre: 11,
};

export const FRENCH_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function parseWorkshopDate(dateStr: string): Date {
  const parts = dateStr.split(" ");
  const day = parseInt(parts[1]);
  const month = MONTH_MAP[parts[2]];
  return new Date(2026, month, day);
}
