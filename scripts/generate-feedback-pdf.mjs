// Génère un PDF de revue UX/UI : pour chaque page du site, une capture d'écran
// suivie de questions et d'un espace pour les notes utilisateur.
//
// Utilisation : npm run feedback:pdf
// Le script démarre un serveur Vite, capture chaque route via Playwright,
// puis assemble un PDF en imprimant un document HTML avec Playwright.

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "feedback");
const SHOTS_DIR = path.join(OUT_DIR, "screenshots");
const PDF_PATH = path.join(OUT_DIR, "cocooningclub-feedback.pdf");
const HTML_PATH = path.join(OUT_DIR, "cocooningclub-feedback.html");

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

// Chemin local de Chromium (préinstallé dans l'environnement)
const CHROMIUM_PATH = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const VIEWPORT = { width: 1440, height: 900 };

// Liste des pages à auditer. Les pages /admin/* nécessitent une session
// administrateur : sans authentification, elles redirigent vers /login.
// On les inclut tout de même pour documenter le parcours complet.
const PAGES = [
  {
    title: "Accueil",
    path: "/",
    section: "Site public",
    description:
      "Page d'atterrissage publique : présentation du club, des activités et CTA d'inscription.",
    questions: [
      "La proposition de valeur est-elle claire dès la première vue ?",
      "Le ton et l'identité visuelle correspondent-ils à l'esprit du club ?",
      "Les appels à l'action (s'inscrire, découvrir, contacter) sont-ils visibles et compréhensibles ?",
      "Manque-t-il des informations essentielles avant le scroll ?",
    ],
  },
  {
    title: "Calendrier",
    path: "/calendrier",
    section: "Site public",
    description:
      "Calendrier public des ateliers et événements à venir.",
    questions: [
      "La lecture du calendrier est-elle intuitive ?",
      "Les filtres / catégories proposés sont-ils suffisants ?",
      "Le passage à une vue mensuelle ou liste serait-il utile ?",
      "Comment souhaiteriez-vous vous pré-inscrire à un événement depuis cette page ?",
    ],
  },
  {
    title: "Connexion",
    path: "/login",
    section: "Authentification",
    description:
      "Page de connexion à l'espace membre / admin.",
    questions: [
      "Les libellés et messages d'erreur sont-ils suffisamment explicites ?",
      "L'accès au mot de passe oublié est-il facile à trouver ?",
      "Faut-il prévoir une connexion via email magique ou réseaux sociaux ?",
    ],
  },
  {
    title: "Mot de passe oublié",
    path: "/forgot-password",
    section: "Authentification",
    description:
      "Demande d'envoi d'un email de réinitialisation de mot de passe.",
    questions: [
      "Le message rassurant après envoi est-il clair ?",
      "Le retour vers la page de connexion est-il évident ?",
    ],
  },
  {
    title: "Réinitialisation du mot de passe",
    path: "/reset-password",
    section: "Authentification",
    description:
      "Saisie du nouveau mot de passe (lien reçu par email).",
    questions: [
      "Les règles de mot de passe sont-elles affichées clairement ?",
      "Le retour de confirmation est-il rassurant ?",
    ],
  },
  {
    title: "Page introuvable (404)",
    path: "/route-inexistante-test",
    section: "Site public",
    description:
      "Page 404 affichée pour une URL inconnue.",
    questions: [
      "Le ton de la page 404 est-il cohérent avec le reste du site ?",
      "Les liens de retour proposés sont-ils utiles ?",
    ],
  },
  {
    title: "Admin · Dashboard",
    path: "/admin/dashboard",
    section: "Espace administrateur (accès restreint)",
    description:
      "Tableau de bord administrateur : indicateurs et accès rapides. Sans session admin, redirige vers la connexion.",
    questions: [
      "Les indicateurs présents sont-ils les bons pour piloter l'activité ?",
      "Quels accès rapides voudriez-vous ajouter / retirer ?",
    ],
  },
  {
    title: "Admin · Membres",
    path: "/admin/membres",
    section: "Espace administrateur (accès restreint)",
    description:
      "Gestion des membres : recherche, filtres, fiche membre.",
    questions: [
      "Les filtres et colonnes correspondent-ils à votre besoin quotidien ?",
      "Quelles actions en masse seraient utiles ?",
    ],
  },
  {
    title: "Admin · Ateliers",
    path: "/admin/ateliers",
    section: "Espace administrateur (accès restreint)",
    description:
      "Création et gestion des ateliers et événements.",
    questions: [
      "La création d'un atelier est-elle suffisamment guidée ?",
      "Faut-il prévoir des modèles d'ateliers récurrents ?",
    ],
  },
  {
    title: "Admin · Pré-inscriptions",
    path: "/admin/pre-inscriptions",
    section: "Espace administrateur (accès restreint)",
    description:
      "Suivi des pré-inscriptions et confirmations.",
    questions: [
      "Le statut de chaque pré-inscription est-il facile à interpréter ?",
      "Quelles relances automatiques voudriez-vous configurer ?",
    ],
  },
  {
    title: "Admin · Documents",
    path: "/admin/documents",
    section: "Espace administrateur (accès restreint)",
    description:
      "Bibliothèque de documents partagés avec les membres.",
    questions: [
      "Les catégories actuelles vous suffisent-elles ?",
      "Faut-il pouvoir restreindre certains documents par profil ?",
    ],
  },
  {
    title: "Admin · Formulaire",
    path: "/admin/formulaire",
    section: "Espace administrateur (accès restreint)",
    description:
      "Configuration du formulaire d'inscription public.",
    questions: [
      "Les champs proposés correspondent-ils à votre besoin ?",
      "Souhaitez-vous des champs conditionnels ou obligatoires selon le type de membre ?",
    ],
  },
  {
    title: "Admin · Templates de messages",
    path: "/admin/messages-templates",
    section: "Espace administrateur (accès restreint)",
    description:
      "Modèles de messages (email / SMS) réutilisables.",
    questions: [
      "Quels variables / champs dynamiques sont indispensables ?",
      "Faut-il prévoir un aperçu avant envoi ?",
    ],
  },
  {
    title: "Admin · Disponibilités",
    path: "/admin/disponibilites",
    section: "Espace administrateur (accès restreint)",
    description:
      "Gestion des créneaux et disponibilités.",
    questions: [
      "La saisie en lot est-elle suffisamment rapide ?",
      "Quelles règles de récurrence aimeriez-vous ?",
    ],
  },
  {
    title: "Admin · Boîte à idées",
    path: "/admin/boite-a-idees",
    section: "Espace administrateur (accès restreint)",
    description:
      "Suivi des suggestions remontées par les membres.",
    questions: [
      "Quels statuts (à étudier / en cours / refusé / fait) souhaitez-vous ?",
      "Les membres doivent-ils pouvoir voter sur les idées ?",
    ],
  },
  {
    title: "Admin · Mon compte",
    path: "/admin/mon-compte",
    section: "Espace administrateur (accès restreint)",
    description:
      "Paramètres du compte administrateur.",
    questions: [
      "Quelles informations / préférences manquent ?",
      "La déconnexion est-elle facile à trouver ?",
    ],
  },
];

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

