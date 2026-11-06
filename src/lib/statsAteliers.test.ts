import { describe, expect, it } from "vitest";
import { bornesPeriode, filtrerAteliers, statistiquesAteliers, type AtelierStat, type Filtres, type InscriptionStat } from "./statsAteliers";

const JOUR = "2026-11-06";
const espaces = [
  { id: "p", nom: "Papotages", slug: "papotages" },
  { id: "b", nom: "Business", slug: "business" },
];
const atelier = (id: string, espace: string, date: string, extra: Partial<AtelierStat> = {}): AtelierStat => ({
  id, titre: `Atelier ${id}`, date_atelier: date, statut: "publie", places_max: 10, places_disponibles: 10, espace_id: espace, ...extra,
});
const insc = (atelier_id: string, statut: string, present = false, creneau: string | null = null): InscriptionStat => ({ atelier_id, statut, present, creneau });
const tous: Filtres = { periode: "tout", espaces: [], brouillons: false, annules: false };

const ateliers = [
  atelier("p1", "p", "2026-10-10", { statut: "termine" }),
  atelier("p2", "p", "2026-11-20", { places_max: null, places_disponibles: null }),
  atelier("b1", "b", "2026-10-20", { statut: "termine" }),
  atelier("b2", "b", "2026-12-01", { statut: "brouillon" }),
];
const inscriptions = [
  insc("p1", "confirme", true), insc("p1", "confirme", false), insc("p1", "annule"),
  insc("p2", "confirme"), insc("p2", "en_attente"),
  insc("b1", "confirme", true, "journee"), insc("b1", "confirme", true, "matin"), insc("b1", "confirme", false, "apres_midi"), insc("b1", "confirme", true, null),
];

describe("période du tableau de bord", () => {
  it("calcule les bornes", () => {
    expect(bornesPeriode({ periode: "a_venir" }, JOUR)).toEqual([JOUR, null]);
    expect(bornesPeriode({ periode: "passes" }, JOUR)).toEqual([null, "2026-11-05"]);
    expect(bornesPeriode({ periode: "30_jours" }, JOUR)).toEqual(["2026-10-07", "2026-11-05"]);
    expect(bornesPeriode({ periode: "mois" }, JOUR)).toEqual(["2026-11-01", "2026-11-30"]);
    expect(bornesPeriode({ periode: "mois" }, "2026-12-15")).toEqual(["2026-12-01", "2026-12-31"]);
    expect(bornesPeriode({ periode: "annee" }, JOUR)).toEqual(["2026-01-01", "2026-12-31"]);
    expect(bornesPeriode({ periode: "personnalisee", du: "2026-10-01", au: "" }, JOUR)).toEqual(["2026-10-01", null]);
  });
  it("filtre par période, espace, brouillons", () => {
    expect(filtrerAteliers(ateliers, tous, JOUR).map(a => a.id)).toEqual(["p1", "p2", "b1"]);
    expect(filtrerAteliers(ateliers, { ...tous, brouillons: true }, JOUR).map(a => a.id)).toEqual(["p1", "p2", "b1", "b2"]);
    expect(filtrerAteliers(ateliers, { ...tous, periode: "passes" }, JOUR).map(a => a.id)).toEqual(["p1", "b1"]);
    expect(filtrerAteliers(ateliers, { ...tous, espaces: ["b"] }, JOUR).map(a => a.id)).toEqual(["b1"]);
  });
});

describe("statistiques", () => {
  it("compte validées et présentes, moyennes et taux", () => {
    const s = statistiquesAteliers(ateliers, inscriptions, espaces, tous, JOUR);
    expect(s.totaux).toMatchObject({
      ateliers: 3, ateliersPasses: 2, validees: 7, presentes: 4, aTraiter: 1,
      moyenneValidees: 2.3, // 7 / 3
      moyennePresentes: 2, // 4 présentes sur 2 ateliers passés
      tauxPresence: 67, // 4 / 6 validées des ateliers passés
      tauxRemplissage: 30, // 6 validées / 20 places (l'atelier illimité n'est pas compté)
    });
    const papotages = s.parEspace.find(l => l.slug === "papotages")!;
    expect(papotages).toMatchObject({ ateliers: 2, validees: 3, presentes: 1, moyenneValidees: 1.5, moyennePresentes: 1 });
  });
  it("répartit les participantes Business par créneau", () => {
    const s = statistiquesAteliers(ateliers, inscriptions, espaces, tous, JOUR);
    expect(s.business?.validees).toEqual({ journee: 1, matin: 1, apres_midi: 1, sans_reponse: 1 });
    expect(s.business?.presentes).toEqual({ journee: 1, matin: 1, apres_midi: 0, sans_reponse: 1 });
    expect(statistiquesAteliers(ateliers, inscriptions, espaces, { ...tous, espaces: ["p"] }, JOUR).business).toBeNull();
  });
  it("détaille chaque atelier retenu, par date", () => {
    const s = statistiquesAteliers(ateliers, inscriptions, espaces, tous, JOUR);
    expect(s.parAtelier.map(l => [l.atelier.id, l.validees, l.presentes, l.enAttente])).toEqual([
      ["p1", 2, 1, 0], ["b1", 4, 3, 0], ["p2", 1, 0, 1],
    ]);
  });
  it("aucun atelier : pas de moyenne", () => {
    const s = statistiquesAteliers([], [], espaces, tous, JOUR);
    expect(s.totaux).toMatchObject({ ateliers: 0, moyenneValidees: null, tauxPresence: null, tauxRemplissage: null });
  });
});
