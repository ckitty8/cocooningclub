import { describe, expect, it } from "vitest";
import { creneauxProposes, reglageCreneaux } from "./creneau";

describe("choix « Je serai présente » proposés par un atelier", () => {
  it("rien hors Business ; les trois par défaut pour un atelier Business", () => {
    expect(creneauxProposes("papotages", null)).toEqual([]);
    expect(creneauxProposes("business", null)).toEqual(["journee", "matin", "apres_midi"]);
    expect(creneauxProposes("business", undefined)).toEqual(["journee", "matin", "apres_midi"]);
  });
  it("suit le réglage de l'atelier, dans l'ordre, et ignore une valeur inconnue", () => {
    expect(creneauxProposes("business", ["apres_midi", "matin", "soir"])).toEqual(["matin", "apres_midi"]);
    expect(creneauxProposes("business", [])).toEqual([]);
  });
  it("enregistre null quand les trois sont cochés", () => {
    expect(reglageCreneaux(["journee", "matin", "apres_midi"])).toBeNull();
    expect(reglageCreneaux(["matin"])).toEqual(["matin"]);
    expect(reglageCreneaux([])).toEqual([]);
  });
});
