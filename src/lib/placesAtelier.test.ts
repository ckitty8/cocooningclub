import { describe, expect, it } from "vitest";
import { compterParAtelier, estComplet, libellePlacesPrises, phrasePlacesPrises, placesPrises, placesRestantes, tauxRemplissage } from "./placesAtelier";

describe("places restantes d'un atelier", () => {
  it("augmenter la capacité d'un atelier sans inscrit libère toutes les places", () => expect(placesRestantes(20, 0)).toBe(20));
  it("retire les inscriptions confirmées", () => expect(placesRestantes(12, 5)).toBe(7));
  it("ne devient jamais négatif si la capacité passe sous le nombre d'inscrites", () => expect(placesRestantes(3, 5)).toBe(0));
  it("reste illimité (null) quand la capacité est vide", () => expect(placesRestantes(null, 5)).toBeNull());
});

describe("atelier sans limite de places (places max vide)", () => {
  it("n'est jamais complet à cause des places", () => {
    expect(estComplet({ statut: "publie", places_disponibles: null })).toBe(false);
  });
  it("reste complet si l'administratrice a mis le statut « complet »", () => {
    expect(estComplet({ statut: "complet", places_disponibles: null })).toBe(true);
  });
  it("est complet quand il ne reste plus de place", () => {
    expect(estComplet({ statut: "publie", places_disponibles: 0 })).toBe(true);
    expect(estComplet({ statut: "publie", places_disponibles: 2 })).toBe(false);
  });
  it("s'affiche « illimitées » côté administration, sans taux de remplissage", () => {
    expect(libellePlacesPrises(null, null)).toBe("illimitées");
    expect(libellePlacesPrises(10, 4)).toBe("6/10");
    expect(placesPrises(null, null)).toBeNull();
    expect(tauxRemplissage(null, null)).toBe(0);
    expect(tauxRemplissage(10, 4)).toBe(60);
  });
});

describe("nombre d'inscrites d'un atelier illimité", () => {
  it("affiche les inscriptions confirmées quand elles sont connues", () => {
    expect(placesPrises(null, null, 3)).toBe(3);
    expect(libellePlacesPrises(null, null, 3)).toBe("3/illimitées");
    expect(libellePlacesPrises(null, null, 0)).toBe("0/illimitées");
    expect(tauxRemplissage(null, null)).toBe(0);
  });
  it("ne change rien pour un atelier limité", () => {
    expect(placesPrises(10, 4, 99)).toBe(6);
    expect(libellePlacesPrises(10, 4, 99)).toBe("6/10");
  });
  it("donne une phrase lisible", () => {
    expect(phrasePlacesPrises(10, 4)).toBe("6/10 places prises");
    expect(phrasePlacesPrises(null, null)).toBe("places illimitées");
    expect(phrasePlacesPrises(null, null, 1)).toBe("1 inscrite · places illimitées");
    expect(phrasePlacesPrises(null, null, 4)).toBe("4 inscrites · places illimitées");
  });
  it("compte les inscriptions par atelier", () => {
    expect(compterParAtelier([{ atelier_id: "a" }, { atelier_id: "b" }, { atelier_id: "a" }, { atelier_id: null }])).toEqual({ a: 2, b: 1 });
  });
});
