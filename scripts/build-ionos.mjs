// Prépare la version du site à déposer sur un hébergement IONOS (Apache) :
//   npm run build:ionos
// 1. vérifie les réglages Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY), lus dans
//    l'environnement ou dans .env.production.local (fichier ignoré par git, jamais publié) ;
// 2. construit le site (vite build : pages pré-générées comprises) ;
// 3. ajoute deploiement/ionos/.htaccess à la racine du site ;
// 4. contrôle Google Analytics : identifiant G-X361LVXTDW présent, aucune balise gtag en dur dans les pages
//    (le script Google n'est chargé qu'après acceptation des cookies statistiques) ;
// 5. crée ionos/cocooningclub-ionos-AAAA-MM-JJ.zip (contenu de dist, à décompresser à la racine du domaine).
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "vite";

const ID_GA = "G-X361LVXTDW";
const URL_SUPABASE_CLUB = "https://rgdhzmweoxgydvzpdtwm.supabase.co";

const env = { ...loadEnv("production", process.cwd(), "VITE_"), ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith("VITE_"))) };
const erreurs = [];
if (!env.VITE_SUPABASE_URL) env.VITE_SUPABASE_URL = URL_SUPABASE_CLUB;
if (!env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  erreurs.push(
    "VITE_SUPABASE_PUBLISHABLE_KEY manque : sans elle le site ne peut pas lire les ateliers ni connecter les membres.\n" +
    "  Copie-la depuis Vercel (Settings > Environment Variables) ou Supabase (Project Settings > API Keys, clé « publishable »),\n" +
    "  puis écris-la dans un fichier .env.production.local à la racine : VITE_SUPABASE_PUBLISHABLE_KEY=...",
  );
}
if (env.VITE_GA_MEASUREMENT_ID && env.VITE_GA_MEASUREMENT_ID.trim() !== ID_GA) {
  erreurs.push(`VITE_GA_MEASUREMENT_ID vaut « ${env.VITE_GA_MEASUREMENT_ID} » au lieu de ${ID_GA} : retire-la ou corrige-la.`);
}
if (erreurs.length) {
  console.error("\n✗ Version IONOS non construite :\n- " + erreurs.join("\n- ") + "\n");
  process.exit(1);
}

console.log("→ Construction du site…");
execSync("npx vite build", { stdio: "inherit", env: { ...process.env, ...env } });

copyFileSync("deploiement/ionos/.htaccess", "dist/.htaccess");

// Contrôles Google Analytics sur le résultat.
const fichiers = [];
const parcourir = dossier => {
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) parcourir(chemin);
    else fichiers.push(chemin);
  }
};
parcourir("dist");
const pages = fichiers.filter(f => f.endsWith(".html"));
const enDur = pages.filter(f => /googletagmanager|gtag\(/.test(readFileSync(f, "utf8")));
if (enDur.length) {
  console.error(`✗ Balise Google en dur dans ${enDur.join(", ")} : elle serait chargée sans consentement et en double.`);
  process.exit(1);
}
const scripts = fichiers.filter(f => f.endsWith(".js"));
const avecId = scripts.filter(f => readFileSync(f, "utf8").includes(ID_GA));
if (avecId.length === 0) {
  console.error(`✗ L'identifiant ${ID_GA} est introuvable dans le site construit.`);
  process.exit(1);
}
if (!scripts.some(f => readFileSync(f, "utf8").includes(env.VITE_SUPABASE_URL))) {
  console.error("✗ L'adresse Supabase est introuvable dans le site construit.");
  process.exit(1);
}

const jour = new Date().toISOString().slice(0, 10);
mkdirSync("ionos", { recursive: true });
const archive = join("ionos", `cocooningclub-ionos-${jour}.zip`);
if (existsSync(archive)) rmSync(archive);
execSync(`cd dist && zip -qr ../${archive} .`, { stdio: "inherit" });

console.log(`\n✓ ${pages.length} pages HTML, Google Analytics ${ID_GA} (chargé seulement après acceptation), .htaccess inclus.`);
console.log(`✓ Archive prête : ${archive}`);
console.log("  À décompresser à la racine du domaine dans IONOS (voir deploiement/ionos/README.md).\n");
