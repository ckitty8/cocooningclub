import { describe, expect, it } from "vitest";
import { ateliersParEspace, casesDuMois, chiffresAteliers, couleurEspace, moisSuivant, vacancesDuJour } from "./calendrierAteliers";

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

describe("vacances scolaires dans le calendrier", () => {
  const toussaint = { id: "v1", nom: "de la Toussaint", date_debut: "2026-10-17", date_fin: "2026-11-02" };
  it("couvre la période dates incluses", () => {
    expect(vacancesDuJour([toussaint], "2026-10-17")).toBe(toussaint);
    expect(vacancesDuJour([toussaint], "2026-10-31")).toBe(toussaint);
    expect(vacancesDuJour([toussaint], "2026-11-02")).toBe(toussaint);
  });
  it("ne couvre pas les jours avant et après", () => {
    expect(vacancesDuJour([toussaint], "2026-10-16")).toBeUndefined();
    expect(vacancesDuJour([toussaint], "2026-11-03")).toBeUndefined();
    expect(vacancesDuJour([], "2026-10-20")).toBeUndefined();
  });
});

describe("ateliers par espace (tableau de bord)", () => {
  const espaces = [
    { id: "p", nom: "Papotages", slug: "papotages" },
    { id: "b", nom: "Business", slug: "business" },
    { id: "c", nom: "Coworking", slug: "coworking" },
  ];
  it("compte à venir, passés, brouillons et total par espace, dans l'ordre des espaces", () => {
    const l = ateliersParEspace([
      { date_atelier: "2026-11-10", statut: "publie", espace_id: "p" },
      { date_atelier: "2026-11-20", statut: "complet", espace_id: "p" },
      { date_atelier: "2026-10-01", statut: "termine", espace_id: "p" },
      { date_atelier: "2026-10-02", statut: "annule", espace_id: "p" },
      { date_atelier: "2026-12-01", statut: "brouillon", espace_id: "b" },
      { date_atelier: "2026-12-01", statut: "publie", espace_id: "inconnu" },
    ], espaces, "2026-11-06");
    expect(l.map(x => [x.slug, x.aVenir, x.passes, x.brouillons, x.total])).toEqual([
      ["papotages", 2, 1, 0, 4],
      ["business", 0, 0, 1, 1],
      ["coworking", 0, 0, 0, 0],
    ]);
  });
  it("donne une couleur au nouvel espace Coworking", () => {
    expect(couleurEspace("coworking")).toBe("#5f7a8a");
  });
});
