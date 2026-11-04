import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// La version IONOS (Apache) doit envoyer les mêmes en-têtes que Vercel : sinon une modification de vercel.json
// (par ex. la CSP) serait oubliée le jour où le site est remis sur IONOS.
const htaccess = readFileSync("deploiement/ionos/.htaccess", "utf8");
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as { headers: { source: string; headers: { key: string; value: string }[] }[] };

describe("version IONOS (deploiement/ionos/.htaccess)", () => {
  it.each(vercel.headers.flatMap(h => h.headers))("reprend l'en-tête $key de vercel.json", ({ key, value }) => {
    expect(htaccess).toContain(`${key} "${value}"`);
  });
  it("sert les pages pré-générées puis renvoie le reste vers l'application", () => {
    expect(htaccess).toContain("RewriteCond %{REQUEST_FILENAME}/index.html -f");
    expect(htaccess.indexOf("/index.html -f")).toBeLessThan(htaccess.indexOf("RewriteRule ^ index.html [L]"));
  });
  it("ne contient aucune balise Google Analytics (chargée par le site seulement après consentement)", () => {
    expect(htaccess).not.toMatch(/G-[A-Z0-9]{6,}|gtag/);
  });
});
