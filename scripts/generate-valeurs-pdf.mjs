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
  const cards = VALEURS.map((v, idx) => `
    <article class="valeur-card" style="
      --bg-from: ${v.palette.bgFrom};
      --bg-to: ${v.palette.bgTo};
      --accent: ${v.palette.accent};
      --accent-soft: ${v.palette.accentSoft};
      --ink: ${v.palette.ink};
    ">
      <div class="card-top">
        <div class="card-icon">${v.icone()}</div>
        <div class="card-num">0${idx + 1}</div>
      </div>
      <h2 class="card-titre">${v.nom}</h2>
      <p class="card-accroche">${v.accroche}</p>
      <div class="card-rule"></div>
      <p class="card-intro">${v.intro}</p>
      <div class="card-mantra">
        <span class="quote">«</span>
        ${v.mantra}
        <span class="quote">»</span>
      </div>
    </article>`).join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Cocooning Club — Nos 3 valeurs</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Georgia", "Times New Roman", serif;
    color: #1f2937;
  }
  .page {
    width: 210mm; height: 297mm;
    background:
      radial-gradient(circle at 12% 8%, rgba(254, 215, 170, 0.55), transparent 40%),
      radial-gradient(circle at 88% 12%, rgba(251, 207, 232, 0.55), transparent 40%),
      radial-gradient(circle at 50% 100%, rgba(187, 247, 208, 0.55), transparent 45%),
      linear-gradient(180deg, #fff7ed 0%, #fdf2f8 100%);
    padding: 18mm 16mm 16mm;
    display: flex; flex-direction: column;
  }

  /* Header */
  .head {
    text-align: center; margin-bottom: 10mm;
  }
  .head .brand {
    font-family: "Helvetica Neue", "Segoe UI", sans-serif;
    font-size: 9pt; letter-spacing: 6px; text-transform: uppercase;
    color: #92400e; margin-bottom: 6mm;
  }
  .head h1 {
    font-size: 36pt; font-weight: 700; color: #7c2d12;
    margin: 0; letter-spacing: -1px; line-height: 1.05;
  }
  .head h1 em { font-style: italic; color: #b45309; }
  .head .subtitle {
    font-size: 11.5pt; color: #78350f;
    margin: 6mm auto 0; max-width: 130mm; line-height: 1.5;
  }

  /* Grille des 3 cartes */
  .grid {
    flex: 1 1 auto;
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5mm;
    min-height: 0;
  }

  .valeur-card {
    background:
      radial-gradient(circle at 100% 0%, rgba(255,255,255,0.55), transparent 50%),
      linear-gradient(180deg, var(--bg-from) 0%, var(--bg-to) 100%);
    border-radius: 14px;
    padding: 9mm 8mm 9mm;
    color: var(--ink);
    box-shadow: 0 2mm 6mm rgba(0, 0, 0, 0.06);
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .card-top {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 6mm;
  }
  .card-icon {
    width: 16mm; height: 16mm; border-radius: 50%;
    background: rgba(255, 255, 255, 0.55);
    color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    border: 1.5px solid var(--accent);
  }
  .card-icon svg { width: 9mm; height: 9mm; }
  .card-num {
    font-family: "Helvetica Neue", sans-serif;
    font-size: 28pt; font-weight: 200; color: var(--accent);
    opacity: 0.5; letter-spacing: -2px; line-height: 1;
  }
  .card-titre {
    font-size: 22pt; font-weight: 700; margin: 0 0 3mm;
    letter-spacing: -0.5px; line-height: 1;
  }
  .card-accroche {
    font-style: italic; font-size: 10.5pt; color: var(--accent);
    margin: 0 0 5mm; line-height: 1.4;
  }
  .card-rule {
    width: 18mm; height: 2px; background: var(--accent);
    margin: 0 0 6mm;
  }
  .card-intro {
    font-size: 9.5pt; line-height: 1.55; margin: 0 0 6mm;
    color: #374151;
  }
  .card-mantra {
    margin-top: auto;
    padding: 5mm 5mm;
    border-left: 3px solid var(--accent);
    background: rgba(255, 255, 255, 0.55);
    font-family: "Georgia", serif;
    font-size: 10pt; font-style: italic; color: var(--ink);
    border-radius: 0 6px 6px 0;
    text-align: center;
    line-height: 1.35;
  }
  .card-mantra .quote {
    font-family: "Georgia", serif;
    font-size: 14pt; color: var(--accent);
    vertical-align: -2pt; margin: 0 2px;
  }

  /* Footer */
  .foot {
    margin-top: 8mm;
    display: flex; justify-content: space-between; align-items: center;
    font-family: "Helvetica Neue", sans-serif;
    font-size: 8pt; letter-spacing: 3px; text-transform: uppercase;
    color: #92400e; opacity: 0.7;
  }
  .foot .dots { display: flex; gap: 3mm; }
  .foot .dot { width: 4mm; height: 4mm; border-radius: 50%; }
  .foot .dot:nth-child(1) { background: #fde68a; }
  .foot .dot:nth-child(2) { background: #fbcfe8; }
  .foot .dot:nth-child(3) { background: #bbf7d0; }
</style>
</head>
<body>
  <section class="page">
    <header class="head">
      <div class="brand">Cocooning Club</div>
      <h1>Nos <em>3 valeurs</em></h1>
      <p class="subtitle">Ce qui nous tient à cœur, ce qui guide chaque atelier, ce qui fait l'esprit du club.</p>
    </header>

    <div class="grid">
      ${cards}
    </div>

    <footer class="foot">
      <span>${today}</span>
      <span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
      <span>Trois valeurs, un état d'esprit</span>
    </footer>
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
