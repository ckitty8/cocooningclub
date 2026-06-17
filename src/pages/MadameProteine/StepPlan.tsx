import { useState, useCallback } from "react";
import { UserProfile, WeekPlan, DayKey, DayPlan, MealSelection } from "./types";
import { calcCalorieStats, calcDayKcal, glucideTypeForMeal } from "./calculations";
import { getFoodById } from "./foodData";
import { FoodSelect, MealCard } from "./MealSelect";

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "lundi", label: "Lundi", short: "Lun" },
  { key: "mardi", label: "Mardi", short: "Mar" },
  { key: "mercredi", label: "Mercredi", short: "Mer" },
  { key: "jeudi", label: "Jeudi", short: "Jeu" },
  { key: "vendredi", label: "Vendredi", short: "Ven" },
  { key: "samedi", label: "Samedi", short: "Sam" },
  { key: "dimanche", label: "Dimanche", short: "Dim" },
];

const emptyMeal = (): MealSelection => ({});

const emptyDay = (): DayPlan => ({
  petitDej: emptyMeal(),
  collation1: emptyMeal(),
  dejeuner: emptyMeal(),
  collation2: emptyMeal(),
  diner: emptyMeal(),
  collation3: emptyMeal(),
});

const buildEmptyWeek = (): WeekPlan => ({
  lundi: emptyDay(), mardi: emptyDay(), mercredi: emptyDay(),
  jeudi: emptyDay(), vendredi: emptyDay(), samedi: emptyDay(), dimanche: emptyDay(),
});

interface Props {
  profile: UserProfile;
  onBack: () => void;
  onNext: (plan: WeekPlan) => void;
}

