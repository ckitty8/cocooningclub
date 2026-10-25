// Audit statique du code de src/ : code mort, liens cassés, restes de mise au point, doublons.
//
//   node scripts/audit-code.mjs            # rapport lisible, code de sortie 1 s'il y a des ERREURS
//   node scripts/audit-code.mjs --json     # même rapport au format JSON (pour le skill revue-qualite)
//
// ERREURS (à corriger) : lien interne vers une page qui n'existe pas, export jamais utilisé,
// fichier jamais importé, console.log / debugger / TODO / FIXME.
// AVERTISSEMENTS (à juger) : page jamais liée, ligne identique à plusieurs endroits, fichier très long.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const RACINE = resolve(dirname(new URL(import.meta.url).pathname), "..");
const SRC = join(RACINE, "src");
const EN_JSON = process.argv.includes("--json");

const erreurs = [];
const avertissements = [];
const erreur = (controle, detail) => erreurs.push({ controle, detail });
const avertir = (controle, detail) => avertissements.push({ controle, detail });

// ── Fichiers ──────────────────────────────────────────────
const lister = dossier =>
  readdirSync(dossier).flatMap(nom => {
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory() ? lister(chemin) : [chemin];
  });

const fichiers = lister(SRC).filter(f => /\.(ts|tsx)$/.test(f));
const estTest = f => /\.test\.(ts|tsx)$/.test(f) || f.includes(`${join("src", "test")}`);
// Les types générés par Supabase ne sont pas du code écrit à la main : hors doublons et longueur.
const sources = fichiers.filter(f => !estTest(f));
const ecrits = sources.filter(f => !f.includes(join("src", "integrations")));
const texte = new Map(fichiers.map(f => [f, readFileSync(f, "utf8")]));
const rel = f => relative(RACINE, f);

