import { Food } from "./types";
import { getFoodsByCategory } from "./foodData";

interface FoodSelectProps {
  label: string;
  category: Food["categorie"];
  value: string | undefined;
  day: string;
  onChange: (id: string) => void;
  excludeIds?: string[];
  disabled?: boolean;
  disabledReason?: string;
}

export function FoodSelect({ label, category, value, day, onChange, excludeIds = [], disabled, disabledReason }: FoodSelectProps) {
  const options = getFoodsByCategory(category, day).filter(f => !excludeIds.includes(f.id) || f.id === value);

  if (disabled) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-semibold text-[#7A6352] uppercase tracking-wide">{label}</label>
        <div className="w-full border border-dashed border-[#D9CEBF] rounded-lg px-3 py-2 text-xs text-[#B89A7A] bg-[#FAF8F5] italic">
          {disabledReason ?? "Non disponible"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[#7A6352] uppercase tracking-wide">{label}</label>
      <select
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-[#D9CEBF] rounded-lg px-3 py-2 text-sm text-[#3D2B1F] bg-white focus:outline-none focus:ring-2 focus:ring-[#B89A7A] cursor-pointer"
      >
        <option value="">— Choisir —</option>
        {options.map(f => (
          <option key={f.id} value={f.id}>
            {f.nom} · {f.kcalPortion} kcal
          </option>
        ))}
      </select>
    </div>
  );
}

interface MealCardProps {
  title: string;
  icon: string;
  subtitle?: string;
  kcal: number;
  children: React.ReactNode;
  optional?: boolean;
  highlight?: string;
}

export function MealCard({ title, icon, subtitle, kcal, children, optional, highlight }: MealCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#E8DDD4] overflow-hidden">
      <div className="bg-[#F5EFE9] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <h3 className="font-bold text-[#3D2B1F] text-sm">{title}</h3>
            {subtitle && <p className="text-xs text-[#7A6352]">{subtitle}</p>}
          </div>
          {optional && <span className="ml-2 text-xs bg-[#E8DDD4] text-[#7A6352] px-2 py-0.5 rounded-full">optionnel</span>}
        </div>
        {kcal > 0 && (
          <span className="text-sm font-bold text-[#B89A7A]">{kcal} kcal</span>
        )}
      </div>
      {highlight && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-700 font-medium">
          {highlight}
        </div>
      )}
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}
