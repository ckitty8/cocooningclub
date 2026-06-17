import jsPDF from "jspdf";
import { UserProfile, WeekPlan, DayKey } from "./types";
import { getFoodById } from "./foodData";
import { calcCalorieStats, calcDayKcal, calcDuration } from "./calculations";

const DAYS: DayKey[] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const foodName = (id?: string) => (id ? (getFoodById(id)?.nom ?? id) : "—");
const foodKcal = (id?: string) => (id ? (getFoodById(id)?.kcalPortion ?? 0) : 0);

export function generateMadameProteinePDF(profile: UserProfile, week: WeekPlan) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 22;
  const contentW = W - margin * 2;
  const stats = calcCalorieStats(profile);
  const kgAPerdre = Math.max(0, profile.poidsActuel - profile.poidsObjectif);
  const semaines = calcDuration(profile.dateObjectif);

  let y = margin;

  const addPage = () => { doc.addPage(); y = margin; };
  const checkPage = (needed: number) => { if (y + needed > 285) addPage(); };

  // ── Helpers ──
  const rect = (rx: number, ry: number, rw: number, rh: number, fill: string) => {
    doc.setFillColor(fill);
    doc.roundedRect(rx, ry, rw, rh, 2, 2, "F");
  };

  const text = (t: string, tx: number, ty: number, opts?: { size?: number; bold?: boolean; color?: string; align?: "left" | "center" | "right" }) => {
    doc.setFontSize(opts?.size ?? 10);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setTextColor(opts?.color ?? "#3D2B1F");
    doc.text(t, tx, ty, { align: opts?.align ?? "left" });
  };

  // ══════════════════════════════════════
  // PAGE 1 — EN-TÊTE & RÈGLES
  // ══════════════════════════════════════
  rect(margin, y, contentW, 28, "#F5EFE9");
  text("PLAN ALIMENTAIRE", W / 2, y + 9, { size: 20, bold: true, color: "#3D2B1F", align: "center" });
  text(`de ${profile.prenom.toUpperCase()}`, W / 2, y + 17, { size: 13, bold: true, color: "#B89A7A", align: "center" });
  text(`Objectif : ${profile.poidsObjectif} kg · Durée : ${semaines} semaine${semaines > 1 ? "s" : ""}`, W / 2, y + 24, { size: 8, color: "#7A6352", align: "center" });
  y += 35;

  // Encadré gris "Règles"
  rect(margin, y, contentW, 36, "#F0F0F0");
  text("RÈGLES DU PLAN", margin + 4, y + 6, { size: 8, bold: true, color: "#555" });
  const rules = [
    "• Eau : 2,5 à 3 litres par jour (eau, tisanes, bouillon).",
    "• Légumes autorisés uniquement : Haricots verts · Brocolis · Carottes · Asperges · Radis",
    "• SANS fruit. Repas plaisir 1×/semaine (samedi de préférence).",
    "• RÈGLE FONDAMENTALE : Légumineuse OU Céréale par repas — JAMAIS les deux ensemble.",
  ];
  rules.forEach((r, i) => text(r, margin + 4, y + 13 + i * 6, { size: 7.5, color: "#333" }));
  y += 43;

  // Résumé profil
  rect(margin, y, contentW, 18, "#F5EFE9");
  text(`IMC : ${(profile.poidsActuel / ((profile.taille / 100) ** 2)).toFixed(1)}`, margin + 4, y + 7, { size: 8, color: "#555" });
  text(`À perdre : ${kgAPerdre} kg`, margin + 50, y + 7, { size: 8, color: "#555" });
  text(`Objectif calorique : ${stats.target} kcal/j`, margin + 100, y + 7, { size: 8, color: "#555" });
  text(`Déficit : −${stats.deficit} kcal`, margin + 4, y + 14, { size: 8, color: "#555" });
  text(`Perte estimée : ≈ ${stats.estimatedWeeklyLoss} kg/sem`, margin + 50, y + 14, { size: 8, color: "#555" });
  y += 25;

  // ══════════════════════════════════════
  // SECTION PAR REPAS (Plan type)
  // ══════════════════════════════════════
  const meals = [
    { key: "petitDej", title: "① PETIT-DÉJEUNER", subtitle: "Protéines + Glucides" },
    { key: "collation1", title: "② COLLATION 10H (optionnelle)", subtitle: "Barre · Galette · Yaourt" },
    { key: "dejeuner", title: "③ DÉJEUNER", subtitle: "Protéines + Glucides + Légumes" },
    { key: "collation2", title: "④ COLLATION 16H — OBLIGATOIRE", subtitle: "Barre de céréales 90 kcal" },
    { key: "diner", title: "⑤ DÎNER", subtitle: "Protéines légères + Glucides + Légumes + Dessert" },
    { key: "collation3", title: "⑥ COLLATION SOIR (si sport)", subtitle: "Yaourt sans lactose + Beurre cacahuète" },
  ] as const;

  // Sample meal from Monday
  const mon = week.lundi;

  const mealData: Record<string, string[]> = {
    petitDej: [
      `Protéines : ${foodName(mon.petitDej.proteine)}${mon.petitDej.proteine ? ` (${foodKcal(mon.petitDej.proteine)} kcal)` : ""}`,
      `Glucides : ${foodName(mon.petitDej.glucide)}${mon.petitDej.glucide ? ` (${foodKcal(mon.petitDej.glucide)} kcal)` : ""}`,
    ],
    collation1: [`• ${foodName(mon.collation1.proteine)}`],
    dejeuner: [
      `Protéines : ${foodName(mon.dejeuner.proteine)}${mon.dejeuner.proteine ? ` (${foodKcal(mon.dejeuner.proteine)} kcal)` : ""}`,
      `Glucides : ${foodName(mon.dejeuner.glucide)}${mon.dejeuner.glucide ? ` (${foodKcal(mon.dejeuner.glucide)} kcal)` : ""}`,
      `Légumes : ${foodName(mon.dejeuner.legume)}${mon.dejeuner.legume ? ` (${foodKcal(mon.dejeuner.legume)} kcal)` : ""}`,
    ],
    collation2: [`• ${foodName(mon.collation2.proteine)} — 90 kcal`],
    diner: [
      `Protéines : ${foodName(mon.diner.proteine)}${mon.diner.proteine ? ` (${foodKcal(mon.diner.proteine)} kcal)` : ""}`,
      `Glucides : ${foodName(mon.diner.glucide)}${mon.diner.glucide ? ` (${foodKcal(mon.diner.glucide)} kcal)` : ""}`,
      `Légumes : ${foodName(mon.diner.legume)}${mon.diner.legume ? ` (${foodKcal(mon.diner.legume)} kcal)` : ""}`,
      `Dessert : ${foodName(mon.diner.dessert)}${mon.diner.dessert ? ` (${foodKcal(mon.diner.dessert)} kcal)` : ""}`,
    ],
    collation3: [`• ${foodName(mon.collation3.proteine)}`],
  };

  meals.forEach(m => {
    const lines = mealData[m.key];
    const boxH = 8 + lines.length * 6.5;
    checkPage(boxH + 6);
    rect(margin, y, contentW, boxH, "#F0F0F0");
    text(m.title, margin + 4, y + 6, { size: 9, bold: true, color: "#3D2B1F" });
    text(m.subtitle, margin + contentW - 4, y + 6, { size: 7, color: "#7A6352", align: "right" });
    lines.forEach((l, i) => text(`• ${l}`, margin + 6, y + 13 + i * 6.5, { size: 8, color: "#444" }));
    y += boxH + 5;
  });

  // ══════════════════════════════════════
  // PAGE 2 — TABLEAU SEMAINE
  // ══════════════════════════════════════
  addPage();
  text("TABLEAU — SEMAINE TYPE", W / 2, y, { size: 14, bold: true, align: "center" });
  y += 8;

  const colW = contentW / 7;
  const headerH = 10;

  // En-tête colonnes jours
  rect(margin, y, contentW, headerH, "#B89A7A");
  DAY_LABELS.forEach((d, i) => {
    text(d, margin + i * colW + colW / 2, y + 7, { size: 7.5, bold: true, color: "#FFFFFF", align: "center" });
  });
  y += headerH;

  const rowMeals = [
    { label: "Petit-déj", fn: (d: DayKey) => foodName(week[d].petitDej.proteine) },
    { label: "Déjeuner", fn: (d: DayKey) => foodName(week[d].dejeuner.proteine) },
    { label: "Dîner", fn: (d: DayKey) => foodName(week[d].diner.proteine) },
    { label: "Glucide", fn: (d: DayKey) => foodName(week[d].dejeuner.glucide) },
    { label: "Légume", fn: (d: DayKey) => foodName(week[d].dejeuner.legume) },
    { label: "kcal/j", fn: (d: DayKey) => `${calcDayKcal(week[d])} kcal` },
  ];

  rowMeals.forEach((row, ri) => {
    const rowH = 12;
    const bg = ri % 2 === 0 ? "#FAF8F5" : "#F0F0F0";
    rect(margin, y, contentW, rowH, bg);
    DAYS.forEach((d, i) => {
      const val = row.fn(d);
      const lines = doc.splitTextToSize(val, colW - 2);
      text(lines[0] ?? "—", margin + i * colW + colW / 2, y + 5, { size: 6.5, align: "center", color: "#333" });
      if (lines[1]) text(lines[1], margin + i * colW + colW / 2, y + 9.5, { size: 6, align: "center", color: "#555" });
    });
    // Row label on far right? — put in first
    if (ri === 0) {
      // label row overlay
    }
    y += rowH;
  });

  y += 10;

  // ══════════════════════════════════════
  // Encadré RÈGLE FONDAMENTALE
  // ══════════════════════════════════════
  checkPage(25);
  doc.setDrawColor("#E5A000");
  doc.setLineWidth(0.5);
  rect(margin, y, contentW, 22, "#FFF8E7");
  doc.roundedRect(margin, y, contentW, 22, 2, 2, "S");
  text("⚠ RÈGLE FONDAMENTALE GLUCIDES", margin + 4, y + 7, { size: 9, bold: true, color: "#A07000" });
  text("Légumineuse OU Céréale par repas — JAMAIS les deux ensemble dans le même repas.", margin + 4, y + 14, { size: 8, color: "#5A4000" });
  text("Si légumineuse au déjeuner → céréale au dîner, et inversement.", margin + 4, y + 19.5, { size: 8, color: "#5A4000" });
  y += 28;

  // Section sandwichs & wraps
  checkPage(40);
  rect(margin, y, contentW, 6, "#F0F0F0");
  text("DÉJEUNERS SANS MICRO-ONDE — IDÉES SANDWICHS & WRAPS", margin + 4, y + 4.5, { size: 8.5, bold: true, color: "#3D2B1F" });
  y += 8;
  const wraps = [
    "• Wrap complet : galette sarrasin + blanc de dinde + haricots verts + fromage frais",
    "• Sandwich pain complet : jambon blanc + houmous + carottes râpées",
    "• Bowl to-go : quinoa froid + thon + brocolis vapeur + filet d'huile d'olive",
    "• Boîte lentilles : lentilles froides + crevettes + carottes + vinaigrette légère",
  ];
  wraps.forEach(w => {
    checkPage(7);
    text(w, margin + 2, y, { size: 8, color: "#444" });
    y += 6.5;
  });

  y += 5;
  checkPage(15);
  rect(margin, y, contentW, 12, "#F5EFE9");
  text(`Total calorique estimé sur ${semaines} semaine${semaines > 1 ? "s" : ""} : déficit total ≈ ${(stats.deficit * 7 * semaines).toLocaleString("fr-FR")} kcal`, margin + 4, y + 5, { size: 8, color: "#555" });
  text(`Perte totale estimée : ≈ ${(stats.estimatedWeeklyLoss * semaines).toFixed(1)} kg sur ${semaines} semaine${semaines > 1 ? "s" : ""}`, margin + 4, y + 10, { size: 8.5, bold: true, color: "#B89A7A" });
  y += 15;

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor("#AAAAAA");
    doc.text(`Plan alimentaire de ${profile.prenom} · Généré le ${new Date().toLocaleDateString("fr-FR")} · Page ${p}/${totalPages}`, W / 2, 290, { align: "center" });
  }

  doc.save(`plan-alimentaire-${profile.prenom.toLowerCase()}.pdf`);
}