export default function StepPlan({ profile, onBack, onNext }: Props) {
  const [activeDay, setActiveDay] = useState<DayKey>("lundi");
  const [week, setWeek] = useState<WeekPlan>(buildEmptyWeek);

  const stats = calcCalorieStats(profile);
  const target = stats.target;

  const updateMeal = useCallback((day: DayKey, meal: keyof DayPlan, field: keyof MealSelection, value: string) => {
    setWeek(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [meal]: { ...prev[day][meal], [field]: value || undefined },
      },
    }));
  }, []);

  const day = week[activeDay];
  const kcal = calcDayKcal(day);
  const pct = Math.min(100, Math.round((kcal / target) * 100));
  const barColor = pct > 110 ? "bg-red-500" : pct > 95 ? "bg-orange-400" : "bg-green-500";
  const textColor = pct > 110 ? "text-red-600" : pct > 95 ? "text-orange-500" : "text-green-600";

  // Glucide alternation rule
  const dejGlucideType = glucideTypeForMeal(day.dejeuner.glucide);
  const dinerGlucideLocked = dejGlucideType
    ? dejGlucideType === "cereale" ? "legumineuse" : "cereale"
    : null;

  const isSamedi = activeDay === "samedi";

  const kcalFood = (id?: string) => id ? (getFoodById(id)?.kcalPortion ?? 0) : 0;

  const pdKcal = kcalFood(day.petitDej.proteine) + kcalFood(day.petitDej.glucide);
  const col1Kcal = kcalFood(day.collation1.proteine) + (day.collation1.items ?? []).reduce((s, i) => s + kcalFood(i), 0);
  const dejKcal = kcalFood(day.dejeuner.proteine) + kcalFood(day.dejeuner.glucide) + kcalFood(day.dejeuner.legume);
  const col2Kcal = kcalFood(day.collation2.proteine) + (day.collation2.items ?? []).reduce((s, i) => s + kcalFood(i), 0);
  const dinKcal = kcalFood(day.diner.proteine) + kcalFood(day.diner.glucide) + kcalFood(day.diner.legume) + kcalFood(day.diner.dessert);
  const col3Kcal = kcalFood(day.collation3.proteine) + (day.collation3.items ?? []).reduce((s, i) => s + kcalFood(i), 0);

  const allDaysComplete = DAYS.every(d => {
    const dk = calcDayKcal(week[d.key]);
    return dk >= 900;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-6 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-sm text-[#7A6352] hover:text-[#B89A7A] flex items-center gap-1">
            ← Modifier le profil
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#3D2B1F]">Plan de {profile.prenom}</h1>
            <p className="text-xs text-[#7A6352]">Objectif : {target} kcal/jour</p>
          </div>
          <button
            onClick={() => onNext(week)}
            className="text-sm bg-[#B89A7A] text-white px-4 py-2 rounded-lg hover:bg-[#A0856A] font-semibold">
            Voir le récap →
          </button>
        </div>

        {/* Barre calories */}
        <div className="bg-white rounded-xl border border-[#E8DDD4] p-4 mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-[#3D2B1F]">Calories du jour</span>
            <div className="text-right">
              <span className={`text-lg font-bold ${textColor}`}>{kcal}</span>
              <span className="text-sm text-[#7A6352]"> / {target} kcal</span>
            </div>
          </div>
          <div className="w-full h-3 bg-[#F0EBE3] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-[#7A6352] mt-1">
            <span>0</span>
            <span className={textColor}>{pct}% de l'objectif</span>
            <span>{target}</span>
          </div>
          {kcal < 900 && kcal > 0 && (
            <p className="text-xs text-red-500 font-semibold mt-2">⚠️ Apport trop faible (&lt; 900 kcal) — risque pour la santé</p>
          )}
          {kcal > target + 200 && (
            <p className="text-xs text-orange-500 font-semibold mt-2">⚠️ Dépassement de l'objectif de plus de 200 kcal</p>
          )}
        </div>

        {/* Onglets jours */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {DAYS.map(d => {
            const dk = calcDayKcal(week[d.key]);
            const done = dk >= 900;
            return (
              <button key={d.key}
                onClick={() => setActiveDay(d.key)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${activeDay === d.key
                  ? "bg-[#B89A7A] text-white shadow-sm"
                  : "bg-white border border-[#E8DDD4] text-[#7A6352] hover:bg-[#F5EFE9]"}`}>
                <div>{d.short}</div>
                <div className={`text-xs mt-0.5 ${done ? "text-green-400" : "opacity-60"}`}>
                  {dk > 0 ? `${dk}` : "—"}
                </div>
              </button>
            );
          })}
        </div>

        {isSamedi && (
          <div className="mb-4 bg-pink-50 border border-pink-200 rounded-xl px-4 py-3 text-sm text-pink-700 font-medium">
            🎉 C'est samedi ! Tu as droit à ton <strong>repas plaisir</strong> cette semaine. Profites-en, tu le mérites !
          </div>
        )}

        <div className="space-y-4">
          {/* 1. PETIT-DÉJEUNER */}
          <MealCard title="Petit-déjeuner" icon="🌅" subtitle="Protéines + Glucides" kcal={pdKcal}>
            <p className="text-xs text-[#7A6352] italic mb-2">Choisis 1 aliment dans chaque catégorie</p>
            <FoodSelect label="• Protéines" category="petit_dej_proteine" value={day.petitDej.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "petitDej", "proteine", v)} />
            <FoodSelect label="• Glucides" category="petit_dej_glucide" value={day.petitDej.glucide}
              day={activeDay} onChange={v => updateMeal(activeDay, "petitDej", "glucide", v)} />
          </MealCard>

          {/* 2. COLLATION 10h */}
          <MealCard title="Collation 10h" icon="🍎" subtitle="Non obligatoire" kcal={col1Kcal} optional>
            <FoodSelect label="• Aliment" category="gouter" value={day.collation1.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "collation1", "proteine", v)} />
          </MealCard>

          {/* 3. DÉJEUNER */}
          <MealCard title="Déjeuner" icon="🍽️" subtitle="Protéines + Glucides + Légumes" kcal={dejKcal}
            highlight={dejGlucideType ? `Règle : tu as choisi une ${dejGlucideType === "cereale" ? "céréale" : "légumineuse"} au déjeuner → le dîner devra être l'inverse.` : undefined}>
            <p className="text-xs text-[#7A6352] italic mb-2">Choisis 1 aliment dans chaque catégorie</p>
            <FoodSelect label="• Protéines (120-150g)" category="proteine_midi" value={day.dejeuner.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "dejeuner", "proteine", v)} />
            <FoodSelect label="• Légumes autorisés (150-200g)" category="legume" value={day.dejeuner.legume}
              day={activeDay} onChange={v => updateMeal(activeDay, "dejeuner", "legume", v)} />
            <div>
              <p className="text-xs font-semibold text-[#7A6352] uppercase tracking-wide mb-1">• Glucides — Céréale OU Légumineuse</p>
              <div className="grid grid-cols-2 gap-2">
                <FoodSelect label="Céréale (100g cuits)" category="cereale" value={day.dejeuner.glucide?.startsWith("riz") || day.dejeuner.glucide === "quinoa" || day.dejeuner.glucide === "boulgour" || day.dejeuner.glucide === "ble" || day.dejeuner.glucide === "patate_douce" ? day.dejeuner.glucide : undefined}
                  day={activeDay} onChange={v => updateMeal(activeDay, "dejeuner", "glucide", v)} />
                <FoodSelect label="Légumineuse (130g)" category="legumineuse" value={["lentilles","pois_chiches","haricots_rouges","pois_casses","feves","petits_pois","edamame","haricots_blancs","houmous"].includes(day.dejeuner.glucide ?? "") ? day.dejeuner.glucide : undefined}
                  day={activeDay} onChange={v => updateMeal(activeDay, "dejeuner", "glucide", v)} />
              </div>
            </div>
          </MealCard>

          {/* 4. COLLATION 16h */}
          <MealCard title="Collation 16h" icon="🥛" subtitle="Barre de céréales OBLIGATOIRE" kcal={col2Kcal}>
            <FoodSelect label="• Barre de céréales (90 kcal)" category="gouter" value={day.collation2.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "collation2", "proteine", v)} />
          </MealCard>

          {/* 5. DÎNER */}
          <MealCard title="Dîner" icon="🌙" subtitle="Protéines légères + Glucides + Légumes + Dessert" kcal={dinKcal}
            highlight={dinerGlucideLocked ? `Règle alternance : choisir une ${dinerGlucideLocked === "cereale" ? "céréale" : "légumineuse"} ce soir.` : undefined}>
            <p className="text-xs text-[#7A6352] italic mb-2">Choisis 1 aliment dans chaque catégorie</p>
            <FoodSelect label="• Protéines légères (100-130g)" category="proteine_soir" value={day.diner.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "diner", "proteine", v)} />
            <FoodSelect label="• Légumes autorisés (150g)" category="legume" value={day.diner.legume}
              day={activeDay} onChange={v => updateMeal(activeDay, "diner", "legume", v)} />
            <div>
              <p className="text-xs font-semibold text-[#7A6352] uppercase tracking-wide mb-1">• Glucides</p>
              {dinerGlucideLocked === "cereale" ? (
                <FoodSelect label="Céréale (100g cuits)" category="cereale" value={day.diner.glucide}
                  day={activeDay} onChange={v => updateMeal(activeDay, "diner", "glucide", v)} />
              ) : dinerGlucideLocked === "legumineuse" ? (
                <FoodSelect label="Légumineuse (120g)" category="legumineuse" value={day.diner.glucide}
                  day={activeDay} onChange={v => updateMeal(activeDay, "diner", "glucide", v)} />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <FoodSelect label="Céréale (100g cuits)" category="cereale" value={day.diner.glucide}
                    day={activeDay} onChange={v => updateMeal(activeDay, "diner", "glucide", v)} />
                  <FoodSelect label="Légumineuse (120g)" category="legumineuse" value={day.diner.glucide}
                    day={activeDay} onChange={v => updateMeal(activeDay, "diner", "glucide", v)} />
                </div>
              )}
            </div>
            <FoodSelect label="• Dessert du soir" category="dessert" value={day.diner.dessert}
              day={activeDay} onChange={v => updateMeal(activeDay, "diner", "dessert", v)} />
          </MealCard>

          {/* 6. COLLATION SOIR (optionnelle sport) */}
          <MealCard title="Collation soir" icon="🏃" subtitle="Si sport le soir" kcal={col3Kcal} optional>
            <FoodSelect label="• Yaourt sans lactose / Skyr" category="gouter" value={day.collation3.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "collation3", "proteine", v)} />
          </MealCard>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-[#D9CEBF] text-[#7A6352] font-semibold hover:bg-[#F5EFE9]">
            ← Retour
          </button>
          <button onClick={() => onNext(week)}
            className="flex-1 py-3 rounded-xl bg-[#B89A7A] text-white font-bold hover:bg-[#A0856A] shadow-md">
            Voir le récapitulatif →
          </button>
        </div>

        {!allDaysComplete && (
          <p className="text-center text-xs text-[#7A6352] mt-3">
            💡 Tu peux accéder au récap à tout moment, même si tous les jours ne sont pas complétés.
          </p>
        )}
      </div>
    </div>
  );
}
