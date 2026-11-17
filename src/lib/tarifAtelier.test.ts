import { describe, expect, it } from "vitest";
import { estGratuit, mentionTarif } from "./tarifAtelier";

describe("mentionTarif", () => {
  it("affiche « Gratuit » sans prix ou à 0 €", () => {
    expect(mentionTarif({ tarif_standard: 0 })).toBe("Gratuit");
    expect(mentionTarif({ tarif_standard: null, tarif_affichage: "Offert" })).toBe("Gratuit");
    expect(estGratuit({})).toBe(true);
  });
  it("affiche « Payant pour les non-adhérentes » avec le prix, ou le tarif affiché s'il est saisi", () => {
    expect(mentionTarif({ tarif_standard: 15 })).toBe("Payant pour les non-adhérentes : 15 €");
    expect(mentionTarif({ tarif_standard: 12.5 })).toBe("Payant pour les non-adhérentes : 12,50 €");
    expect(mentionTarif({ tarif_standard: 20, tarif_affichage: " À partir de 20 € " })).toBe("Payant pour les non-adhérentes : À partir de 20 €");
  });
});
