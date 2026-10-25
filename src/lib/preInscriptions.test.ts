import { describe, expect, it } from "vitest";
import { grouperParAtelier, periodeDe } from "./preInscriptions";

const ateliers = [
  { id: "a1", date_atelier: "2026-11-05" },
  { id: "a2", date_atelier: "2026-11-12" },
  { id: "a0", date_atelier: "2026-10-01" },
  { id: "a3", date_atelier: "2026-12-03" },
];
const insc = [
  { id: "i1", atelier_id: "a1", statut: "en_attente", nom: "Marie Dupont" },
  { id: "i2", atelier_id: "a1", statut: "confirme", nom: "Sandrine Roux" },
  { id: "i3", atelier_id: "a2", statut: "confirme", nom: "Julie Martin" },
  { id: "i4", atelier_id: "a0", statut: "confirme", nom: "Aurélie Blanc" },
];
type Insc = (typeof insc)[number];
const base = { filtre: "tous" as const, periode: "avenir" as const, aujourdhui: "2026-10-23", recherche: "", texte: (i: Insc) => i.nom };

describe("regroupement par atelier", () => {
  it("regroupe les atelier à venir par date et ignore ceux sans pré-inscription", () => {
    const g = grouperParAtelier(insc, ateliers, base);
    expect(g.map(x => x.atelier.id)).toEqual(["a1", "a2"]);
    expect(g[0]).toMatchObject({ aTraiter: 1, total: 2 });
    expect(g[0].items).toHaveLength(2);
  });

  it("filtre par statut sans fausser le nombre à traiter", () => {
    const g = grouperParAtelier(insc, ateliers, { ...base, filtre: "confirme" });
    expect(g[0].items.map(i => i.id)).toEqual(["i2"]);
    expect(g[0].aTraiter).toBe(1);
  });

  it("masque un atelier sans ligne visible", () => {
    expect(grouperParAtelier(insc, ateliers, { ...base, filtre: "en_attente" }).map(x => x.atelier.id)).toEqual(["a1"]);
  });

  it("cherche par nom", () => {
    const g = grouperParAtelier(insc, ateliers, { ...base, recherche: "julie" });
    expect(g.map(x => x.atelier.id)).toEqual(["a2"]);
  });

  it("garde l'atelier visé même sans pré-inscription (arrivée depuis « Inscrits »)", () => {
    const g = grouperParAtelier(insc, ateliers, { ...base, cible: "a3" });
    expect(g.map(x => x.atelier.id)).toEqual(["a1", "a2", "a3"]);
    expect(g[2]).toMatchObject({ items: [], total: 0, aTraiter: 0 });
  });

  it("liste les ateliers passés du plus récent au plus ancien", () => {
    const g = grouperParAtelier(insc, ateliers, { ...base, periode: "passes" });
    expect(g.map(x => x.atelier.id)).toEqual(["a0"]);
    expect(periodeDe("2026-10-01", "2026-10-23")).toBe("passes");
    expect(periodeDe("2026-10-23", "2026-10-23")).toBe("avenir");
  });
});
