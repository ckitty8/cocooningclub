import { UserProfile, WeekPlan, DayKey } from "./types";
import { calcCalorieStats, calcDayKcal, calcDuration } from "./calculations";
import { getFoodById } from "./foodData";
import { generateMadameProteinePDF } from "./generatePDF";
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, Cell } from "recharts";

const DAYS: { key: DayKey; label: string }[] = [
  { key: "lundi", label: "Lun" }, { key: "mardi", label: "Mar" }, { key: "mercredi", label: "Mer" },
  { key: "jeudi", label: "Jeu" }, { key: "vendredi", label: "Ven" }, { key: "samedi", label: "Sam" },
  { key: "dimanche", label: "Dim" },
];

const fname = (id?: string) => id ? (getFoodById(id)?.nom ?? "—") : "—";
const fkcal = (id?: string) => id ? (getFoodById(id)?.kcalPortion ?? 0) : 0;

interface Props {
  profile: UserProfile;
  week: WeekPlan;
  onBack: () => void;
}

export default function StepRecap({ profile, week, onBack }: Props) {
  const stats = calcCalorieStats(profile);
  const kgAPerdre = Math.max(0, profile.poidsActuel - profile.poidsObjectif);
  const semaines = calcDuration(profile.dateObjectif);

  const chartData = DAYS.map(d => ({
    name: d.label,
    kcal: calcDayKcal(week[d.key]),
  }));

  const handlePDF = () => generateMadameProteinePDF(profile, week);

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-[#B89A7A] font-semibold mb-1">Récapitulatif</p>
          <h1 className="text-3xl font-bold text-[#3D2B1F]">Plan de {profile.prenom}</h1>
          <p className="text-sm text-[#7A6352]">Objectif : {profile.poidsObjectif} kg · {kgAPerdre} kg à perdre · {semaines} semaine{semaines > 1 ? "s" : ""}</p>
        </div>

        {/* Encadré règles */}
        <div className="bg-[#F0F0F0] rounded-xl p-5 mb-6 border border-[#D9CEBF]">
          <p className="font-bold text-sm text-[#3D2B1F] mb-2">Rappels importants</p>
          <ul className="text-xs text-[#555] space-y-1">
            <li>💧 Eau : 2,5 à 3 litres par jour (eau plate, tisanes, bouillon léger)</li>
            <li>🥦 Légumes autorisés UNIQUEMENT : Haricots verts · Brocolis · Carottes · Asperges · Radis</li>
            <li>🍰 Repas plaisir : 1 fois par semaine (samedi de préférence)</li>
            <li>⚠️ RÈGLE : Légumineuse OU Céréale par repas — jamais les deux ensemble</li>
          </ul>
        </div>

        {/* Stats calorie */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "BMR", val: `${stats.bmr} kcal` },
            { label: "TDEE", val: `${stats.tdee} kcal` },
            { label: "Objectif/j", val: `${stats.target} kcal`, highlight: true },
            { label: "Perte/sem", val: `≈ ${stats.estimatedWeeklyLoss} kg` },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 text-center border ${s.highlight ? "bg-[#B89A7A] border-[#A0856A]" : "bg-white border-[#E8DDD4]"}`}>
              <p className={`text-lg font-bold ${s.highlight ? "text-white" : "text-[#3D2B1F]"}`}>{s.val}</p>
              <p className={`text-xs mt-1 ${s.highlight ? "text-[#F5EFE9]" : "text-[#7A6352]"}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Graphique progression */}
        <div className="bg-white rounded-xl border border-[#E8DDD4] p-5 mb-6">
          <h2 className="font-bold text-sm text-[#3D2B1F] mb-4">Calories par jour</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#7A6352" }} />
              <YAxis tick={{ fontSize: 11, fill: "#7A6352" }} domain={[0, stats.target + 400]} />
              <Tooltip formatter={(v: number) => [`${v} kcal`, "Calories"]} />
              <ReferenceLine y={stats.target} stroke="#B89A7A" strokeDasharray="4 2" label={{ value: "Objectif", position: "insideTopRight", fontSize: 10, fill: "#B89A7A" }} />
              <Bar dataKey="kcal" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.kcal > stats.target + 200 ? "#EF4444" : entry.kcal > stats.target ? "#F97316" : "#B89A7A"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tableau semaine */}
        <div className="bg-white rounded-xl border border-[#E8DDD4] overflow-hidden mb-6">
          <div className="bg-[#B89A7A] px-5 py-3">
            <h2 className="font-bold text-white text-sm">Tableau de la semaine</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F5EFE9]">
                  <th className="text-left px-3 py-2 font-bold text-[#3D2B1F] w-24">Repas</th>
                  {DAYS.map(d => <th key={d.key} className="px-2 py-2 font-bold text-[#3D2B1F] text-center">{d.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Petit-déj", fn: (d: DayKey) => fname(week[d].petitDej.proteine) },
                  { label: "Glucide PD", fn: (d: DayKey) => fname(week[d].petitDej.glucide) },
                  { label: "Déjeuner", fn: (d: DayKey) => fname(week[d].dejeuner.proteine) },
                  { label: "Glucide Dej", fn: (d: DayKey) => fname(week[d].dejeuner.glucide) },
                  { label: "Légume Dej", fn: (d: DayKey) => fname(week[d].dejeuner.legume) },
                  { label: "Dîner", fn: (d: DayKey) => fname(week[d].diner.proteine) },
                  { label: "Légume Din", fn: (d: DayKey) => fname(week[d].diner.legume) },
                  { label: "Dessert", fn: (d: DayKey) => fname(week[d].diner.dessert) },
                  { label: "Total kcal", fn: (d: DayKey) => `${calcDayKcal(week[d])}` },
                ].map((row, ri) => (
                  <tr key={row.label} className={ri % 2 === 0 ? "bg-white" : "bg-[#FAF8F5]"}>
                    <td className="px-3 py-2 font-semibold text-[#7A6352] border-r border-[#E8DDD4]">{row.label}</td>
                    {DAYS.map(d => {
                      const val = row.fn(d.key);
                      const isKcal = row.label === "Total kcal";
                      const kcalNum = isKcal ? parseInt(val) : 0;
                      const color = isKcal
                        ? kcalNum > stats.target + 200 ? "text-red-600 font-bold"
                        : kcalNum > stats.target ? "text-orange-500 font-bold"
                        : kcalNum > 0 ? "text-green-600 font-bold" : "text-[#999]"
                        : "text-[#3D2B1F]";
                      return (
                        <td key={d.key} className={`px-2 py-2 text-center border-r border-[#F0EBE3] ${color}`}>
                          {val === "—" ? <span className="text-[#CCC]">—</span> : val}
                          {isKcal && kcalNum > 0 ? " kcal" : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plan détaillé par jour */}
        <div className="space-y-4 mb-8">
          {DAYS.map(({ key, label }) => {
            const d = week[key];
            const kcal = calcDayKcal(d);
            return (
              <div key={key} className="bg-white rounded-xl border border-[#E8DDD4] overflow-hidden">
                <div className="bg-[#F5EFE9] px-4 py-3 flex justify-between items-center">
                  <h3 className="font-bold text-[#3D2B1F]">{label}</h3>
                  <span className={`text-sm font-bold ${kcal > stats.target + 200 ? "text-red-600" : kcal > stats.target ? "text-orange-500" : kcal > 0 ? "text-green-600" : "text-[#999]"}`}>
                    {kcal > 0 ? `${kcal} kcal` : "Non planifié"}
                  </span>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <div><span className="text-[#7A6352]">🌅 PD protéine : </span><span className="text-[#3D2B1F]">{fname(d.petitDej.proteine)}</span></div>
                  <div><span className="text-[#7A6352]">🌅 PD glucide : </span><span className="text-[#3D2B1F]">{fname(d.petitDej.glucide)}</span></div>
                  <div><span className="text-[#7A6352]">🍽️ Dej protéine : </span><span className="text-[#3D2B1F]">{fname(d.dejeuner.proteine)}</span></div>
                  <div><span className="text-[#7A6352]">🍽️ Dej glucide : </span><span className="text-[#3D2B1F]">{fname(d.dejeuner.glucide)}</span></div>
                  <div><span className="text-[#7A6352]">🥦 Légume : </span><span className="text-[#3D2B1F]">{fname(d.dejeuner.legume)}</span></div>
                  <div><span className="text-[#7A6352]">🌙 Dîner : </span><span className="text-[#3D2B1F]">{fname(d.diner.proteine)}</span></div>
                  <div><span className="text-[#7A6352]">🌙 Soir glucide : </span><span className="text-[#3D2B1F]">{fname(d.diner.glucide)}</span></div>
                  <div><span className="text-[#7A6352]">🍫 Dessert : </span><span className="text-[#3D2B1F]">{fname(d.diner.dessert)}</span></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={onBack} className="flex-1 py-4 rounded-xl border-2 border-[#D9CEBF] text-[#7A6352] font-semibold hover:bg-[#F5EFE9] transition-all">
            ← Modifier le plan
          </button>
          <button onClick={handlePDF}
            className="flex-1 py-4 rounded-xl bg-[#3D2B1F] text-white font-bold hover:bg-[#2A1D14] shadow-lg transition-all text-lg">
            🖨️ Télécharger le PDF
          </button>
        </div>

        <p className="text-center text-xs text-[#B89A7A] mt-4">
          Le PDF sera généré au format A4 dans le style Madame Protéine, prêt à imprimer.
        </p>
      </div>
    </div>
  );
}
