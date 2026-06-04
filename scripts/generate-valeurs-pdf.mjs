// Génère un PDF « Nos valeurs » : 1 couverture + 1 planche pleine page par
// valeur (Créativité, Convivialité, Bienveillance), reprises depuis la
// section « Un moment pour soi » de la home (src/pages/Index.tsx).
//
// Utilisation : npm run feedback:valeurs

import { mkdir, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "feedback");
const HTML_PATH = path.join(OUT_DIR, "valeurs_cocooningclub.html");
const PDF_PATH = path.join(OUT_DIR, "valeurs_cocooningclub.pdf");
const CHROMIUM_PATH = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const today = new Date().toLocaleDateString("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

// Les valeurs reprises de Index.tsx + un texte étendu pour donner du corps
// à chaque planche. Chaque entrée porte sa propre palette pour un beau
// rythme visuel d'une page à l'autre.
const VALEURS = [
  {
    nom: "Créativité",
    accroche: "Des bulles de couleur, de matière et d'idées.",
    intro:
      "Des thèmes variés chaque mois : bougie, aquarelle, macramé, poterie… Chaque atelier est l'occasion d'expérimenter un nouveau geste, une nouvelle technique, une nouvelle manière de regarder.",
    paragraphes: [
      "On ne cherche pas la performance. On cherche le plaisir de faire, le plaisir d'oser un coup de pinceau ou de modeler la cire sans savoir ce qui en sortira.",
      "Chaque membre repart avec un objet, une trace concrète de son moment au club — et surtout avec la confiance d'avoir créé quelque chose de ses mains.",
    ],
    mantra: "On vient pour faire. On repart avec.",
    icone: spark,
    palette: {
      bgFrom: "#fef3c7",
      bgTo: "#fde68a",
      accent: "#b45309",
      accentSoft: "#fef9c3",
      ink: "#451a03",
    },
  },
  {
    nom: "Convivialité",
    accroche: "Des petits groupes, de vraies rencontres.",
    intro:
      "Petits groupes pour un moment chaleureux et des échanges authentiques. Pas de masse, pas d'anonymat : juste quelques personnes autour d'une table, le temps d'un atelier.",
    paragraphes: [
      "On se présente, on rit, on partage une astuce, on découvre la voisine qui adore la même série, la même chanson, la même cuisine.",
      "Beaucoup d'amitiés sont nées au club. Certaines membres ne se connaissaient pas en arrivant et se retrouvent maintenant en dehors des ateliers, pour un café ou une expo.",
    ],
    mantra: "On vient seule. On repart entourée.",
    icone: users,
    palette: {
      bgFrom: "#fce7f3",
      bgTo: "#fbcfe8",
      accent: "#9d174d",
      accentSoft: "#fdf2f8",
      ink: "#500724",
    },
  },
  {
    nom: "Bienveillance",
    accroche: "On vient comme on est, on repart le cœur léger.",
    intro:
      "Aucun niveau requis. Tous les âges, tous les parcours, toutes les humeurs sont accueillis avec la même attention. Personne n'est jugée sur ce qu'elle sait faire ou pas.",
    paragraphes: [
      "Au club, on prend soin les unes des autres. La parole circule, l'écoute prime, le rythme s'adapte à chacune.",
      "Les animatrices sont formées à créer un cadre rassurant : pas de pression, pas de comparaison, juste l'envie de vivre un moment doux ensemble.",
    ],
    mantra: "Ici, vous êtes la bienvenue. Toujours.",
    icone: heart,
    palette: {
      bgFrom: "#dcfce7",
      bgTo: "#bbf7d0",
      accent: "#15803d",
      accentSoft: "#f0fdf4",
      ink: "#052e16",
    },
  },
];

// Icônes inline (Lucide-like) en SVG, prêtes à colorer par CSS.
function spark() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>`;
}
function users() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}
function heart() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
}

function buildHtml() {
  const valeurPages = VALEURS.map((v, idx) => `
    <section class="page valeur" style="
      --bg-from: ${v.palette.bgFrom};
      --bg-to: ${v.palette.bgTo};
      --accent: ${v.palette.accent};
      --accent-soft: ${v.palette.accentSoft};
      --ink: ${v.palette.ink};
    ">
      <div class="valeur-frame">
        <div class="valeur-num">0${idx + 1}</div>
        <div class="valeur-icon">${v.icone()}</div>
        <h2 class="valeur-titre">${v.nom}</h2>
        <p class="valeur-accroche">${v.accroche}</p>
        <div class="valeur-rule"></div>
        <p class="valeur-intro">${v.intro}</p>
        ${v.paragraphes.map((p) => `<p class="valeur-text">${p}</p>`).join("")}
        <div class="valeur-mantra">
          <span class="quote">«</span>
          ${v.mantra}
          <span class="quote">»</span>
        </div>
      </div>
      <footer class="valeur-footer">
        <span>Cocooning Club</span>
        <span>${idx + 1} / ${VALEURS.length}</span>
      </footer>
    </section>`).join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Cocooning Club — Nos valeurs</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Georgia", "Times New Roman", serif;
    color: #1f2937;
  }
  .page {
    page-break-after: always;
    break-after: page;
    width: 210mm; height: 297mm;
    position: relative;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  /* Couverture */
  .cover {
    background:
      radial-gradient(circle at 20% 15%, rgba(251, 207, 232, 0.55), transparent 55%),
      radial-gradient(circle at 80% 85%, rgba(254, 215, 170, 0.55), transparent 55%),
      linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%);
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 60mm 30mm;
    text-align: center;
  }
  .cover .brand {
    font-family: "Helvetica Neue", "Segoe UI", sans-serif;
    font-size: 11pt; letter-spacing: 8px; text-transform: uppercase;
    color: #92400e; margin-bottom: 24mm;
  }
  .cover h1 {
    font-size: 54pt; font-weight: 700; color: #7c2d12;
    margin: 0; letter-spacing: -1px; line-height: 1.05;
  }
  .cover h1 em { font-style: italic; color: #b45309; }
  .cover .subtitle {
    font-size: 14pt; color: #78350f; margin-top: 18mm; max-width: 130mm;
    line-height: 1.55;
  }
  .cover .dot-row {
    display: flex; gap: 8mm; margin-top: 30mm;
  }
  .cover .dot {
    width: 12mm; height: 12mm; border-radius: 50%;
  }
  .cover .dot:nth-child(1) { background: #fde68a; }
  .cover .dot:nth-child(2) { background: #fbcfe8; }
  .cover .dot:nth-child(3) { background: #bbf7d0; }
  .cover .meta {
    position: absolute; bottom: 18mm; left: 0; right: 0; text-align: center;
    font-family: "Helvetica Neue", sans-serif;
    font-size: 9pt; letter-spacing: 4px; text-transform: uppercase;
    color: #b45309;
  }

  /* Planche valeur */
  .valeur {
    background:
      radial-gradient(circle at 100% 0%, rgba(255,255,255,0.6), transparent 50%),
      linear-gradient(180deg, var(--bg-from) 0%, var(--bg-to) 100%);
    padding: 26mm 24mm;
    color: var(--ink);
  }
  .valeur-frame {
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 18px;
    padding: 24mm 22mm 22mm;
    height: 100%;
    box-shadow: 0 4mm 12mm rgba(0, 0, 0, 0.06);
    position: relative;
  }
  .valeur-num {
    position: absolute; top: 18mm; right: 22mm;
    font-family: "Helvetica Neue", sans-serif;
    font-size: 64pt; font-weight: 200; color: var(--accent);
    opacity: 0.35; letter-spacing: -3px;
  }
  .valeur-icon {
    width: 22mm; height: 22mm; border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    border: 1.5px solid var(--accent);
    margin-bottom: 14mm;
  }
  .valeur-icon svg { width: 12mm; height: 12mm; }
  .valeur-titre {
    font-size: 42pt; font-weight: 700; margin: 0 0 6mm;
    letter-spacing: -1px; line-height: 1;
  }
  .valeur-accroche {
    font-style: italic; font-size: 15pt; color: var(--accent);
    margin: 0 0 14mm; line-height: 1.4;
  }
  .valeur-rule {
    width: 38mm; height: 2px; background: var(--accent);
    margin: 0 0 14mm;
  }
  .valeur-intro {
    font-size: 12.5pt; line-height: 1.65; margin: 0 0 8mm; font-weight: 500;
  }
  .valeur-text {
    font-size: 11.5pt; line-height: 1.7; margin: 0 0 6mm; color: #374151;
  }
  .valeur-mantra {
    margin-top: 16mm; padding: 8mm 10mm;
    border-left: 3px solid var(--accent);
    background: var(--accent-soft);
    font-family: "Georgia", serif;
    font-size: 14pt; font-style: italic; color: var(--ink);
    border-radius: 0 8px 8px 0;
    text-align: center;
    line-height: 1.4;
  }
  .valeur-mantra .quote {
    font-family: "Georgia", serif;
    font-size: 22pt; color: var(--accent);
    vertical-align: -3pt; margin: 0 4px;
  }
  .valeur-footer {
    position: absolute; bottom: 14mm; left: 24mm; right: 24mm;
    display: flex; justify-content: space-between;
    font-family: "Helvetica Neue", sans-serif;
    font-size: 8.5pt; letter-spacing: 3px; text-transform: uppercase;
    color: var(--accent); opacity: 0.7;
  }

  /* Quatrième de couverture */
  .back {
    background: linear-gradient(180deg, #fff7ed 0%, #fdf2f8 100%);
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 40mm;
    text-align: center;
  }
  .back .palette {
    display: flex; gap: 6mm; margin-bottom: 20mm;
  }
  .back .dot-large {
    width: 18mm; height: 18mm; border-radius: 50%;
  }
  .back .dot-large:nth-child(1) { background: #fde68a; }
  .back .dot-large:nth-child(2) { background: #fbcfe8; }
  .back .dot-large:nth-child(3) { background: #bbf7d0; }
  .back .signature {
    font-family: "Georgia", serif;
    font-size: 20pt; color: #7c2d12; font-style: italic;
    max-width: 130mm; line-height: 1.5;
  }
  .back .baseline {
    margin-top: 14mm;
    font-family: "Helvetica Neue", sans-serif;
    font-size: 9pt; letter-spacing: 6px; text-transform: uppercase;
    color: #92400e;
  }
</style>
</head>
<body>

  <section class="page cover">
    <div class="brand">Cocooning Club</div>
    <h1>Nos <em>3 valeurs</em></h1>
    <p class="subtitle">Ce qui nous tient à cœur, ce qui guide chaque atelier, ce qui fait l'esprit du club.</p>
    <div class="dot-row">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
    <div class="meta">${today}</div>
  </section>

  ${valeurPages}

  <section class="page back">
    <div class="palette">
      <div class="dot-large"></div>
      <div class="dot-large"></div>
      <div class="dot-large"></div>
    </div>
    <p class="signature">Trois valeurs, un état d'esprit.<br/>Trois mots qui résument une promesse&nbsp;: prendre soin.</p>
    <p class="baseline">Cocooning Club</p>
  </section>

</body>
</html>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  if (!existsSync(CHROMIUM_PATH)) {
    throw new Error(`Chromium introuvable à ${CHROMIUM_PATH}.`);
  }
  const html = buildHtml();
  await writeFile(HTML_PATH, html, "utf-8");

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("file://" + HTML_PATH, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: PDF_PATH,
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
  } finally {
    await browser.close();
  }
  const { size } = await stat(PDF_PATH);
  console.log(`✅ ${PDF_PATH} (${(size / 1024).toFixed(0)} ko)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
