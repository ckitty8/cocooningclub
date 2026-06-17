import type { UserProfile, WeekPlan, DayKey } from "./types";
import { calcCalorieStats, calcDayKcal, calcDuration } from "./calculations";
import { getFoodById } from "./foodData";
import { generatePDF } from "./generatePDF";
import { BarChart, Bar, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, Cell } from "recharts";

const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: "lundi", label: "Lundi", short: "Lun" },
  { key: "mardi", label: "Mardi", short: "Mar" },
  { key: "mercredi", label: "Mercredi", short: "Mer" },
  { key: "jeudi", label: "Jeudi", short: "Jeu" },
  { key: "vendredi", label: "Vendredi", short: "Ven" },
  { key: "samedi", label: "Samedi", short: "Sam" },
  { key: "dimanche", label: "Dimanche", short: "Dim" },
];

const fn = (id?: string) => id ? (getFoodById(id)?.nom ?? "—") : "—";

interface Props { profile: UserProfile; week: WeekPlan; onBack: () => void; }

export default function StepRecap({ profile, week, onBack }: Props) {
  const stats = calcCalorieStats(profile);
  const kgAPerdre = Math.max(0, profile.poidsActuel - profile.poidsObjectif);
  const semaines = calcDuration(profile.dateObjectif);

  const chartData = DAYS.map(d => ({ name: d.short, kcal: calcDayKcal(week[d.key]) }));

  const getBarColor = (kcal: number) =>
    kcal > stats.target + 200 ? "#EF4444" : kcal > stats.target ? "#F97316" : "#B89A7A";

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#B89A7A] font-bold mb-2">Récapitulatif complet</p>
          <h1 className="text-3xl font-display font-bold italic text-[#3D2B1F]">Plan de {profile.prenom}</h1>
          <p className="text-sm text-[#7A6352] mt-1">
            Objectif {profile.poidsObjectif} kg · {kgAPerdre} kg à perdre · {semaines} semaine{semaines > 1 ? "s" : ""}
          </p>
        </div>

        {/* Encadré règles */}
        <div className="bg-[#F0F0F0] border border-[#D9CEBF] rounded-xl p-5 mb-6">
          <p className="font-bold text-sm text-[#3D2B1F] mb-3">Rappels du plan</p>
          <ul className="text-xs text-[#555] space-y-1.5">
            <li>💧 Eau : 2,5 à 3 litres par jour (eau plate, tisanes, bouillon léger)</li>
            <li>🥦 Légumes autorisés UNIQUEMENT : Haricots verts · Brocolis · Carottes · Asperges · Radis</li>
            <li>🍰 Repas plaisir : 1 fois par semaine (samedi de préférence)</li>
            <li>⚠️ RÈGLE FONDAMENTALE : Légumineuse OU Céréale par repas — JAMAIS les deux ensemble</li>
            <li>🍫 Dessert du soir : 5 boules KitKat Ball OU 2 biscuits Delacre (alterner)</li>
          </ul>
        </div>

        {/* Stats calories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { l: "BMR", v: `${stats.bmr} kcal` },
            { l: "TDEE", v: `${stats.tdee} kcal` },
            { l: "Objectif/jour", v: `${stats.target} kcal`, hi: true },
            { l: "Perte/semaine", v: `≈ ${stats.estimatedWeeklyLoss} kg`, green: true },
          ].map(s => (
            <div key={s.l} className={`rounded-xl p-4 text-center border ${s.hi ? "bg-[#B89A7A] border-[#A0856A]" : "bg-white border-[#E8DDD4]"}`}>
              <p className={`text-xl font-bold ${s.hi ? "text-white" : s.green ? "text-green-600" : "text-[#3D2B1F]"}`}>{s.v}</p>
              <p className={`text-xs mt-1 ${s.hi ? "text-[#F5EFE9]" : "text-[#7A6352]"}`}>{s.l}</p>
            </div>
          ))}
        </div>

        {/* Graphique */}
        <div className="bg-white rounded-xl border border-[#E8DDD4] p-5 mb-6">
          <h2 className="font-display font-bold text-sm text-[#3D2B1F] mb-4">Calories par jour</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#7A6352" }} />
              <YAxis tick={{ fontSize: 11, fill: "#7A6352" }} domain={[0, stats.target + 400]} />
              <Tooltip formatter={(v) => [`${v} kcal`, "Calories"]} />
              <ReferenceLine y={stats.target} stroke="#B89A7A" strokeDasharray="4 2"
                label={{ value: "Objectif", position: "insideTopRight", fontSize: 10, fill: "#B89A7A" }} />
              <Bar dataKey="kcal" radius={[4, 4, 0, 0]}>
                {chartData.map((e, i) => <Cell key={i} fill={getBarColor(e.kcal)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tableau semaine */}
        <div className="bg-white rounded-xl border border-[#E8DDD4] overflow-hidden mb-6">
          <div className="bg-[#B89A7A] px-5 py-3">
            <h2 className="font-display font-bold text-white text-sm">Tableau de la semaine</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="bg-[#F5EFE9]">
                  <th className="text-left px-3 py-2 font-bold text-[#3D2B1F] w-28">Repas</th>
                  {DAYS.map(d => <th key={d.key} className="px-2 py-2 font-bold text-[#3D2B1F] text-center">{d.short}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { l: "PD Protéine", g: (d: DayKey) => fn(week[d].petitDej.proteine) },
                  { l: "PD Glucide", g: (d: DayKey) => fn(week[d].petitDej.glucide) },
                  { l: "Déj. Protéine", g: (d: DayKey) => fn(week[d].dejeuner.proteine) },
                  { l: "Déj. Glucide", g: (d: DayKey) => fn(week[d].dejeuner.glucide) },
                  { l: "Légume Déj.", g: (d: DayKey) => fn(week[d].dejeuner.legume) },
                  { l: "Dîner Protéine", g: (d: DayKey) => fn(week[d].diner.proteine) },
                  { l: "Dîner Glucide", g: (d: DayKey) => fn(week[d].diner.glucide) },
                  { l: "Légume Dîner", g: (d: DayKey) => fn(week[d].diner.legume) },
                  { l: "Dessert", g: (d: DayKey) => fn(week[d].diner.dessert) },
                  { l: "Total kcal/j", g: (d: DayKey) => `${calcDayKcal(week[d])}` },
                ].map((row, ri) => (
                  <tr key={row.l} className={ri % 2 === 0 ? "bg-white" : "bg-[#FAF8F5]"}>
                    <td className="px-3 py-2 font-semibold text-[#7A6352] border-r border-[#E8DDD4]">{row.l}</td>
                    {DAYS.map(d => {
                      const val = row.g(d.key);
                      const isKcal = row.l === "Total kcal/j";
                      const num = parseInt(val);
                      const color = isKcal
                        ? num > stats.target + 200 ? "text-red-600 font-bold"
                          : num > stats.target ? "text-orange-500 font-bold"
                          : num > 0 ? "text-green-600 font-bold" : "text-[#999]"
                        : "text-[#3D2B1F]";
                      return (
                        <td key={d.key} className={`px-2 py-2 text-center border-r border-[#F0EBE3] ${color}`}>
                          {val === "—" ? <span className="text-[#CCC]">—</span> : `${val}${isKcal && num > 0 ? " kcal" : ""}`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Détail par jour */}
        <div className="space-y-3 mb-8">
          <h2 className="font-display font-bold text-[#3D2B1F]">Détail par jour</h2>
          {DAYS.map(({ key, label }) => {
            const d = week[key];
            const kcal = calcDayKcal(d);
            const color = kcal > stats.target + 200 ? "text-red-600" : kcal > stats.target ? "text-orange-500" : kcal > 0 ? "text-green-600" : "text-[#999]";
            return (
              <div key={key} className="bg-white rounded-xl border border-[#E8DDD4] overflow-hidden">
                <div className="bg-[#F5EFE9] px-4 py-3 flex justify-between items-center">
                  <h3 className="font-bold text-[#3D2B1F]">{label}</h3>
                  <span className={`text-sm font-bold ${color}`}>{kcal > 0 ? `${kcal} kcal` : "Non planifié"}</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <span><span className="text-[#7A6352]">🌅 PD protéine : </span>{fn(d.petitDej.proteine)}</span>
                  <span><span className="text-[#7A6352]">🌅 PD glucide : </span>{fn(d.petitDej.glucide)}</span>
                  <span><span className="text-[#7A6352]">🍽️ Déj. protéine : </span>{fn(d.dejeuner.proteine)}</span>
                  <span><span className="text-[#7A6352]">🍽️ Déj. glucide : </span>{fn(d.dejeuner.glucide)}</span>
                  <span><span className="text-[#7A6352]">🥦 Légume déj. : </span>{fn(d.dejeuner.legume)}</span>
                  <span><span className="text-[#7A6352]">🌙 Dîner prot. : </span>{fn(d.diner.proteine)}</span>
                  <span><span className="text-[#7A6352]">🌙 Dîner glucide : </span>{fn(d.diner.glucide)}</span>
                  <span><span className="text-[#7A6352]">🍫 Dessert : </span>{fn(d.diner.dessert)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bilan */}
        <div className="bg-[#FDF6EE] border border-[#E8DDD4] rounded-xl p-5 mb-6">
          <p className="font-bold text-sm text-[#3D2B1F] mb-2">Bilan sur {semaines} semaine{semaines > 1 ? "s" : ""}</p>
          <p className="text-sm text-[#7A6352]">
            Déficit total estimé ≈ <strong className="text-[#3D2B1F]">{(stats.deficit * 7 * semaines).toLocaleString("fr-FR")} kcal</strong>
          </p>
          <p className="text-sm text-[#7A6352]">
            Perte totale estimée : <strong className="text-green-600">≈ {(stats.estimatedWeeklyLoss * semaines).toFixed(1)} kg</strong>
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={onBack}
            className="flex-1 py-4 rounded-full border-2 border-[#D9CEBF] text-[#7A6352] font-bold hover:bg-[#F5EFE9] transition-all">
            ← Modifier le plan
          </button>
          <button onClick={() => generatePDF(profile, week)}
            className="flex-1 py-4 rounded-full bg-[#3D2B1F] text-white font-bold hover:opacity-90 shadow-lg transition-all text-lg">
            🖨️ Télécharger le PDF
          </button>
        </div>

        <p className="text-center text-xs text-[#B89A7A] mt-4">
          PDF format A4 · Style Madame Protéine · Prêt à imprimer
        </p>
      </div>
    </div>
  );
}
