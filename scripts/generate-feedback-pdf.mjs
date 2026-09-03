// Génère le REX V1 (retour d'expérience) : pour chaque page du site, une
// capture d'écran sur une page A4 puis, sur la page A4 suivante, un set de
// questions rédigées du point de vue d'un·e UX researcher + d'un·e UI
// designer, avec une zone de notes libres.
//
// Pour pouvoir capturer les pages authentifiées sans dépendre d'un vrai
// backend Supabase (sandbox sans réseau sortant), on intercepte les appels
// Supabase au niveau Playwright et on retourne des données factices peuplées
// (cf. scripts/feedback-mock-supabase.mjs).
//
// Utilisation : npm run feedback:rex

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { attachSupabaseMock, buildAuthLocalStorage } from "./feedback-mock-supabase.mjs";
import { PAGES, TRANSVERSE_AUDIT } from "./feedback-pages.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "feedback");
const SHOTS_DIR = path.join(OUT_DIR, "screenshots");
// Scope optionnel : permet de générer un REX restreint à un sous-ensemble
// de pages (ex. uniquement l'espace membre).
//
//   FEEDBACK_SCOPE=membre        → /espace-membre/*  (10 pages)
//   FEEDBACK_SCOPE=admin         → /admin/*          (10 pages)
//   FEEDBACK_SCOPE=public        → site public + auth (6 pages)
//   non défini (par défaut)      → toutes les pages  (27 pages)
const SCOPE = (process.env.FEEDBACK_SCOPE || "").toLowerCase();

function inScope(def) {
  if (!SCOPE) return true;
  if (SCOPE === "membre") return def.path.startsWith("/espace-membre");
  if (SCOPE === "admin") return def.path.startsWith("/admin");
  if (SCOPE === "public") return !def.path.startsWith("/admin") && !def.path.startsWith("/espace-membre");
  return true;
}

const SCOPED_PAGES = PAGES.filter(inScope);
const SCOPE_SUFFIX = SCOPE ? `_${SCOPE === "membre" ? "espace_membre" : SCOPE}` : "";
const PDF_PATH = path.join(OUT_DIR, `REX${SCOPE_SUFFIX}_V1.pdf`);
const HTML_PATH = path.join(OUT_DIR, `REX${SCOPE_SUFFIX}_V1.html`);

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

// Chemin local de Chromium (préinstallé dans l'environnement)
const CHROMIUM_PATH = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const VIEWPORT = { width: 1440, height: 900 };

// Pour chaque page, on collecte 4 questions UX (perception, parcours,
// friction, jobs-to-be-done) et 4 critiques UI (typographie, couleur,
// composants, espacement, microinteractions, accessibilité).

function log(msg) {
  console.log(`[feedback-pdf] ${msg}`);
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Le serveur ${url} n'a pas répondu dans le délai imparti.`);
}

function startPreviewServer() {
  log("Démarrage de Vite preview (build statique) sur le port " + PORT + "…");
  const child = spawn(
    "npx",
    ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT)],
    {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "none" },
    }
  );
  child.stdout.on("data", (d) => process.stdout.write(`[vite] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[vite] ${d}`));
  return child;
}

const STUB_ENV = {
  VITE_SUPABASE_URL:
    process.env.VITE_SUPABASE_URL || "https://stub.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY:
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "stub-anon-key",
};

async function buildSite() {
  log("Build production en cours…");
  await new Promise((resolve, reject) => {
    const child = spawn("npx", ["vite", "build"], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, ...STUB_ENV },
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`vite build a échoué (code ${code})`))
    );
  });
  log("Build terminé.");
}

