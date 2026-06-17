import { ActivityLevel, CalorieStats, DayPlan, UserProfile } from "./types";
import { getFoodById } from "./foodData";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  actif: 1.55,
  tres_actif: 1.725,
};

export function calcIMC(poids: number, taille: number): number {
  const m = taille / 100;
  return Math.round((poids / (m * m)) * 10) / 10;
}

export function calcDuration(dateObjectif: string): number {
  const now = new Date();
  const target = new Date(dateObjectif);
  const diffMs = target.getTime() - now.getTime();
  return Math.max(1, Math.round(diffMs / (7 * 24 * 3600 * 1000)));
}

export function calcCalorieStats(profile: UserProfile): CalorieStats {
  // Mifflin-St Jeor (femme assumed — no gender field, use female formula as Madame Protéine targets women)
  const bmr = 10 * profile.poidsActuel + 6.25 * profile.taille - 5 * 30 - 161;
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[profile.activite]);
  const deficit = profile.poidsActuel > profile.poidsObjectif ? 600 : 0;
  const target = Math.max(1200, tdee - deficit);
  const estimatedWeeklyLoss = (deficit * 7) / 7700;
  return { bmr: Math.round(bmr), tdee, target, deficit, estimatedWeeklyLoss: Math.round(estimatedWeeklyLoss * 100) / 100 };
}

export function calcDayKcal(day: DayPlan): number {
  let total = 0;
  const ids = [
    day.petitDej.proteine, day.petitDej.glucide,
    day.collation1.proteine, ...(day.collation1.items ?? []),
    day.dejeuner.proteine, day.dejeuner.glucide, day.dejeuner.legume,
    day.collation2.proteine, ...(day.collation2.items ?? []),
    day.diner.proteine, day.diner.glucide, day.diner.legume, day.diner.dessert,
    day.collation3.proteine, ...(day.collation3.items ?? []),
  ].filter(Boolean) as string[];

  ids.forEach(id => {
    const food = getFoodById(id);
    if (food) total += food.kcalPortion;
  });
  return total;
}

export function glucideTypeForMeal(mealGlucide: string | undefined): "cereale" | "legumineuse" | null {
  if (!mealGlucide) return null;
  const food = getFoodById(mealGlucide);
  if (!food) return null;
  return food.categorie === "cereale" ? "cereale" : food.categorie === "legumineuse" ? "legumineuse" : null;
}
