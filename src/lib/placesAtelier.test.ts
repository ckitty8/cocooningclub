import { describe, expect, it } from "vitest";
import { placesRestantes } from "./placesAtelier";

describe("places restantes d'un atelier", () => {
  it("augmenter la capacité d'un atelier sans inscrit libère toutes les places", () => expect(placesRestantes(20, 0)).toBe(20));
  it("retire les inscriptions confirmées", () => expect(placesRestantes(12, 5)).toBe(7));
  it("ne devient jamais négatif si la capacité passe sous le nombre d'inscrites", () => expect(placesRestantes(3, 5)).toBe(0));
});
