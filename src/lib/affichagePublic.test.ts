import { describe, expect, it } from "vitest";
import { AFFICHAGE_PAR_DEFAUT, normaliserAffichage, reglageDepuis } from "./affichagePublic";

describe("affichage public des ateliers", () => {
  it("sans réglage : tout sauf les places sur l'accueil, tout sur le calendrier", () => {
    const r = reglageDepuis(null);
    expect(r.accueil.has("places")).toBe(false);
    expect(r.accueil.has("tarif")).toBe(true);
    expect(r.calendrier.has("places")).toBe(true);
    expect([...r.calendrier]).toEqual(AFFICHAGE_PAR_DEFAUT.calendrier);
  });
  it("garde l'ordre de la page et ignore les valeurs inconnues ou propres à l'autre page", () => {
    expect(normaliserAffichage("calendrier", ["tarif", "inconnu", "matin_apres_midi", "lieu"])).toEqual(["lieu", "tarif"]);
    expect(normaliserAffichage("accueil", [])).toEqual([]);
  });
});
