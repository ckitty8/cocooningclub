import { describe, expect, it } from "vitest";
import { calculerCout, niveauxDeRemplissage, positif, scenariosDeRemplissage, type ParametresCout } from "./coutAtelier";

const base: ParametresCout = {
  lignes: [
    { id: "lieu", libelle: "Lieu", montant: 60, mode: "atelier" },
    { id: "animation", libelle: "Animation", montant: 120, mode: "atelier" },
    { id: "materiel", libelle: "Matériel", montant: 5, mode: "participante" },
  ],
  tarifStandard: 30, tarifAdherente: 20,
  nonAdherentes: 4, adherentesPayantes: 4, adherentesIncluses: 2,
  fraisPaiementPct: 0, margeCiblePct: 0, capacite: 12,
};

describe("calcul du coût d'un atelier", () => {
  it("sépare coûts fixes et coûts par participante", () => {
    const r = calculerCout(base);
    expect(r.participantes).toBe(10);
    expect(r.payantes).toBe(8);
    expect(r.coutsFixes).toBe(180);
    expect(r.coutVariableParParticipante).toBe(5);
    expect(r.coutsVariables).toBe(50);
    expect(r.coutTotal).toBe(230);
    expect(r.coutParParticipante).toBe(23);
  });

  it("compte les recettes selon le public : non-adhérentes, adhérentes qui règlent, adhérentes incluses (0 €)", () => {
    const r = calculerCout(base);
    expect(r.recettesBrutes).toBe(4 * 30 + 4 * 20);
    expect(r.resultat).toBe(200 - 230);
  });

  it("retire les frais de paiement des recettes", () => {
    const r = calculerCout({ ...base, fraisPaiementPct: 10 });
    expect(r.fraisPaiement).toBeCloseTo(20);
    expect(r.recettesNettes).toBeCloseTo(180);
    expect(r.resultat).toBeCloseTo(-50);
  });

  it("donne le seuil de rentabilité avec la même répartition du public", () => {
    // recette moyenne 20 € par participante − 5 € de matériel = 15 € ; 180 € de coûts fixes → 12 participantes.
    expect(calculerCout(base).seuilParticipantes).toBe(12);
  });

  it("n'a pas de seuil quand une participante coûte plus qu'elle ne rapporte", () => {
    const r = calculerCout({ ...base, tarifStandard: 3, tarifAdherente: 3 });
    expect(r.seuilParticipantes).toBeNull();
  });

  it("calcule le prix moyen conseillé pour couvrir les coûts, avec une marge visée", () => {
    expect(calculerCout(base).prixMoyenConseille).toBe(28.75); // 230 € / 8 participantes qui règlent
    expect(calculerCout({ ...base, margeCiblePct: 20 }).prixMoyenConseille).toBe(34.5); // 276 € / 8
    expect(calculerCout({ ...base, nonAdherentes: 0, adherentesPayantes: 0 }).prixMoyenConseille).toBeNull();
  });

  it("ignore les saisies vides ou négatives", () => {
    expect(positif("")).toBe(0);
    expect(positif(-5)).toBe(0);
    expect(positif("abc")).toBe(0);
    expect(positif("12.5")).toBe(12.5);
    const r = calculerCout({ ...base, lignes: [{ id: "x", libelle: "Négatif", montant: -50, mode: "atelier" }], nonAdherentes: -3 });
    expect(r.coutTotal).toBe(5 * 0 + 0);
    expect(r.participantes).toBe(6);
  });

  it("ne donne pas de coût par participante sans participante", () => {
    const r = calculerCout({ ...base, nonAdherentes: 0, adherentesPayantes: 0, adherentesIncluses: 0 });
    expect(r.coutParParticipante).toBeNull();
    expect(r.seuilParticipantes).toBeNull();
  });
});

describe("scénarios de remplissage", () => {
  it("propose le minimum, la moitié, les trois quarts et le complet", () => {
    expect(niveauxDeRemplissage(12)).toEqual([5, 6, 9, 12]);
    expect(niveauxDeRemplissage(20)).toEqual([5, 10, 15, 20]);
    expect(niveauxDeRemplissage(4)).toEqual([2, 3, 4]);
    expect(niveauxDeRemplissage(0)).toEqual([]);
  });

  it("recalcule le résultat à d'autres remplissages en gardant la répartition du public", () => {
    const lignes = scenariosDeRemplissage(base, [5, 10, 20]);
    expect(lignes.map(l => l.participantes)).toEqual([5, 10, 20]);
    // À 10 participantes, c'est le cas saisi.
    expect(lignes[1].resultat).toBe(calculerCout(base).resultat);
    // À 20 participantes : 8 non-adhérentes, 8 adhérentes qui règlent, 4 incluses.
    expect(lignes[2].recettesNettes).toBe(8 * 30 + 8 * 20);
    expect(lignes[2].coutTotal).toBe(180 + 20 * 5);
  });

  it("ne propose rien sans public saisi", () => {
    expect(scenariosDeRemplissage({ ...base, nonAdherentes: 0, adherentesPayantes: 0, adherentesIncluses: 0 }, [5])).toEqual([]);
  });
});
