import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { pageHtml, pagesAGenerer } from "./src/seo/genererPages";

/**
 * À la fin de `vite build`, écrit dist/<page>/index.html pour chaque page publique à indexer.
 * Vercel sert un fichier existant avant d'appliquer la redirection vers index.html (vercel.json).
 */
export const seoStatique = (): Plugin => {
  let dossierSortie = "";
  return {
    name: "seo-statique",
    apply: "build",
    configResolved(config) {
      dossierSortie = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const modele = readFileSync(path.join(dossierSortie, "index.html"), "utf8");
      for (const page of pagesAGenerer()) {
        const dossier = path.join(dossierSortie, page.chemin);
        mkdirSync(dossier, { recursive: true });
        writeFileSync(path.join(dossier, "index.html"), pageHtml(modele, page));
      }
    },
  };
};
