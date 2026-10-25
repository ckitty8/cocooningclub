// Assemble le SQL de la migration totale du site à partir de supabase/migration-totale/manifeste.json.
//
//   node scripts/build-migration-package.mjs             écrit supabase/migration-totale/migration-totale.sql
//   node scripts/build-migration-package.mjs --verifier  échoue si le fichier est périmé ou si une migration
//                                                        postérieure à la prod manque dans le manifeste
//
// Voir supabase/migration-totale/README.md.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const dossier = join(racine, "supabase", "migration-totale");
const migrations = join(racine, "supabase", "migrations");
const sortie = join(dossier, "migration-totale.sql");
const manifeste = JSON.parse(readFileSync(join(dossier, "manifeste.json"), "utf8"));

const erreurs = [];

for (const fichier of manifeste.migrations) {
  if (!existsSync(join(migrations, fichier))) erreurs.push(`Migration du manifeste introuvable : ${fichier}`);
}
// Toute migration plus récente que la dernière appliquée en production doit être dans le paquet.
for (const fichier of readdirSync(migrations).filter(f => f.endsWith(".sql")).sort()) {
  const version = fichier.split("_")[0];
  if (version > manifeste.derniereMigrationAppliqueeEnProd && !manifeste.migrations.includes(fichier)) {
    erreurs.push(`Migration absente du manifeste (postérieure à la production) : ${fichier}`);
  }
}
const tri = [...manifeste.migrations].sort();
if (JSON.stringify(tri) !== JSON.stringify(manifeste.migrations)) erreurs.push("Le manifeste doit lister les migrations dans l'ordre.");

const contenu = () => {
  const parties = [
    "-- =====================================================================",
    "-- MIGRATION TOTALE DU SITE : à coller dans le SQL Editor de Supabase.",
    "-- Fichier généré par `npm run migration:build` : ne pas le modifier à la main.",
    "-- Tout est exécuté dans une seule transaction : en cas d'erreur, rien n'est appliqué.",
    `-- Contient : ${manifeste.migrations.join(", ")}`,
    "-- Lancer ensuite verifications.sql (tout doit afficher ok = true).",
    "-- =====================================================================",
    "",
    "BEGIN;",
    "",
  ];
  for (const fichier of manifeste.migrations) {
    parties.push(`-- ---------------------------------------------------------------------`);
    parties.push(`-- ${fichier}`);
    parties.push(`-- ---------------------------------------------------------------------`);
    parties.push(readFileSync(join(migrations, fichier), "utf8").trimEnd());
    parties.push("");
  }
  parties.push("COMMIT;", "");
  return parties.join("\n");
};

if (erreurs.length) {
  console.error(erreurs.join("\n"));
  process.exit(1);
}

const attendu = contenu();
if (process.argv.includes("--verifier")) {
  const actuel = existsSync(sortie) ? readFileSync(sortie, "utf8") : "";
  if (actuel !== attendu) {
    console.error("supabase/migration-totale/migration-totale.sql est périmé : lancez `npm run migration:build`.");
    process.exit(1);
  }
  console.log("Paquet de migration à jour.");
} else {
  writeFileSync(sortie, attendu);
  console.log(`Écrit : ${sortie} (${manifeste.migrations.length} migrations)`);
}
