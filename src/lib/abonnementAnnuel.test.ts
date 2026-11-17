import { describe, expect, it } from "vitest";
import { EXEMPLES_ABONNEMENT, calculerAbonnement } from "./abonnementAnnuel";

describe("calculerAbonnement", () => {
  it("exemple Business : abonnement 80 €, atelier 15 €, coworking gratuit, salle 40 €, consommation obligatoire", () => {
    const r = calculerAbonnement({
      abonnement: 80, prixAtelier: 15, ateliersParAn: 12, consommation: 5, coworkingParAn: 12,
      salleParAtelier: 40, salleParCoworking: 0, adherentes: 10, nonAdherentesParAtelier: 3,
    });
    // Non-adhérente : 12 × 15 € d'ateliers + 12 × 5 € de consommation.
    expect(r.nonAdherenteAteliers).toBe(180);
    expect(r.nonAdherenteTotal).toBe(240);
    // Adhérente : 80 € + consommation à chaque venue (12 ateliers + 12 coworkings).
    expect(r.adherenteConsommations).toBe(120);
    expect(r.adherenteTotal).toBe(200);
    // Sur les mêmes ateliers, l'adhérente économise 180 − 80 = 100 € (et a le coworking en plus).
    expect(r.economie).toBe(100);
    // L'abonnement devient avantageux à partir du 6e atelier (5 × 15 = 75 € < 80 €, 6 × 15 = 90 €).
    expect(r.seuilAteliers).toBe(6);
    // Association : 10 × 80 € + 3 × 15 € × 12 ateliers, moins 12 × 40 € de salle.
    expect(r.recettesAbonnements).toBe(800);
    expect(r.recettesUnite).toBe(540);
    expect(r.coutSalle).toBe(480);
    expect(r.solde).toBe(860);
  });

  it("atelier gratuit : pas de seuil, l'abonnement ne fait pas économiser", () => {
    const r = calculerAbonnement({ ...EXEMPLES_ABONNEMENT.papotages, prixAtelier: 0 });
    expect(r.seuilAteliers).toBeNull();
    expect(r.economie).toBe(-80);
  });

  it("compte la salle du coworking si elle est payante", () => {
    const r = calculerAbonnement({ ...EXEMPLES_ABONNEMENT.business, salleParCoworking: 10 });
    expect(r.coutSalle).toBe(12 * 40 + 12 * 10);
  });
});
