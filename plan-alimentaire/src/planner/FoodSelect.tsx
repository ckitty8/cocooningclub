import type { Food } from "./types";
import { getFoodsByCategory } from "./foodData";

interface Props {
  label: string;
  category: Food["categorie"];
  value: string | undefined;
  day: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export default function FoodSelect({ label, category, value, day, onChange, disabled, disabledReason }: Props) {
  const options = getFoodsByCategory(category, day);

  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-[#7A6352] uppercase tracking-wide">{label}</label>
      {disabled ? (
        <div className="w-full border border-dashed border-[#D9CEBF] rounded-lg px-3 py-2 text-xs text-[#B89A7A] bg-[#FAF8F5] italic">
          {disabledReason ?? "Non disponible ce jour"}
        </div>
      ) : (
        <select value={value ?? ""} onChange={e => onChange(e.target.value)}
          className="w-full border border-[#D9CEBF] rounded-lg px-3 py-2 text-sm text-[#3D2B1F] bg-white focus:outline-none focus:ring-2 focus:ring-[#B89A7A] cursor-pointer">
          <option value="">— Choisir —</option>
          {options.map(f => (
            <option key={f.id} value={f.id}>{f.nom} · {f.kcalPortion} kcal</option>
          ))}
        </select>
      )}
    </div>
  );
}
