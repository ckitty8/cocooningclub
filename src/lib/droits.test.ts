import { describe, expect, it } from "vitest";
import { droitAtelier, estGratuitPourTous, offreSimulee, offresEnCours, type EspaceDroit } from "./droits";

const papotages: EspaceDroit = { id: "pap", nom: "Papotages", slug: "papotages" };
const creatifs: EspaceDroit = { id: "cre", nom: "Créatifs", slug: "creatifs" };
const business: EspaceDroit = { id: "bus", nom: "Business", slug: "business" };
const espaces = [papotages, creatifs, business];

const atelier = (antenne_id: string, tarif_standard: number | null = 25) => ({ antenne_id, tarif_standard });
const offre = (...ids: string[]) => ({ formule_id: "f", nom: "x", couleur: "mauve", espaces: ids, valable_jusqu_au: "2027-01-01" });

describe("droit d'un atelier selon l'offre (tableau du club)", () => {
  const profils: [string, ReturnType<typeof offre>[], [string, string, string]][] = [
    ["sans adhésion", [], ["gratuit", "a_payer", "a_payer"]],
    ["Business", [offre("bus")], ["gratuit", "a_payer", "inclus"]],
    ["Créatif", [offre("cre")], ["gratuit", "inclus", "a_payer"]],
    ["Complet", [offre("bus", "cre")], ["gratuit", "inclus", "inclus"]],
    ["Business + Créatif séparés", [offre("bus"), offre("cre")], ["gratuit", "inclus", "inclus"]],
  ];
  for (const [nom, offres, [p, c, b]] of profils) {
    it(`${nom} : Papotages ${p}, Créatif ${c}, Business ${b}`, () => {
      expect(droitAtelier(atelier("pap"), espaces, offres).etat).toBe(p);
      expect(droitAtelier(atelier("cre"), espaces, offres).etat).toBe(c);
      expect(droitAtelier(atelier("bus"), espaces, offres).etat).toBe(b);
    });
  }

  it("un atelier à 0 € est gratuit pour tous, un tarif inconnu est à payer", () => {
    expect(droitAtelier(atelier("bus", 0), espaces, []).etat).toBe("gratuit");
    expect(droitAtelier(atelier("bus", null), espaces, []).etat).toBe("a_payer");
  });

  it("donne le montant à régler", () => expect(droitAtelier(atelier("cre", 25), espaces, [])).toEqual({ etat: "a_payer", montant: 25 }));
});

describe("deux tarifs : adhérente et non-adhérente", () => {
  const deuxPrix = { antenne_id: "bus", tarif_standard: 25, tarif_adherent: 18 };
  it("une non-adhérente paie le tarif standard", () => expect(droitAtelier(deuxPrix, espaces, [])).toEqual({ etat: "a_payer", montant: 25 }));
  it("une adhérente Créatif paie le tarif adhérente à un atelier Business", () =>
    expect(droitAtelier(deuxPrix, espaces, [offre("cre")])).toEqual({ etat: "a_payer", montant: 18 }));
  it("sans tarif adhérente, le prix est le même pour tous", () =>
    expect(droitAtelier({ antenne_id: "bus", tarif_standard: 25 }, espaces, [offre("cre")]).montant).toBe(25));
  it("un tarif adhérente à 0 € rend l'atelier gratuit pour les adhérentes seulement", () => {
    const offert = { antenne_id: "bus", tarif_standard: 25, tarif_adherent: 0 };
    expect(droitAtelier(offert, espaces, [offre("cre")]).etat).toBe("gratuit");
    expect(droitAtelier(offert, espaces, []).etat).toBe("a_payer");
  });
  it("l'espace inclus reste inclus, quel que soit le tarif", () =>
    expect(droitAtelier(deuxPrix, espaces, [offre("bus")]).etat).toBe("inclus"));
});

describe("espace gratuit pour tous", () => {
  it("Papotages avant la migration, sinon la colonne décide", () => {
    expect(estGratuitPourTous(papotages)).toBe(true);
    expect(estGratuitPourTous({ ...papotages, gratuit_pour_tous: false })).toBe(false);
    expect(estGratuitPourTous({ ...creatifs, gratuit_pour_tous: true })).toBe(true);
    expect(estGratuitPourTous(creatifs)).toBe(false);
  });
});

describe("offres en cours", () => {
  const formule = { id: "f1", nom: "Cocooning Créatif", couleur: "sauge", formule_espaces: [{ antenne_id: "cre" }] };
  it("ne garde que les adhésions actives et non échues", () => {
    const lignes = [
      { statut: "active", valable_jusqu_au: "2026-11-01", formules: formule },
      { statut: "active", valable_jusqu_au: "2026-10-01", formules: formule },
      { statut: "en_attente", valable_jusqu_au: null, formules: formule },
      { statut: "refusee", valable_jusqu_au: null, formules: formule },
    ];
    expect(offresEnCours(lignes, "2026-10-23")).toHaveLength(1);
    expect(offresEnCours(lignes, "2026-11-01")).toHaveLength(1); // le dernier jour compte
    expect(offresEnCours(lignes, "2026-11-02")).toHaveLength(0);
  });
});

describe("offre simulée", () => {
  it("relie la formule aux espaces par leur nom court", () => {
    expect(offreSimulee("complet", espaces, "2027-10-23")[0].espaces.sort()).toEqual(["bus", "cre"]);
    expect(offreSimulee("creatif", espaces, "2027-10-23")[0].espaces).toEqual(["cre"]);
    expect(offreSimulee("aucune", espaces, "2027-10-23")).toEqual([]);
    expect(offreSimulee(null, espaces, "2027-10-23")).toEqual([]);
  });
});
