import { useState, useCallback } from "react";
import type { UserProfile, WeekPlan, DayKey, DayPlan, MealSelection } from "./types";
import { calcCalorieStats, calcDayKcal, glucideType } from "./calculations";
import { getFoodById } from "./foodData";
import FoodSelect from "./FoodSelect";

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "lundi", label: "Lundi", short: "Lun" },
  { key: "mardi", label: "Mardi", short: "Mar" },
  { key: "mercredi", label: "Mercredi", short: "Mer" },
  { key: "jeudi", label: "Jeudi", short: "Jeu" },
  { key: "vendredi", label: "Vendredi", short: "Ven" },
  { key: "samedi", label: "Samedi", short: "Sam" },
  { key: "dimanche", label: "Dimanche", short: "Dim" },
];

const emptyDay = (): DayPlan => ({
  petitDej: {}, collation1: {}, dejeuner: {},
  collation2: {}, diner: {}, collation3: {},
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

function MealCard({ title, icon, subtitle, kcal, children, optional, alert }:
  { title: string; icon: string; subtitle: string; kcal: number; children: React.ReactNode; optional?: boolean; alert?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8DDD4] overflow-hidden">
      <div className="bg-[#F5EFE9] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#3D2B1F] text-sm">{title}</h3>
              {optional && <span className="text-xs bg-[#E8DDD4] text-[#7A6352] px-2 py-0.5 rounded-full">optionnel</span>}
            </div>
            <p className="text-xs text-[#7A6352]">{subtitle}</p>
          </div>
        </div>
        {kcal > 0 && <span className="text-sm font-bold text-[#B89A7A]">{kcal} kcal</span>}
      </div>
      {alert && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 font-medium">
          {alert}
        </div>
      )}
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

export default function StepPlan({ profile, onBack, onNext }: Props) {
  const [activeDay, setActiveDay] = useState<DayKey>("lundi");
  const [week, setWeek] = useState<WeekPlan>(buildEmptyWeek);

  const stats = calcCalorieStats(profile);
  const target = stats.target;

  const updateMeal = useCallback((day: DayKey, meal: keyof DayPlan, field: keyof MealSelection, value: string) => {
    setWeek(prev => ({
      ...prev,
      [day]: { ...prev[day], [meal]: { ...prev[day][meal], [field]: value || undefined } },
    }));
  }, []);

  const day = week[activeDay];
  const kcal = calcDayKcal(day);
  const pct = Math.min(100, Math.round((kcal / target) * 100));
  const barColor = pct > 110 ? "bg-red-500" : pct > 97 ? "bg-orange-400" : "bg-[#B89A7A]";
  const textColor = pct > 110 ? "text-red-600" : pct > 97 ? "text-orange-500" : "text-[#3D2B1F]";

  const fkcal = (id?: string) => id ? (getFoodById(id)?.kcalPortion ?? 0) : 0;

  const pdKcal = fkcal(day.petitDej.proteine) + fkcal(day.petitDej.glucide);
  const col1Kcal = fkcal(day.collation1.proteine) + fkcal(day.collation1.extra);
  const dejKcal = fkcal(day.dejeuner.proteine) + fkcal(day.dejeuner.glucide) + fkcal(day.dejeuner.legume);
  const col2Kcal = fkcal(day.collation2.proteine);
  const dinKcal = fkcal(day.diner.proteine) + fkcal(day.diner.glucide) + fkcal(day.diner.legume) + fkcal(day.diner.dessert);
  const col3Kcal = fkcal(day.collation3.proteine) + fkcal(day.collation3.extra);

  const dejGlucideType = glucideType(day.dejeuner.glucide);
  const dinerGlucideLocked: "cereale" | "legumineuse" | null = dejGlucideType
    ? dejGlucideType === "cereale" ? "legumineuse" : "cereale"
    : null;

  const isSamedi = activeDay === "samedi";

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-6 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-sm text-[#7A6352] hover:text-[#B89A7A]">← Profil</button>
          <div className="text-center">
            <h1 className="text-xl font-display font-bold text-[#3D2B1F]">Plan de {profile.prenom}</h1>
            <p className="text-xs text-[#7A6352]">Objectif : {target} kcal/jour</p>
          </div>
          <button onClick={() => onNext(week)}
            className="text-sm bg-[#B89A7A] text-white px-4 py-2 rounded-full hover:opacity-90 font-bold">
            Récap →
          </button>
        </div>

        {/* Barre calories */}
        <div className="bg-white rounded-xl border border-[#E8DDD4] p-4 mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-[#3D2B1F]">Calories du jour</span>
            <span>
              <span className={`text-lg font-bold ${textColor}`}>{kcal}</span>
              <span className="text-sm text-[#7A6352]"> / {target} kcal</span>
            </span>
          </div>
          <div className="w-full h-3 bg-[#F0EBE3] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          {kcal > 0 && kcal < 900 && (
            <p className="text-xs text-red-500 font-bold mt-2">⚠️ Apport trop faible (&lt; 900 kcal) — risque pour la santé</p>
          )}
          {kcal > target + 200 && (
            <p className="text-xs text-orange-500 font-bold mt-2">⚠️ Dépassement de +200 kcal au-dessus de l'objectif</p>
          )}
        </div>

        {/* Onglets jours */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {DAYS.map(d => {
            const dk = calcDayKcal(week[d.key]);
            return (
              <button key={d.key} onClick={() => setActiveDay(d.key)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all min-w-[46px] ${activeDay === d.key
                  ? "bg-[#B89A7A] text-white shadow-sm" : "bg-white border border-[#E8DDD4] text-[#7A6352] hover:bg-[#F5EFE9]"}`}>
                <div>{d.short}</div>
                <div className={`text-xs mt-0.5 ${dk > 0 ? (activeDay === d.key ? "text-white/80" : "text-green-600") : "opacity-40"}`}>
                  {dk > 0 ? dk : "—"}
                </div>
              </button>
            );
          })}
        </div>

        {isSamedi && (
          <div className="mb-4 bg-pink-50 border border-pink-200 rounded-xl px-4 py-3 text-sm text-pink-700">
            🎉 <strong>C'est samedi !</strong> Tu as droit à ton repas plaisir cette semaine. Profites-en, tu le mérites !
          </div>
        )}

        <div className="space-y-4">

          {/* 1. Petit-déjeuner */}
          <MealCard title="① Petit-déjeuner" icon="🌅" subtitle="Protéines + Glucides" kcal={pdKcal}>
            <p className="text-xs text-[#7A6352] italic">Choisis 1 aliment dans chaque catégorie de nutriments</p>
            <FoodSelect label="• Protéines" category="petit_dej_proteine" value={day.petitDej.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "petitDej", "proteine", v)} />
            <FoodSelect label="• Glucides" category="petit_dej_glucide" value={day.petitDej.glucide}
              day={activeDay} onChange={v => updateMeal(activeDay, "petitDej", "glucide", v)} />
          </MealCard>

          {/* 2. Collation 10h */}
          <MealCard title="② Collation 10h" icon="🍏" subtitle="Barre · Galette + fromage frais · Yaourt + amandes" kcal={col1Kcal} optional>
            <FoodSelect label="• Aliment" category="gouter" value={day.collation1.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "collation1", "proteine", v)} />
          </MealCard>

          {/* 3. Déjeuner */}
          <MealCard title="③ Déjeuner" icon="🍽️" subtitle="Protéines + Glucides + Fibres-Vitamines" kcal={dejKcal}
            alert={dejGlucideType ? `Règle : ${dejGlucideType === "cereale" ? "Céréale" : "Légumineuse"} choisie au déjeuner → le dîner sera l'inverse automatiquement.` : undefined}>
            <p className="text-xs text-[#7A6352] italic">Choisis 1 aliment dans chaque catégorie de nutriments</p>
            <FoodSelect label="• Protéines (120-150g)" category="proteine_midi" value={day.dejeuner.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "dejeuner", "proteine", v)} />
            <FoodSelect label="• Fibres-Vitamines — Légumes (150-200g)" category="legume" value={day.dejeuner.legume}
              day={activeDay} onChange={v => updateMeal(activeDay, "dejeuner", "legume", v)} />
            <div>
              <p className="text-xs font-bold text-[#7A6352] uppercase tracking-wide mb-1">• Glucides — Céréale OU Légumineuse (pas les deux)</p>
              <div className="grid grid-cols-2 gap-2">
                <FoodSelect label="Céréale (100g cuits)" category="cereale" value={day.dejeuner.glucide}
                  day={activeDay} onChange={v => updateMeal(activeDay, "dejeuner", "glucide", v)} />
                <FoodSelect label="Légumineuse (130g)" category="legumineuse" value={day.dejeuner.glucide}
                  day={activeDay} onChange={v => updateMeal(activeDay, "dejeuner", "glucide", v)} />
              </div>
            </div>
          </MealCard>

          {/* 4. Collation 16h */}
          <MealCard title="④ Collation 16h" icon="🥛" subtitle="Barre de céréales obligatoire — évite les fringales du soir" kcal={col2Kcal}>
            <FoodSelect label="• Barre de céréales (~90 kcal)" category="gouter" value={day.collation2.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "collation2", "proteine", v)} />
          </MealCard>

          {/* 5. Dîner */}
          <MealCard title="⑤ Dîner" icon="🌙" subtitle="Protéines légères + Glucides + Fibres-Vitamines + Dessert" kcal={dinKcal}
            alert={dinerGlucideLocked ? `Règle alternance : choisir une ${dinerGlucideLocked === "cereale" ? "Céréale" : "Légumineuse"} ce soir.` : undefined}>
            <p className="text-xs text-[#7A6352] italic">Choisis 1 aliment dans chaque catégorie de nutriments</p>
            <FoodSelect label="• Protéines légères (100-130g)" category="proteine_soir" value={day.diner.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "diner", "proteine", v)} />
            <FoodSelect label="• Fibres-Vitamines — Légumes (150g)" category="legume" value={day.diner.legume}
              day={activeDay} onChange={v => updateMeal(activeDay, "diner", "legume", v)} />
            <div>
              <p className="text-xs font-bold text-[#7A6352] uppercase tracking-wide mb-1">• Glucides</p>
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
            <FoodSelect label="• Dessert du soir (alterner KitKat Ball / Delacre)" category="dessert" value={day.diner.dessert}
              day={activeDay} onChange={v => updateMeal(activeDay, "diner", "dessert", v)} />
          </MealCard>

          {/* 6. Collation soir */}
          <MealCard title="⑥ Collation soir" icon="🏃" subtitle="Si sport le soir — Yaourt sans lactose / Skyr + beurre de cacahuète" kcal={col3Kcal} optional>
            <FoodSelect label="• Yaourt / Skyr" category="gouter" value={day.collation3.proteine}
              day={activeDay} onChange={v => updateMeal(activeDay, "collation3", "proteine", v)} />
            <FoodSelect label="• Lipides (optionnel)" category="gouter" value={day.collation3.extra}
              day={activeDay} onChange={v => updateMeal(activeDay, "collation3", "extra", v)} />
          </MealCard>

        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onBack} className="flex-1 py-3 rounded-full border border-[#D9CEBF] text-[#7A6352] font-bold hover:bg-[#F5EFE9] transition-all">
            ← Retour
          </button>
          <button onClick={() => onNext(week)}
            className="flex-1 py-3 rounded-full bg-[#B89A7A] text-white font-bold hover:opacity-90 shadow-md transition-all">
            Voir le récapitulatif →
          </button>
        </div>
      </div>
    </div>
  );
}
