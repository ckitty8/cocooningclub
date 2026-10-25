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
const manifeste = JSON.parse(readFileSync(join(dossier, "manifeste.json"), "utf8"));

// Deux fichiers SQL : les migrations additives (applicables avant la mise en ligne du site) et celles qui
// renomment ou suppriment ce que l'ancien code utilise encore (à appliquer au moment du déploiement).
const paquets = [
  {
    sortie: join(dossier, "migration-totale.sql"),
    liste: manifeste.migrations,
    titre: "MIGRATION TOTALE DU SITE : à coller dans le SQL Editor de Supabase.",
    suite: "Lancer ensuite verifications.sql (tout doit afficher ok = true).",
  },
  {
    sortie: join(dossier, "migration-deploiement.sql"),
    liste: manifeste.migrationsAuDeploiement ?? [],
    titre: "MIGRATIONS À APPLIQUER AU DÉPLOIEMENT DU SITE : à coller dans le SQL Editor de Supabase.",
    suite: "À lancer juste après le déploiement du site (l'ancien code n'y survit pas), puis verifications-deploiement.sql.",
  },
];
const toutes = paquets.flatMap(p => p.liste);

const erreurs = [];

for (const fichier of toutes) {
  if (!existsSync(join(migrations, fichier))) erreurs.push(`Migration du manifeste introuvable : ${fichier}`);
}
// Toute migration plus récente que la dernière appliquée en production doit être dans le paquet.
for (const fichier of readdirSync(migrations).filter(f => f.endsWith(".sql")).sort()) {
  const version = fichier.split("_")[0];
  if (version > manifeste.derniereMigrationAppliqueeEnProd && !toutes.includes(fichier)) {
    erreurs.push(`Migration absente du manifeste (postérieure à la production) : ${fichier}`);
  }
}
const tri = [...toutes].sort();
if (JSON.stringify(tri) !== JSON.stringify(toutes)) erreurs.push("Le manifeste doit lister les migrations dans l'ordre (migrations, puis migrationsAuDeploiement).");

const contenu = ({ liste, titre, suite }) => {
  const parties = [
    "-- =====================================================================",
    `-- ${titre}`,
    "-- Fichier généré par `npm run migration:build` : ne pas le modifier à la main.",
    "-- Tout est exécuté dans une seule transaction : en cas d'erreur, rien n'est appliqué.",
    `-- Contient : ${liste.join(", ")}`,
    `-- ${suite}`,
    "-- =====================================================================",
    "",
    "BEGIN;",
    "",
  ];
  for (const fichier of liste) {
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

if (process.argv.includes("--verifier")) {
  for (const paquet of paquets) {
    const actuel = existsSync(paquet.sortie) ? readFileSync(paquet.sortie, "utf8") : "";
    if (actuel !== contenu(paquet)) {
      console.error(`${paquet.sortie} est périmé : lancez \`npm run migration:build\`.`);
      process.exit(1);
    }
  }
  console.log("Paquet de migration à jour.");
} else {
  for (const paquet of paquets) {
    writeFileSync(paquet.sortie, contenu(paquet));
    console.log(`Écrit : ${paquet.sortie} (${paquet.liste.length} migrations)`);
  }
}
