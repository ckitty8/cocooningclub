import { describe, expect, it } from "vitest";
import { resumeInscrites } from "./ficheAtelier";

describe("résumé des inscrites", () => {
  const lignes = [
    { statut: "confirme", statut_paiement: "paye", present: true },
    { statut: "confirme", statut_paiement: "en_attente", present: false },
    { statut: "en_attente", statut_paiement: "en_attente", present: null },
    { statut: "annule", statut_paiement: "en_attente", present: false },
  ];
  it("compte et chiffre sur les inscrites confirmées", () => {
    expect(resumeInscrites(lignes, 25)).toEqual({ total: 4, confirmees: 2, aTraiter: 1, presentes: 1, attendu: 50, encaisse: 25 });
  });
  it("un atelier gratuit n'a rien à encaisser", () => {
    expect(resumeInscrites(lignes, 0)).toMatchObject({ attendu: 0, encaisse: 0 });
  });
});
