import { describe, expect, it } from "vitest";
import { casesDuMois, chiffresAteliers, moisSuivant } from "./calendrierAteliers";

describe("grille d'un mois", () => {
  it("commence le lundi (novembre 2026 : le 1er est un dimanche)", () => {
    const c = casesDuMois(2026, 10);
    expect(c.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(c.filter(Boolean)).toHaveLength(30);
    expect(c.length % 7).toBe(0);
  });
  it("gère février d'une année bissextile", () => {
    expect(casesDuMois(2028, 1).filter(Boolean)).toHaveLength(29);
  });
  it("passe d'une année à l'autre", () => {
    expect(moisSuivant(2026, 11, 1)).toEqual({ annee: 2027, mois: 0 });
    expect(moisSuivant(2027, 0, -1)).toEqual({ annee: 2026, mois: 11 });
  });
});

describe("chiffres des ateliers", () => {
  const ateliers = [
    { date_atelier: "2026-11-05", statut: "publie", places_disponibles: 4 },
    { date_atelier: "2026-11-12", statut: "complet", places_disponibles: 0 },
    { date_atelier: "2026-11-20", statut: "brouillon", places_disponibles: 17 },
    { date_atelier: "2026-10-01", statut: "termine", places_disponibles: 2 },
  ];
  it("ne compte que les ateliers à venir proposés", () => {
    expect(chiffresAteliers(ateliers, "2026-10-23")).toEqual({ aVenir: 2, placesLibres: 4, brouillons: 1 });
  });
});
