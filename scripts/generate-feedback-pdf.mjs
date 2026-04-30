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
      "Test des 5 secondes — qu'avez-vous compris de ce que propose le site juste après l'avoir ouvert ? À qui s'adresse-t-il selon vous ?",
      "Quelle est la première action que vous auriez naturellement envie de faire ? L'avez-vous trouvée facilement ?",
      "Un mot pour décrire l'ambiance émotionnelle dégagée par la page (rassurant, froid, chaleureux, fade…) ? Est-ce ce que vous attendiez d'un « club cocooning » ?",
      "Y a-t-il un élément (mot, image, bouton) qui vous a fait hésiter, douter ou tiquer ?",
      "Qu'est-ce qui pourrait vous freiner avant de vous inscrire ? Quelle question reste sans réponse ?",
      "Si vous deviez recommander la page à une amie, qu'en diriez-vous en une phrase ?",
    ],
  },
  {
    title: "Calendrier",
    path: "/calendrier",
    section: "Site public",
    description:
      "Calendrier public des ateliers et événements à venir.",
    questions: [
      "En arrivant sur cette page, qu'attendiez-vous y trouver ? Le contenu correspond-il à cette attente ?",
      "Comment décririez-vous votre stratégie pour repérer un atelier qui vous intéresse (date, thème, lieu, durée) ?",
      "Quelles informations vous manquent pour décider si un atelier est fait pour vous ?",
      "Préféreriez-vous une vue agenda, liste, mois, ou « prochains » ? Pourquoi ?",
      "Qu'est-ce qui vous donnerait envie de revenir consulter cette page chaque semaine ?",
      "Si vous vouliez vous pré-inscrire, à quel endroit cliqueriez-vous instinctivement ?",
    ],
  },
  {
    title: "Connexion",
    path: "/login",
    section: "Authentification",
    description:
      "Page de connexion à l'espace membre / admin.",
    questions: [
      "Êtes-vous certaine d'être au bon endroit (membre vs administrateur) ? Sinon, qu'est-ce qui prête à confusion ?",
      "Si vous saisissez un mauvais mot de passe, à quoi vous attendez-vous comme retour ?",
      "Le lien « mot de passe oublié » est-il assez visible sans être anxiogène ?",
      "Manque-t-il une option (rester connecté, magic link, « je n'ai pas encore de compte ») ?",
      "Sur mobile, quels champs auriez-vous peur de ne pas voir / saisir correctement ?",
    ],
  },
  {
    title: "Mot de passe oublié",
    path: "/forgot-password",
    section: "Authentification",
    description:
      "Demande d'envoi d'un email de réinitialisation.",
    questions: [
      "Le texte vous rassure-t-il sur le fait que la procédure va aboutir ? Que faudrait-il préciser ?",
      "Combien de temps êtes-vous prête à attendre l'email avant de douter ? La page le précise-t-elle ?",
      "Que faites-vous si vous ne recevez rien — est-ce qu'une issue de secours est offerte ?",
      "Le retour vers la connexion est-il assez visible sans détourner de l'action principale ?",
    ],
  },
  {
    title: "Réinitialisation du mot de passe",
    path: "/reset-password",
    section: "Authentification",
    description:
      "Saisie du nouveau mot de passe (lien reçu par email).",
    questions: [
      "Les contraintes du mot de passe sont-elles affichées AVANT que vous tapiez, et la validation est-elle progressive ?",
      "Le bouton « voir le mot de passe » vous met-il en confiance ou vous gêne-t-il ?",
      "Quel message d'erreur attendez-vous si les deux champs ne correspondent pas ?",
      "Que se passe-t-il après validation — l'auriez-vous deviné ?",
    ],
  },
  {
    title: "Page introuvable (404)",
    path: "/route-inexistante-test",
    section: "Site public",
    description:
      "Page 404 affichée pour une URL inconnue.",
    questions: [
      "Comprenez-vous immédiatement que c'est une erreur, sans culpabiliser ?",
      "Le ton est-il aligné avec l'identité « cocooning » ou semble-t-il sec / technique ?",
      "Quels chemins de rattrapage manquent (recherche, accueil, calendrier, contact) ?",
      "Si vous aviez le pouvoir d'écrire le titre de cette page, que mettriez-vous ?",
    ],
  },
  {
    title: "Admin · Dashboard",
    path: "/admin/dashboard",
    section: "Espace administrateur (accès restreint)",
    description:
      "Tableau de bord administrateur. Sans session, redirige vers /login.",
    questions: [
      "Quelles sont les 3 informations que vous voulez voir EN PREMIER chaque matin ?",
      "Quels indicateurs visibles ici sont du bruit pour vous ?",
      "Quelle action lancez-vous le plus souvent ? Est-elle accessible en 1 clic ?",
      "Y a-t-il un événement qui devrait vous « alerter » (pré-inscriptions en attente, paiement, message) et comment voudriez-vous être prévenue ?",
      "Sur quelle période lisez-vous ces chiffres (semaine, mois, depuis le début) ? Le sait-on ?",
    ],
  },
  {
    title: "Admin · Membres",
    path: "/admin/membres",
    section: "Espace administrateur (accès restreint)",
    description: "Gestion des membres : recherche, filtres, fiche membre.",
    questions: [
      "Décrivez la dernière fois que vous avez cherché un membre — comment l'auriez-vous trouvé ici ?",
      "Quels filtres utilisez-vous le plus en réalité (statut, ancienneté, atelier suivi…) ?",
      "Quelles colonnes voudriez-vous voir / cacher / ajouter ?",
      "Quelles actions en masse vous feraient gagner du temps (export, message, relance) ?",
      "Que doit contenir la fiche d'un membre pour être utile sans être indigeste ?",
    ],
  },
  {
    title: "Admin · Ateliers",
    path: "/admin/ateliers",
    section: "Espace administrateur (accès restreint)",
    description: "Création et gestion des ateliers et événements.",
    questions: [
      "Combien de temps mettez-vous aujourd'hui à créer un atelier ? Qu'est-ce qui vous ralentit ?",
      "Quels champs sont indispensables, lesquels sont du superflu ?",
      "Avez-vous des ateliers récurrents ou semblables qui mériteraient un « modèle / duplication » ?",
      "Comment voudriez-vous gérer la jauge, la liste d'attente, l'annulation ?",
      "Quel est le risque le plus stressant à cette étape (oubli, erreur de date, double-saisie) ?",
    ],
  },
  {
    title: "Admin · Pré-inscriptions",
    path: "/admin/pre-inscriptions",
    section: "Espace administrateur (accès restreint)",
    description: "Suivi des pré-inscriptions et confirmations.",
    questions: [
      "Quels statuts existent vraiment dans votre tête (en attente, à relancer, confirmée, refusée, payée) ?",
      "Quelle est la première chose que vous regardez en arrivant sur cette page ?",
      "Quel délai déclenche une relance manuelle aujourd'hui ? Pourrait-elle être automatique ?",
      "Que voudriez-vous voir directement sur la ligne, sans avoir à ouvrir une fiche ?",
      "Y a-t-il un cas qui vous fait perdre du temps systématiquement ?",
    ],
  },
  {
    title: "Admin · Documents",
    path: "/admin/documents",
    section: "Espace administrateur (accès restreint)",
    description: "Bibliothèque de documents partagés avec les membres.",
    questions: [
      "Quels types de documents sont concernés (règlement, fiches ateliers, factures, photos) ?",
      "Comment voudriez-vous les classer (catégorie, atelier, membre, date) ?",
      "Faut-il que certains documents ne soient visibles que pour certains membres ? Lesquels ?",
      "Comment savez-vous qu'un document est « à jour » ou obsolète ?",
      "Une notification aux membres quand un nouveau document est ajouté — utile ou intrusive ?",
    ],
  },
  {
    title: "Admin · Formulaire",
    path: "/admin/formulaire",
    section: "Espace administrateur (accès restreint)",
    description: "Configuration du formulaire d'inscription public.",
    questions: [
      "Quels champs sont vraiment utiles à votre prise de décision (et lesquels font fuir les candidates) ?",
      "Y a-t-il des questions conditionnelles selon le type de membre / l'atelier visé ?",
      "Que faites-vous d'une réponse aujourd'hui (export, copie, email, base) ? Le flux est-il fluide ?",
      "Préférez-vous un formulaire long (filtre fort) ou court (plus de leads) ?",
      "Comment voudriez-vous prévisualiser le formulaire avant de le publier ?",
    ],
  },
  {
    title: "Admin · Templates de messages",
    path: "/admin/messages-templates",
    section: "Espace administrateur (accès restreint)",
    description: "Modèles de messages (email / SMS) réutilisables.",
    questions: [
      "Quels sont les 3 messages que vous écrivez le plus souvent à la main aujourd'hui ?",
      "Quelles variables voulez-vous pouvoir injecter (prénom, atelier, date, lien) ?",
      "Voulez-vous différencier le ton selon le canal (email vs SMS) ? Le contexte (relance vs accueil) ?",
      "Avez-vous besoin d'un aperçu fidèle avant envoi ? D'un test à votre propre adresse ?",
      "Qui d'autre que vous doit pouvoir modifier ces modèles ?",
    ],
  },
  {
    title: "Admin · Disponibilités",
    path: "/admin/disponibilites",
    section: "Espace administrateur (accès restreint)",
    description: "Gestion des créneaux et disponibilités.",
    questions: [
      "Comment gérez-vous aujourd'hui vos disponibilités (papier, agenda externe, tête) ?",
      "Quelle granularité utilisez-vous (créneau d'1h, demi-journée, semaine entière) ?",
      "Quelles règles de récurrence couvrent 80 % de vos cas ?",
      "Comment marquer rapidement une indisponibilité exceptionnelle (vacances, maladie) ?",
      "Y a-t-il un risque de double-booking aujourd'hui — que devrait empêcher l'outil ?",
    ],
  },
  {
    title: "Admin · Boîte à idées",
    path: "/admin/boite-a-idees",
    section: "Espace administrateur (accès restreint)",
    description: "Suivi des suggestions remontées par les membres.",
    questions: [
      "Que faites-vous d'une idée aujourd'hui — l'oubliez-vous, la stockez-vous, en discutez-vous ?",
      "Quels statuts vous parleraient (nouvelle / à étudier / retenue / refusée / réalisée) ?",
      "Faut-il que les membres voient les idées des autres ? Puissent voter ?",
      "Comment fermez-vous la boucle avec celle qui a proposé l'idée — un message, rien, automatique ?",
      "Quelle idée mériterait d'être mise en avant immédiatement par l'outil ?",
    ],
  },
  {
    title: "Admin · Mon compte",
    path: "/admin/mon-compte",
    section: "Espace administrateur (accès restreint)",
    description: "Paramètres du compte administrateur.",
    questions: [
      "Quelles infos voulez-vous pouvoir modifier vous-même sans appeler un développeur ?",
      "Lesquelles devraient être en lecture seule (sécurité, identité) ?",
      "Comment changez-vous de mot de passe — la procédure vous paraît-elle sûre et simple ?",
      "La déconnexion est-elle évidente, surtout sur un poste partagé ?",
      "Y a-t-il une notion de « co-administratrices » ou multi-comptes que vous anticipez ?",
    ],
  },
];

