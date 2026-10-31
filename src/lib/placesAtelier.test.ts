import { describe, expect, it } from "vitest";
import { estComplet, libellePlacesPrises, placesPrises, placesRestantes, tauxRemplissage } from "./placesAtelier";

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