// ── 1. Restes de mise au point ─────────────────────────────
for (const f of sources) {
  texte.get(f).split("\n").forEach((ligne, i) => {
    if (/\bconsole\.log\(|\bdebugger\b/.test(ligne)) erreur("Reste de mise au point", `${rel(f)}:${i + 1} ${ligne.trim()}`);
    if (/\b(TODO|FIXME)\b/.test(ligne)) erreur("TODO / FIXME", `${rel(f)}:${i + 1} ${ligne.trim()}`);
  });
}

// ── 2. Code mort : exports jamais utilisés ──────────────────
const motEn = (nom, contenu) => (contenu.match(new RegExp(`\\b${nom}\\b`, "g")) ?? []).length;
const tout = fichiers.map(f => texte.get(f)).join("\n");
const exportsDe = contenu => [...contenu.matchAll(/^export\s+(?:default\s+)?(?:async\s+)?(?:const|let|function|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/gm)].map(m => m[1]);

for (const f of sources) {
  if (f.endsWith("vite-env.d.ts") || f.includes(`${join("src", "integrations", "supabase")}`)) continue;
  for (const nom of new Set(exportsDe(texte.get(f)))) {
    // Un export est utile s'il apparaît ailleurs que dans sa propre définition (autre fichier, test inclus,
    // ou usage interne au fichier en plus de la déclaration).
    const ailleurs = fichiers.some(g => g !== f && motEn(nom, texte.get(g)) > 0);
    const interne = motEn(nom, texte.get(f)) > 1;
    if (!ailleurs && !interne) erreur("Code mort : export jamais utilisé", `${rel(f)} → ${nom}`);
  }
}

// ── 3. Code mort : fichiers jamais importés ─────────────────
const pointsEntree = new Set(["main.tsx", "App.tsx", "vite-env.d.ts"].map(n => join(SRC, n)));
const importes = new Set();
for (const f of fichiers) {
  for (const m of texte.get(f).matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
    const spec = m[1];
    let base = null;
    if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
    else if (spec.startsWith(".")) base = resolve(dirname(f), spec);
    if (!base) continue;
    for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) importes.add(c);
  }
}
for (const f of sources) {
  if (pointsEntree.has(f) || importes.has(f)) continue;
  erreur("Code mort : fichier jamais importé", rel(f));
}

// ── 4. Cohérence pages ↔ liens ──────────────────────────────
const app = texte.get(join(SRC, "App.tsx")) ?? "";
const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(m => m[1]).filter(p => p !== "*");
const versRegex = chemin =>
  new RegExp(`^${chemin.replace(/:[^/]+/g, "[^/]+").replace(/\*/g, ".*")}/?$`);
const motifs = routes.map(r => ({ route: r, re: versRegex(r) }));

const liens = [];
for (const f of sources) {
  const contenu = texte.get(f);
  const motif = /(?:\bto=|\bhref=|\bhref:\s*|navigate\(|\bto:\s*|<Navigate\s+to=)\s*[{(]?\s*["'`](\/[^"'`$]*)/g;
  for (const m of contenu.matchAll(motif)) {
    const cible = m[1].split(/[?#]/)[0];
    if (cible === "" || /\.(webp|png|jpg|svg|pdf|xml|txt|ico)$/.test(cible)) continue;
    liens.push({ fichier: rel(f), cible });
  }
}
for (const { fichier, cible } of liens) {
  const sansFin = cible.length > 1 ? cible.replace(/\/$/, "") : cible;
  if (!motifs.some(({ re }) => re.test(sansFin))) erreur("Lien vers une page inexistante", `${fichier} → ${cible}`);
}
const ciblees = new Set(liens.map(l => l.cible.replace(/\/$/, "") || "/"));
for (const { route } of motifs) {
  if (route === "/") continue;
  const lie = [...ciblees].some(c => versRegex(route).test(c)) || route.includes(":") && [...ciblees].some(c => c.startsWith(route.split("/:")[0]));
  if (!lie) avertir("Page jamais liée depuis le code", route);
}

// ── 5. Doublons : même ligne à plusieurs endroits ───────────
const vues = new Map();
for (const f of ecrits) {
  texte.get(f).split("\n").forEach((ligne, i) => {
    const t = ligne.trim();
    if (t.length < 90 || /^(import|export \{|\/\/|\*|\/\*)/.test(t) || /className=/.test(t)) return;
    (vues.get(t) ?? vues.set(t, []).get(t)).push(`${rel(f)}:${i + 1}`);
  });
}
for (const [ligne, ou] of vues) {
  if (ou.length >= 2) avertir("Doublon", `${ou.length}× « ${ligne.slice(0, 100)}${ligne.length > 100 ? "…" : ""} » : ${ou.slice(0, 4).join(", ")}`);
}

// ── 6. Fichiers très longs ──────────────────────────────────
for (const f of ecrits) {
  const n = texte.get(f).split("\n").length;
  if (n > 700) avertir("Fichier très long (à découper)", `${rel(f)} : ${n} lignes`);
}

// ── Rapport ─────────────────────────────────────────────────
if (EN_JSON) {
  console.log(JSON.stringify({ erreurs, avertissements, fichiers: sources.length, routes: routes.length, liens: liens.length }, null, 2));
} else {
  const grouper = liste => liste.reduce((g, e) => ((g[e.controle] ??= []).push(e.detail), g), {});
  for (const [titre, liste] of [["ERREURS", erreurs], ["AVERTISSEMENTS", avertissements]]) {
    console.log(`\n== ${titre} (${liste.length}) ==`);
    for (const [controle, details] of Object.entries(grouper(liste))) {
      console.log(`\n${controle} (${details.length})`);
      for (const d of details) console.log(`  - ${d}`);
    }
  }
  console.log(`\n${sources.length} fichiers, ${routes.length} pages, ${liens.length} liens internes analysés.`);
  console.log(erreurs.length === 0 ? "✔ Aucune erreur" : `✘ ${erreurs.length} erreur(s)`);
}
process.exit(erreurs.length === 0 ? 0 : 1);