// Variables d'environnement injectées au build/preview pour permettre au
// client Supabase de s'initialiser même sans backend réel : sans cela,
// `createClient(undefined, undefined)` lève "supabaseUrl is required" et
// l'app reste blanche. Ces valeurs sont factices et utilisées uniquement
// pour la capture d'écrans visuelle.
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
  const page = await context.newPage();
  const results = [];

  for (const def of PAGES) {
    const url = `${BASE_URL}${def.path}`;
    const filename = (def.path === "/" ? "index" : def.path.replace(/^\//, "").replace(/\//g, "_")) + ".png";
    const file = path.join(SHOTS_DIR, filename);
    log(`Capture ${def.title} (${url})`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      // Attend que React ait monté du contenu dans #root
      await page.waitForFunction(
        () => {
          const root = document.getElementById("root");
          return root && root.children.length > 0 && root.innerText.trim().length > 0;
        },
        null,
        { timeout: 15_000 }
      ).catch(() => log(`  ⚠️ #root toujours vide pour ${def.path}`));
      // Laisse les animations / images se stabiliser
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

  let pageNumber = 1;
  const pages = captures
    .map((c) => {
      const questions = c.questions
        .map(
          (q) => `
          <li class="question">
            <div class="question-text">${escapeHtml(q)}</div>
            <div class="answer-lines">
              <div class="line"></div>
              <div class="line"></div>
              <div class="line"></div>
            </div>
          </li>`
        )
        .join("");

      const num = pageNumber++;
      return `
      <section class="page page-feedback pb">
        <header class="page-header">
          <div class="page-num">#${num}</div>
          <div>
            <div class="section-tag">${escapeHtml(c.section)}</div>
            <h2>${escapeHtml(c.title)}</h2>
            <div class="path">${escapeHtml(c.path)}</div>
          </div>
        </header>
        <p class="description">${escapeHtml(c.description)}</p>
        <div class="screenshot-wrap">
          <img src="${encodeURI(c.file)}" alt="Capture de ${escapeHtml(c.title)}" />
        </div>
        <h3>Questions</h3>
        <ol class="questions">${questions}</ol>
        <h3>Notes libres</h3>
        <div class="notes-box">
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
        </div>
      </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Cocooning Club — Retour utilisateur</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1f2937;
    font-size: 11pt;
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
  .cover { padding-top: 30mm; text-align: center; }
  .cover .brand { font-size: 14pt; letter-spacing: 4px; text-transform: uppercase; color: #9ca3af; }
  .cover h1 { font-size: 32pt; margin: 12mm 0 4mm; }
  .cover .subtitle { font-size: 13pt; color: #4b5563; max-width: 480px; margin: 0 auto; }
  .cover .meta { margin-top: 18mm; color: #6b7280; font-size: 10pt; }
  .cover .howto {
    margin: 18mm auto 0; max-width: 520px; text-align: left;
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px;
  }
  .cover .howto h3 { font-size: 12pt; margin-bottom: 6px; }
  .cover .howto ul { margin: 0; padding-left: 18px; }

  /* TOC */
  .toc h2 { border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
  .toc ol, .toc ul { list-style: none; padding: 0; margin: 0; }
  .toc-section {
    margin-top: 12px; font-weight: 600; color: #6b7280;
    text-transform: uppercase; letter-spacing: 1px; font-size: 9pt;
  }
  .toc-item {
    display: flex; justify-content: space-between; gap: 12px;
    padding: 4px 0; border-bottom: 1px dotted #e5e7eb;
  }
  .toc-path { color: #9ca3af; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9pt; }

  /* Feedback page */
  .page-feedback .page-header {
    display: flex; gap: 14px; align-items: flex-start;
    border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 10px;
  }
  .page-num {
    background: #111827; color: white; border-radius: 6px; padding: 4px 10px;
    font-weight: 700; font-size: 12pt; min-width: 38px; text-align: center;
  }
  .section-tag {
    display: inline-block; background: #eef2ff; color: #4338ca;
    padding: 2px 8px; border-radius: 999px; font-size: 9pt; margin-bottom: 4px;
  }
  .page-feedback h2 { font-size: 18pt; }
  .path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #6b7280; font-size: 9.5pt; }
  .description { color: #374151; margin: 6px 0 10px; }
  .screenshot-wrap {
    border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;
    margin: 6px 0 12px; background: #f3f4f6;
    page-break-inside: avoid;
  }
  .screenshot-wrap img { width: 100%; height: auto; display: block; max-height: 120mm; object-fit: contain; }
  h3 { font-size: 11pt; margin-top: 10px; margin-bottom: 6px; color: #111827; text-transform: uppercase; letter-spacing: 1px; }
  ol.questions { padding-left: 20px; margin: 0 0 8px; }
  .question { margin-bottom: 8px; }
  .question-text { font-weight: 500; }
  .answer-lines .line, .notes-box .line {
    border-bottom: 1px solid #d1d5db; height: 6mm;
  }
  .notes-box { margin-top: 4px; }

  footer.print-foot {
    position: fixed; bottom: 6mm; left: 14mm; right: 14mm;
    color: #9ca3af; font-size: 8pt; display: flex; justify-content: space-between;
    border-top: 1px solid #e5e7eb; padding-top: 3px;
  }
</style>
</head>
<body>
  <section class="page cover">
    <div class="brand">Cocooning Club</div>
    <h1>Retour utilisateur</h1>
    <p class="subtitle">Un parcours visuel de chaque page du site, accompagné de questions et d'espaces de notes pour recueillir vos impressions.</p>
    <div class="meta">Document généré le ${escapeHtml(today)}</div>
    <div class="howto">
      <h3>Comment l'utiliser ?</h3>
      <ul>
        <li>Imprimez le document ou annotez-le directement dans votre lecteur PDF.</li>
        <li>Pour chaque page : observez la capture, répondez aux questions puis utilisez l'espace « Notes libres ».</li>
        <li>Les pages d'administration nécessitent une connexion — la capture peut donc afficher l'écran de login.</li>
      </ul>
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
    margin: { top: "18mm", bottom: "18mm", left: "14mm", right: "14mm" },
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
