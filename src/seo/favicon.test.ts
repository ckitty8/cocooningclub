import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Icône du site dans les résultats Google : carrée, dont le côté est un multiple de 48 px, à une adresse
// stable et non bloquée par robots.txt. Sans elle, Google affiche un globe à la place du logo.
const indexHtml = readFileSync("index.html", "utf8");
const icones = [...indexHtml.matchAll(/<link rel="icon"[^>]*>/g)].map(m => {
  const balise = m[0];
  return {
    href: balise.match(/href="([^"]+)"/)![1],
    tailles: balise.match(/sizes="(\d+)x(\d+)"/)?.slice(1).map(Number) ?? [],
  };
});

const taillePng = (chemin: string): [number, number] => {
  const octets = readFileSync(chemin);
  return [octets.readUInt32BE(16), octets.readUInt32BE(20)];
};

describe("icône du site (favicon)", () => {
  it("chaque icône déclarée existe dans public/", () => {
    expect(icones.length).toBeGreaterThanOrEqual(3);
    for (const { href } of icones) expect(existsSync(`public${href}`), href).toBe(true);
  });

  it("la taille déclarée de chaque PNG est la vraie, et l'image est carrée", () => {
    for (const { href, tailles } of icones.filter(i => i.href.endsWith(".png"))) {
      const [largeur, hauteur] = taillePng(`public${href}`);
      expect(largeur, href).toBe(hauteur);
      expect([largeur, hauteur], href).toEqual(tailles);
    }
  });

  it("Google dispose d'au moins une icône dont le côté est un multiple de 48 px", () => {
    const utilisables = icones.filter(i => i.tailles[0] >= 48 && i.tailles[0] % 48 === 0);
    expect(utilisables.length).toBeGreaterThanOrEqual(1);
  });

  it("favicon.ico contient une image 48 × 48", () => {
    const ico = readFileSync("public/favicon.ico");
    const nombre = ico.readUInt16LE(4);
    const largeurs = Array.from({ length: nombre }, (_, i) => ico[6 + 16 * i] || 256);
    expect(largeurs).toContain(48);
  });

  it("robots.txt n'interdit ni le fichier favicon ni les icônes", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    const interdits = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map(m => m[1]);
    for (const chemin of ["/favicon.ico", ...icones.map(i => i.href)]) {
      expect(interdits.some(d => chemin.startsWith(d)), chemin).toBe(false);
    }
  });
});