// Questions transverses appliquées à TOUTES les pages — angle UX classique
// (heuristiques de Nielsen, charge cognitive, accessibilité, mobile).
const CROSS_QUESTIONS = [
  "Hiérarchie visuelle — qu'est-ce que vos yeux voient en premier, en second ? Est-ce volontaire ?",
  "Rythme & densité — la page est-elle trop chargée, trop vide, ou juste ? Que retireriez-vous en priorité ?",
  "Cohérence — couleurs, typographies, ton : repérez-vous une incohérence avec le reste du site ?",
  "Mobile — qu'est-ce qui risque de mal passer sur un écran de téléphone selon vous ?",
  "Accessibilité — un proche malvoyant, peu à l'aise avec le numérique ou pressé saurait-il s'en sortir ?",
  "Confiance — quelque chose ici fait-il douter de la fiabilité, de la sécurité ou du sérieux du club ?",
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

async function loginAsAdmin(page) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    log("⚠️ ADMIN_EMAIL/ADMIN_PASSWORD non définis : pages /admin capturées non authentifiées.");
    return false;
  }
  log(`Connexion administrateur (${email})…`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    log(`  ⚠️ Connexion échouée, URL actuelle : ${currentUrl}`);
    return false;
  }
  log(`  ✓ Connecté, redirigé vers ${currentUrl}`);
  return true;
}

async function captureScreenshots(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const results = [];

  await loginAsAdmin(page);

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
            </div>
          </li>`
        )
        .join("");
      const crossQuestions = CROSS_QUESTIONS.map(
        (q) => `<li class="question cross"><div class="question-text">${escapeHtml(q)}</div>
          <div class="answer-lines"><div class="line"></div></div></li>`
      ).join("");

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
        <h3>Questions ciblées sur cette page</h3>
        <ol class="questions">${questions}</ol>
        <h3>Grille UX transverse</h3>
        <ul class="questions cross-list">${crossQuestions}</ul>
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
  ol.questions, ul.questions { padding-left: 20px; margin: 0 0 8px; }
  ul.cross-list { list-style: "▸  "; padding-left: 18px; }
  .question { margin-bottom: 6px; }
  .question.cross { margin-bottom: 4px; color: #374151; font-size: 10pt; }
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
