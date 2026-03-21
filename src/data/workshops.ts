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
  {
    title: "Atelier Papotage",
    date: "Mardi 30 Mars",
    time: "14h30 – 16h30",
    spots: 12,
    description: "Moment d'échange entre entrepreneuses. Ambiance chill autour d'un thé ou café. Format discussion et partage. Consommation obligatoire sur place.",
    location: "Le FLOW · Gagny",
    price: "Consommation sur place",
  },
  {
    title: "Atelier Créatif — Terrarium",
    date: "Mardi 7 Avril",
    time: "13h30 –",
    spots: 8,
    description: "Activité manuelle et moment cocooning. Créez votre propre terrarium et repartez avec votre mini-jardin sous verre.",
    location: "À préciser",
    price: "25€",
  },
  {
    title: "Atelier Papotage",
    date: "Mardi 28 Avril",
    time: "14h30 – 16h30",
    spots: 12,
    description: "Moment d'échange entre entrepreneuses. Ambiance chill autour d'un thé ou café. Format discussion et partage. Consommation obligatoire sur place.",
    location: "Le FLOW · Gagny",
    price: "Consommation sur place",
  },
  {
    title: "Atelier Créatif — Pierre & Oracle",
    date: "Mardi 5 Mai",
    time: "À définir",
    spots: 8,
    description: "Activité manuelle et moment cocooning autour du thème Pierre et Oracle. Tarif à confirmer.",
    location: "À préciser",
    price: "À définir",
  },
  {
    title: "Atelier Papotage",
    date: "Mardi 26 Mai",
    time: "14h30 – 16h30",
    spots: 12,
    description: "Moment d'échange entre entrepreneuses. Ambiance chill autour d'un thé ou café. Format discussion et partage. Consommation obligatoire sur place.",
    location: "Le FLOW · Gagny",
    price: "Consommation sur place",
  },
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
