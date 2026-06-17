export type ActivityLevel = "sedentaire" | "leger" | "actif" | "tres_actif";

export interface UserProfile {
  prenom: string;
  poidsActuel: number;
  poidsObjectif: number;
  dateObjectif: string;
  taille: number;
  activite: ActivityLevel;
  allergies: string[];
  autresExclusions: string;
}

export type FoodCategory =
  | "petit_dej_proteine"
  | "petit_dej_glucide"
  | "legume"
  | "cereale"
  | "legumineuse"
  | "proteine_midi"
  | "proteine_soir"
  | "gouter"
  | "dessert"
  | "collation";

export interface Food {
  id: string;
  nom: string;
  kcalPer100g: number;
  quantite: number; // grammes par portion
  kcalPortion: number;
  categorie: FoodCategory;
  daysAvailable?: string[]; // lundi..dimanche
}

export type DayKey = "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";

export interface MealSelection {
  proteine?: string; // food id
  glucide?: string;
  legume?: string;
  dessert?: string;
  items?: string[]; // for collations
}

export interface DayPlan {
  petitDej: MealSelection;
  collation1: MealSelection;
  dejeuner: MealSelection;
  collation2: MealSelection;
  diner: MealSelection;
  collation3: MealSelection;
}

export type WeekPlan = Record<DayKey, DayPlan>;

export interface CalorieStats {
  bmr: number;
  tdee: number;
  target: number;
  deficit: number;
  estimatedWeeklyLoss: number;
}
