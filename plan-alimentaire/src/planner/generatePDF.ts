import jsPDF from "jspdf";
import type { UserProfile, WeekPlan, DayKey } from "./types";
import { getFoodById } from "./foodData";
import { calcCalorieStats, calcDayKcal, calcDuration } from "./calculations";

const DAYS: DayKey[] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const DAY_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const fn = (id?: string) => id ? (getFoodById(id)?.nom ?? "—") : "—";
const fk = (id?: string) => id ? (getFoodById(id)?.kcalPortion ?? 0) : 0;

export function generatePDF(profile: UserProfile, week: WeekPlan) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const M = 22;
  const CW = W - M * 2;
  const stats = calcCalorieStats(profile);
  const kgAPerdre = Math.max(0, profile.poidsActuel - profile.poidsObjectif);
  const semaines = calcDuration(profile.dateObjectif);

  let y = M;

  const newPage = () => { doc.addPage(); y = M; };
  const need = (h: number) => { if (y + h > 282) newPage(); };

  const fillRect = (rx: number, ry: number, rw: number, rh: number, color: string, round = 2) => {
    doc.setFillColor(color);
    doc.roundedRect(rx, ry, rw, rh, round, round, "F");
  };

  const T = (t: string | string[], x: number, ty: number, size = 9, bold = false, color = "#2D2014", align: "left" | "center" | "right" = "left") => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(color);
    const str = Array.isArray(t) ? t.join(" ") : t;
    doc.text(str, x, ty, { align });
  };

  // PAGE 1 — EN-TÊTE
  fillRect(M, y, CW, 30, "#F5EFE9");
  T("PLAN ALIMENTAIRE", W / 2, y + 10, 20, true, "#3D2B1F", "center");
  T(`de ${profile.prenom.toUpperCase()}`, W / 2, y + 18, 14, true, "#B89A7A", "center");
  T(`Objectif ${profile.poidsObjectif} kg · ${kgAPerdre} kg à perdre · ${semaines} semaine${semaines > 1 ? "s" : ""}`, W / 2, y + 25, 8, false, "#7A6352", "center");
  y += 36;

  fillRect(M, y, CW, 40, "#F0F0F0");
  doc.setDrawColor("#CCCCCC"); doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CW, 40, 2, 2, "S");
  T("RÈGLES DU PLAN", M + 4, y + 7, 8, true, "#444");
  [
    "• Eau : 2,5 à 3 litres par jour (eau plate, tisanes, bouillon).",
    "• Légumes AUTORISÉS UNIQUEMENT : Haricots verts · Brocolis · Carottes · Asperges · Radis",
    "• SANS fruit. Repas plaisir : 1 fois par semaine (samedi de préférence).",
    "• RÈGLE FONDAMENTALE : Légumineuse OU Céréale par repas — JAMAIS les deux ensemble.",
    "• Dessert du soir : 5 boules KitKat Ball OU 2 biscuits Delacre (alterner chaque soir).",
  ].forEach((r, i) => T(r, M + 4, y + 14 + i * 5.5, 7.5, false, "#333"));
  y += 46;

  fillRect(M, y, CW, 16, "#FDF6EE");
  const imc = (profile.poidsActuel / ((profile.taille / 100) ** 2)).toFixed(1);
  T(`IMC : ${imc}`, M + 4, y + 6, 8, false, "#555");
  T(`BMR : ${stats.bmr} kcal`, M + 40, y + 6, 8, false, "#555");
  T(`TDEE : ${stats.tdee} kcal`, M + 80, y + 6, 8, false, "#555");
  T(`Déficit : −${stats.deficit} kcal/j`, M + 4, y + 13, 8, false, "#555");
  T(`Objectif : ${stats.target} kcal/j`, M + 50, y + 13, 8.5, true, "#B89A7A");
  T(`Perte ≈ ${stats.estimatedWeeklyLoss} kg/sem`, M + 110, y + 13, 8, false, "#2D8A2D");
  y += 22;

  const mon = week.lundi;

  const sections: { title: string; subtitle: string; lines: string[] }[] = [
    {
      title: "① PETIT-DÉJEUNER",
      subtitle: "Protéines + Glucides",
      lines: [
        `• Protéines : ${fn(mon.petitDej.proteine)}${mon.petitDej.proteine ? ` — ${fk(mon.petitDej.proteine)} kcal` : ""}`,
        `• Glucides : ${fn(mon.petitDej.glucide)}${mon.petitDej.glucide ? ` — ${fk(mon.petitDej.glucide)} kcal` : ""}`,
      ],
    },
    {
      title: "② COLLATION 10H (optionnelle)",
      subtitle: "Barre de céréales · Galette + fromage frais · Yaourt + amandes",
      lines: [`• ${fn(mon.collation1.proteine)}`],
    },
    {
      title: "③ DÉJEUNER",
      subtitle: "Protéines + Glucides + Fibres-Vitamines",
      lines: [
        `• Protéines : ${fn(mon.dejeuner.proteine)}${mon.dejeuner.proteine ? ` — ${fk(mon.dejeuner.proteine)} kcal` : ""}`,
        `• Glucides : ${fn(mon.dejeuner.glucide)}${mon.dejeuner.glucide ? ` — ${fk(mon.dejeuner.glucide)} kcal` : ""}`,
        `• Fibres-Vitamines (Légumes) : ${fn(mon.dejeuner.legume)}${mon.dejeuner.legume ? ` — ${fk(mon.dejeuner.legume)} kcal` : ""}`,
      ],
    },
    {
      title: "④ COLLATION 16H — OBLIGATOIRE",
      subtitle: "1 barre de céréales ~90 kcal — évite les fringales du soir",
      lines: [`• Barre de céréales (25g) — ${fk(mon.collation2.proteine) || 90} kcal`],
    },
    {
      title: "⑤ DÎNER",
      subtitle: "Protéines légères + Glucides + Fibres-Vitamines + Dessert",
      lines: [
        `• Protéines : ${fn(mon.diner.proteine)}${mon.diner.proteine ? ` — ${fk(mon.diner.proteine)} kcal` : ""}`,
        `• Glucides : ${fn(mon.diner.glucide)}${mon.diner.glucide ? ` — ${fk(mon.diner.glucide)} kcal` : ""}`,
        `• Fibres-Vitamines (Légumes) : ${fn(mon.diner.legume)}${mon.diner.legume ? ` — ${fk(mon.diner.legume)} kcal` : ""}`,
        `• Dessert : ${fn(mon.diner.dessert)}${mon.diner.dessert ? ` — ${fk(mon.diner.dessert)} kcal` : ""}`,
      ],
    },
    {
      title: "⑥ COLLATION SOIR (si sport le soir)",
      subtitle: "1 yaourt sans lactose ou skyr + 15g beurre de cacahuète",
      lines: [`• ${fn(mon.collation3.proteine)}`],
    },
  ];

  sections.forEach(s => {
    const h = 9 + s.lines.length * 6;
    need(h + 5);
    fillRect(M, y, CW, h, "#F0F0F0");
    T(s.title, M + 4, y + 6.5, 9, true, "#3D2B1F");
    T(s.subtitle, M + CW - 4, y + 6.5, 7, false, "#7A6352", "right");
    s.lines.forEach((l, i) => T(l, M + 5, y + 13 + i * 6, 8, false, "#333"));
    y += h + 4;
  });

  // PAGE 2 — TABLEAU SEMAINE
  newPage();
  T("TABLEAU — SEMAINE TYPE", W / 2, y, 14, true, "#3D2B1F", "center");
  y += 9;

  const colW = CW / 7;

  fillRect(M, y, CW, 9, "#B89A7A");
  DAY_FR.forEach((d, i) => T(d, M + i * colW + colW / 2, y + 6.5, 7.5, true, "#FFFFFF", "center"));
  y += 9;

  const rows: { label: string; get: (d: DayKey) => string }[] = [
    { label: "PD Protéine", get: d => fn(week[d].petitDej.proteine) },
    { label: "PD Glucide", get: d => fn(week[d].petitDej.glucide) },
    { label: "Déj. Protéine", get: d => fn(week[d].dejeuner.proteine) },
    { label: "Déj. Glucide", get: d => fn(week[d].dejeuner.glucide) },
    { label: "Légume Déj.", get: d => fn(week[d].dejeuner.legume) },
    { label: "Dîner Protéine", get: d => fn(week[d].diner.proteine) },
    { label: "Dîner Glucide", get: d => fn(week[d].diner.glucide) },
    { label: "Légume Dîner", get: d => fn(week[d].diner.legume) },
    { label: "Dessert", get: d => fn(week[d].diner.dessert) },
    { label: "Total kcal/j", get: d => `${calcDayKcal(week[d])} kcal` },
  ];

  rows.forEach((row, ri) => {
    const rh = 11;
    need(rh);
    fillRect(M, y, CW, rh, ri % 2 === 0 ? "#FAF8F5" : "#F0F0F0");
    T(row.label, M + 2, y + 7.5, 6.5, ri === rows.length - 1, "#555");
    DAYS.forEach((dk, i) => {
      const val = row.get(dk);
      const isKcal = row.label === "Total kcal/j";
      const color = isKcal && parseInt(val) > stats.target + 200 ? "#D00"
        : isKcal && parseInt(val) > stats.target ? "#D06000"
        : isKcal && parseInt(val) > 0 ? "#1A7A1A"
        : "#333";
      const truncated = doc.splitTextToSize(val, colW - 2)[0] ?? "—";
      T(truncated, M + i * colW + colW / 2, y + 7.5, 6, isKcal, color, "center");
    });
    y += rh;
  });

  y += 8;

  need(22);
  doc.setDrawColor("#E5A000"); doc.setLineWidth(0.5);
  fillRect(M, y, CW, 20, "#FFF8E7");
  doc.roundedRect(M, y, CW, 20, 2, 2, "S");
  T("⚠  RÈGLE FONDAMENTALE — GLUCIDES", M + 4, y + 7, 9, true, "#8A5C00");
  T("Légumineuse OU Céréale par repas — JAMAIS les deux ensemble dans le même repas.", M + 4, y + 13.5, 8, false, "#5A3C00");
  T("Si légumineuse au déjeuner → céréale au dîner (et vice-versa).", M + 4, y + 18.5, 8, false, "#5A3C00");
  y += 26;

  need(40);
  fillRect(M, y, CW, 7, "#F0F0F0");
  T("DÉJEUNERS SANS MICRO-ONDE — IDÉES SANDWICHS & WRAPS", M + 4, y + 5, 8.5, true, "#3D2B1F");
  y += 9;
  [
    "• Wrap complet : galette sarrasin + blanc de dinde + haricots verts + fromage frais",
    "• Sandwich pain complet : jambon blanc + houmous + carottes râpées",
    "• Bowl to-go : quinoa froid + thon en eau + brocolis vapeur + filet d'huile d'olive",
    "• Boîte lentilles : lentilles froides + crevettes + carottes + vinaigrette moutarde légère",
    "• Salade tiède : blé + poulet froid + asperges + radis",
  ].forEach(l => {
    need(7);
    T(l, M + 2, y, 8, false, "#444");
    y += 6.5;
  });

  y += 5;

  need(15);
  fillRect(M, y, CW, 13, "#F5EFE9");
  T(`Bilan sur ${semaines} semaine${semaines > 1 ? "s" : ""} : déficit total ≈ ${(stats.deficit * 7 * semaines).toLocaleString("fr-FR")} kcal`, M + 4, y + 5.5, 8, false, "#555");
  T(`Perte totale estimée : ≈ ${(stats.estimatedWeeklyLoss * semaines).toFixed(1)} kg`, M + 4, y + 11, 9, true, "#B89A7A");
  y += 16;

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setTextColor("#AAAAAA");
    doc.text(`Plan alimentaire de ${profile.prenom} · Généré le ${new Date().toLocaleDateString("fr-FR")} · Page ${p}/${total}`, W / 2, 290, { align: "center" });
  }

  doc.save(`plan-alimentaire-${profile.prenom.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