async function captureScreenshots(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT });

  // Mock complet de Supabase (auth + REST + RPC) au niveau réseau Playwright,
  // pour que les pages /admin se peuplent de données factices réalistes.
  await attachSupabaseMock(context, log);

  // Pré-charge la session admin dans localStorage pour les routes
  // authentifiées (/admin, /espace-membre), et l'efface pour les pages
  // publiques (sinon /login, /forgot-password redirigent immédiatement
  // vers /admin/dashboard).
  const supabaseUrl = STUB_ENV.VITE_SUPABASE_URL;
  const seed = buildAuthLocalStorage(supabaseUrl);
  await context.addInitScript(({ key, value }) => {
    try {
      const path = window.location.pathname;
      const needsAuth =
        path.startsWith("/admin") ||
        path.startsWith("/espace-membre");
      if (needsAuth) {
        window.localStorage.setItem(key, value);
      } else {
        window.localStorage.removeItem(key);
      }
    } catch {}
  }, seed);

  const page = await context.newPage();
  const results = [];

  for (const def of SCOPED_PAGES) {
    const url = `${BASE_URL}${def.path}`;
    const filename = (def.path === "/" ? "index" : def.path.replace(/^\//, "").replace(/\//g, "_")) + ".png";
    const file = path.join(SHOTS_DIR, filename);
    log(`Capture ${def.title} (${url})`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForFunction(
        () => {
          const root = document.getElementById("root");
          return root && root.children.length > 0 && root.innerText.trim().length > 0;
        },
        null,
        { timeout: 15_000 }
      ).catch(() => log(`  ⚠️ #root toujours vide pour ${def.path}`));
      await page
        .waitForLoadState("networkidle", { timeout: 10_000 })
        .catch(() => {});
    } catch (err) {
      log(`  ⚠️ Navigation lente, on continue : ${err.message}`);
    }
    await page.waitForTimeout(1200);
    await page.screenshot({ path: file, fullPage: true });
    results.push({ ...def, file: path.relative(OUT_DIR, file), absFile: file });
  }

  await context.close();
  return results;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildHtml(captures) {
  const grouped = new Map();
  for (const c of captures) {
    if (!grouped.has(c.section)) grouped.set(c.section, []);
    grouped.get(c.section).push(c);
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const tocItems = [];
  let i = 1;
  for (const [section, items] of grouped) {
    tocItems.push(`<li class="toc-section">${escapeHtml(section)}</li>`);
    for (const item of items) {
      tocItems.push(
        `<li class="toc-item"><span>${i}. ${escapeHtml(item.title)}</span><span class="toc-path">${escapeHtml(item.path)}</span></li>`
      );
      i++;
    }
  }

  // Pages d'introduction de section : insérées avant la première planche
  // de chaque bloc (clé = section concernée, valeur = titre + paragraphe).
  const SECTION_INTROS = {
    "Espace administrateur (accès restreint)": {
      title: "Espace administrateur",
      kicker: "Accès restreint",
      paragraphs: [
        "Cette section regroupe les écrans réservés à l'administration du club. On y pilote la vie quotidienne du club : suivi de l'activité, gestion des membres, planification des ateliers, traitement des pré-inscriptions, modération des avis, configuration du formulaire de contact, des modèles de messages et des disponibilités.",
        "Chaque planche présente la capture de l'écran et le quizz UX/UI associé. Les chiffres affichés (membres, ateliers, inscriptions, etc.) sont des données de démonstration : seule la structure et l'ergonomie des écrans sont à évaluer ici.",
      ],
    },
    "Espace membre (rôles inscrit / membre)": {
      title: "Espace membre",
      kicker: "Côté adhérente",
      paragraphs: [
        "Cette section présente l'expérience vécue par une adhérente du club, qu'elle soit nouvellement inscrite ou membre confirmée. Tableau de bord, parcours d'inscription aux ateliers, suivi de ses inscriptions, consultation du magazine, gestion de son compte : tout ce qu'elle voit après s'être connectée.",
      ],
    },
  };

  let pageNumber = 1;
  const sectionsIntroduced = new Set();

  const renderQuestion = (q) => `
          <li class="question">
            <span class="check"></span>
            <span class="question-text">${escapeHtml(q)}</span>
          </li>`;

  // Une « mini-carte » = capture + quizz tassés sur la moitié d'une A4 paysage.
  const renderMini = (c, num) => {
    const uxList = c.ux.map(renderQuestion).join("");
    const uiList = c.ui.map(renderQuestion).join("");
    return `
      <div class="mini">
        <header class="mini-header">
          <div class="page-num">#${num}</div>
          <div class="mini-title">
            <div class="section-tag">${escapeHtml(c.section)}</div>
            <h2>${escapeHtml(c.title)}</h2>
            <div class="path">${escapeHtml(c.path)}</div>
          </div>
        </header>
        <div class="mini-shot">
          <img src="${encodeURI(c.file)}" alt="Capture de ${escapeHtml(c.title)}" />
        </div>
        <div class="mini-quizz">
          <h3><span class="lens lens-ux">UX</span> Parcours, perception, friction</h3>
          <ol class="questions">${uxList}</ol>
          <h3><span class="lens lens-ui">UI</span> Composition, composants, accessibilité</h3>
          <ol class="questions">${uiList}</ol>
          <h3>Notes</h3>
          <div class="notes-box">
            <div class="dot-line"></div>
            <div class="dot-line"></div>
            <div class="dot-line"></div>
          </div>
        </div>
      </div>`;
  };

  const out = [];
  let buffer = [];
  const flushBuffer = () => {
    if (buffer.length === 0) return;
    out.push(`
      <section class="page page-double pb">
        ${buffer.join("")}
      </section>`);
    buffer = [];
  };

  for (const c of captures) {
    // Si on entre dans une nouvelle section avec une page d'intro dédiée,
    // on flush d'abord la planche en cours pour que l'intro démarre seule.
    if (SECTION_INTROS[c.section] && !sectionsIntroduced.has(c.section)) {
      flushBuffer();
      sectionsIntroduced.add(c.section);
      const def = SECTION_INTROS[c.section];
      out.push(`
      <section class="page page-section-intro pb">
        <div class="section-intro-kicker">${escapeHtml(def.kicker)}</div>
        <h1 class="section-intro-title">${escapeHtml(def.title)}</h1>
        ${def.paragraphs.map((p) => `<p class="section-intro-text">${escapeHtml(p)}</p>`).join("")}
      </section>`);
    }

    buffer.push(renderMini(c, pageNumber++));
    flushBuffer();
  }
  flushBuffer();

  const pages = out.join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Cocooning Club — Démo du site internet</title>
<style>
  @page { size: A4 portrait; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1f2937;
    font-size: 10.5pt;
    line-height: 1.45;
  }
  h1, h2, h3 { color: #111827; margin: 0 0 8px; }
  .page {
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .pb { page-break-before: always; break-before: page; }

  /* Cover */
  .cover {
    height: 273mm;
    display: flex; align-items: center; justify-content: center;
  }
  .cover-inner { text-align: center; max-width: 620px; }
  .cover .brand { font-size: 12pt; letter-spacing: 4px; text-transform: uppercase; color: #9ca3af; }
  .cover h1 { font-size: 26pt; margin: 6mm 0 4mm; }
  .cover .subtitle { font-size: 11pt; color: #4b5563; max-width: 520px; margin: 0 auto; line-height: 1.4; }
  .cover .meta { margin-top: 6mm; color: #6b7280; font-size: 9.5pt; }
  .cover .howto {
    margin: 8mm auto 0; max-width: 560px; text-align: left;
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px;
  }
  .cover .howto h3 { font-size: 11pt; margin: 0 0 4px; text-transform: none; letter-spacing: 0; }
  .cover .howto ul { margin: 0; padding-left: 18px; }
  .cover .howto li { margin-bottom: 3px; font-size: 10pt; }

  /* TOC : passage en 2 colonnes pour tenir sur une A4 paysage. */
  .toc h2 { border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; font-size: 18pt; }
  .toc ol, .toc ul {
    list-style: none; padding: 0; margin: 0;
  }
  .toc-section {
    margin-top: 6px; font-weight: 600; color: #6b7280;
    text-transform: uppercase; letter-spacing: 1px; font-size: 8.5pt;
    break-inside: avoid; break-after: avoid;
  }
  .toc-section:first-child { margin-top: 0; }
  .toc-item {
    display: flex; justify-content: space-between; gap: 8px;
    padding: 2px 0; border-bottom: 1px dotted #e5e7eb;
    font-size: 9pt;
    break-inside: avoid;
  }
  .toc-path { color: #9ca3af; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 8pt; }

  /* Common header */
  .page-num {
    background: #111827; color: white; border-radius: 6px; padding: 4px 10px;
    font-weight: 700; font-size: 12pt; min-width: 38px; text-align: center;
  }
  .section-tag {
    display: inline-block; background: #eef2ff; color: #4338ca;
    padding: 2px 8px; border-radius: 999px; font-size: 9pt; margin-bottom: 4px;
  }
  .path {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #6b7280; font-size: 9.5pt; margin-top: 2px;
  }

  /* Planche A4 portrait : 1 capture en haut + quizz checklist en bas. */
  .page-double {
    display: flex; flex-direction: column;
    height: 273mm;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .mini {
    display: flex; flex-direction: column; min-height: 0;
    flex: 1 1 auto;
    overflow: hidden;
  }
  .mini-header {
    display: flex; gap: 12px; align-items: flex-start;
    border-bottom: 2px solid #111827; padding-bottom: 6px; margin-bottom: 8px;
    flex: 0 0 auto;
  }
  .mini-header .page-num {
    font-size: 11pt; padding: 4px 10px; min-width: 38px;
  }
  .mini-title h2 { font-size: 18pt; margin: 0; line-height: 1.15; }
  .mini-title .section-tag { font-size: 9pt; padding: 2px 8px; margin-bottom: 3px; }
  .mini-title .path { font-size: 9.5pt; margin-top: 2px; }
  .mini-shot {
    flex: 0 0 auto; height: 130mm;
    display: flex; align-items: flex-start; justify-content: center;
    border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;
    background: #f3f4f6; padding: 4px;
    margin-bottom: 8px;
  }
  .mini-shot img {
    max-width: 100%; max-height: 100%;
    object-fit: contain; display: block;
  }
  .mini-quizz {
    flex: 1 1 auto; min-height: 0; overflow: hidden;
  }
  .mini-quizz h3 {
    font-size: 10pt; margin: 6px 0 4px;
    color: #111827; text-transform: uppercase; letter-spacing: 1px;
    display: flex; align-items: center; gap: 8px;
  }
  .mini-quizz h3:first-child { margin-top: 0; }
  .mini-quizz .lens { padding: 1px 7px; font-size: 9pt; }
  .mini-quizz ol.questions {
    list-style: none; padding-left: 0; margin: 0 0 4px;
    font-size: 10pt; line-height: 1.35;
  }
  .mini-quizz .question {
    display: flex; align-items: flex-start; gap: 8px;
    margin-bottom: 3px; page-break-inside: avoid;
  }
  .mini-quizz .check {
    flex: 0 0 auto; width: 11px; height: 11px;
    border: 1.2px solid #4338ca; border-radius: 2px;
    margin-top: 2px;
  }
  .mini-quizz .question-text { flex: 1 1 auto; }
  .mini-quizz .notes-box { margin-top: 4px; }
  .mini-quizz .notes-box .dot-line {
    height: 5mm;
    border-bottom: 1px dotted #9ca3af;
  }

  /* Section intro : page de présentation d'un bloc (admin, membre, ...). */
  .page-section-intro {
    height: 273mm;
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 30mm;
    background: linear-gradient(135deg, #eef2ff 0%, #fdf2f8 100%);
    border-radius: 6px;
  }
  .section-intro-kicker {
    font-size: 11pt; letter-spacing: 4px; text-transform: uppercase;
    color: #6b7280; margin-bottom: 10mm;
  }
  .section-intro-title {
    font-size: 36pt; margin: 0 0 14mm; color: #111827;
    border-bottom: 3px solid #4338ca; padding-bottom: 6mm;
    max-width: 220mm;
  }
  .section-intro-text {
    font-size: 13pt; line-height: 1.55; color: #374151;
    max-width: 200mm; margin: 0 0 6mm;
  }

  /* Spec page (parcours utilisateur en format spécification fonctionnelle) */
  .page-spec .spec-header {
    display: flex; gap: 12px; align-items: flex-start;
    border-bottom: 2px solid #111827; padding-bottom: 6px; margin-bottom: 10px;
  }
  .page-spec h2 { font-size: 16pt; margin: 0; }
  .page-spec h3 {
    font-size: 9.5pt; margin-top: 9px; margin-bottom: 4px;
    color: #111827; text-transform: uppercase; letter-spacing: 1px;
    border-left: 3px solid #4338ca; padding-left: 8px;
  }
  .spec-tag { background: #e0e7ff; color: #3730a3; }
  .spec-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    margin-bottom: 4px;
  }
  .spec-cell {
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
    padding: 8px 10px;
  }
  .spec-cell h3 {
    border-left: none; padding-left: 0;
    font-size: 8.5pt; margin-top: 0; margin-bottom: 3px;
    color: #6b7280;
  }
  .spec-cell p { margin: 0; font-size: 10pt; }
  .spec-list {
    margin: 0 0 4px; padding-left: 20px; font-size: 10pt;
  }
  .spec-list li { margin-bottom: 3px; }
  .spec-flow {
    counter-reset: step; list-style: none; padding-left: 0;
  }
  .spec-flow li {
    counter-increment: step; position: relative; padding-left: 28px;
    margin-bottom: 4px;
  }
  .spec-flow li::before {
    content: counter(step);
    position: absolute; left: 0; top: 0;
    background: #4338ca; color: white;
    width: 20px; height: 20px;
    border-radius: 50%; font-size: 9pt; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .spec-rules li {
    background: #fefce8; border-left: 2px solid #eab308;
    padding: 2px 8px; list-style-position: inside;
    margin-bottom: 3px; border-radius: 0 3px 3px 0;
  }
  .spec-postconditions {
    background: #ecfdf5; border-left: 3px solid #10b981;
    padding: 6px 10px; border-radius: 0 4px 4px 0;
    margin: 0; font-size: 10pt;
  }

  /* Audit page (questions + notes) */
  .page-audit .audit-header {
    display: flex; gap: 12px; align-items: flex-start;
    border-bottom: 2px solid #111827; padding-bottom: 6px; margin-bottom: 10px;
  }
  .page-audit h2 { font-size: 16pt; margin: 0; }
  .page-audit h3 {
    font-size: 10pt; margin-top: 10px; margin-bottom: 6px;
    color: #111827; text-transform: uppercase; letter-spacing: 1px;
    display: flex; align-items: center; gap: 8px;
  }
  .lens {
    display: inline-block;
    padding: 1px 7px; border-radius: 4px;
    font-size: 9pt; font-weight: 700; letter-spacing: 0.5px;
  }
  .lens-ux { background: #ecfeff; color: #0e7490; border: 1px solid #a5f3fc; }
  .lens-ui { background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; }

  ol.questions { padding-left: 20px; margin: 0 0 8px; }
  .question { margin-bottom: 6px; page-break-inside: avoid; }
  .question-text { font-weight: 500; }
  .answer-lines .line, .notes-box .line {
    border-bottom: 1px solid #d1d5db; height: 5.5mm;
  }
  .notes-box { margin-top: 4px; }

  /* Transverse final */
  .page-transverse h2 {
    border-bottom: 2px solid #111827; padding-bottom: 6px; margin-bottom: 12px;
  }
  .transverse-block { margin-bottom: 14px; page-break-inside: avoid; }
  .transverse-block h3 {
    font-size: 11pt; text-transform: uppercase; letter-spacing: 1px;
    margin: 10px 0 6px; color: #4338ca;
  }
</style>
</head>
<body>
  <section class="page cover">
    <div class="cover-inner">
      <div class="brand">Cocooning Club</div>
      <h1>Démo du site internet</h1>
      <p class="subtitle">Pour chaque écran du site : la capture à gauche, le quizz UX/UI à droite (parcours, perception, friction, composants, accessibilité) avec un espace de notes libres.</p>
      <div class="meta">Document généré le ${escapeHtml(today)}</div>
      <div class="howto">
        <h3>Comment l'utiliser ?</h3>
        <ul>
          <li><strong>Côté gauche</strong> : capture pleine page de l'écran tel qu'affiché.</li>
          <li><strong>Côté droit</strong> : 4 questions UX (ce que ressent l'utilisatrice) + 4 questions UI (ce qu'elle voit) + notes libres.</li>
          <li>Pour les parcours fonctionnels détaillés, se référer au <strong>guide utilisateur</strong> séparé.</li>
          <li><em>Les captures de l'espace administrateur et membre sont peuplées avec des données factices.</em></li>
        </ul>
      </div>
    </div>
  </section>

  <section class="page toc pb">
    <h2>Sommaire</h2>
    <ul>${tocItems.join("\n")}</ul>
  </section>

  ${pages}
</body>
</html>`;
}

async function htmlToPdf(browser, htmlPath, pdfPath) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", bottom: "12mm", left: "14mm", right: "14mm" },
  });
  await context.close();
}

async function main() {
  await mkdir(SHOTS_DIR, { recursive: true });
  if (!existsSync(CHROMIUM_PATH)) {
    throw new Error(`Chromium introuvable à ${CHROMIUM_PATH}. Lancez "npx playwright install chromium".`);
  }

  await buildSite();
  const dev = startPreviewServer();
  try {
    await waitForServer(BASE_URL);
    log("Serveur prêt.");

    const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
    try {
      const captures = await captureScreenshots(browser);
      log(`Captures terminées (${captures.length}).`);

      const html = buildHtml(captures);
      await writeFile(HTML_PATH, html, "utf-8");
      log(`HTML écrit : ${HTML_PATH}`);

      await htmlToPdf(browser, HTML_PATH, PDF_PATH);
      log(`PDF généré : ${PDF_PATH}`);
    } finally {
      await browser.close();
    }
  } finally {
    dev.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
