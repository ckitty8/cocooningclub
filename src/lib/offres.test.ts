import { describe, expect, it } from "vitest";
import {
  deplacer, economie, lieuSurCarte, lignesCompris, lireActivites, montant, prixBarreAffiche, questionsPubliees, trierOffres, versOffre,
} from "./offres";

describe("versOffre", () => {
  it("lit une formule complète (migration appliquée)", () => {
    const o = versOffre({
      id: "f1", nom: "Chill + Business", couleur: "terracotta", prix: "150.00", prix_barre: "180.00", mise_en_avant: true,
      rythme: " Les deux univers réunis ", ordre: 3, lien_helloasso: "",
      activites: [{ nom: "Coworking*", lieu: "La Picorette, Le Raincy", espace: "business" }, { nom: "", lieu: "x" }],
      compris: ["Le magazine du club.", "  "],
    });
    expect(o.prix).toBe(150);
    expect(o.prix_barre).toBe(180);
    expect(o.rythme).toBe("Les deux univers réunis");
    expect(o.lien_helloasso).toBeNull();
    expect(o.activites).toEqual([{ nom: "Coworking*", lieu: "La Picorette, Le Raincy", espace: "business" }]);
    expect(o.compris).toEqual(["Le magazine du club."]);
  });

  it("reste affichable sans les colonnes de contenu (migration absente)", () => {
    const o = versOffre({ id: "f2", nom: "Cocooning Business", couleur: "mauve", prix: 100, ordre: 1 });
    expect(o).toMatchObject({ rythme: null, prix_barre: null, mise_en_avant: false, activites: [], compris: [] });
  });
});

describe("prix", () => {
  it("affiche le prix barré et l'économie seulement s'il est supérieur au prix", () => {
    expect(prixBarreAffiche({ prix: 150, prix_barre: 180 })).toBe(180);
    expect(economie({ prix: 150, prix_barre: 180 })).toBe(30);
    expect(prixBarreAffiche({ prix: 150, prix_barre: 150 })).toBeNull();
    expect(economie({ prix: 150, prix_barre: null })).toBeNull();
  });
  it("écrit les montants sans décimales inutiles", () => {
    expect(montant(80)).toBe("80 €");
    expect(montant(12.5)).toBe("12,50 €");
  });
});

describe("contenu saisi par les administratrices", () => {
  it("une ligne par point, lignes vides retirées", () => {
    expect(lignesCompris("Un\n\n  Deux  \n")).toEqual(["Un", "Deux"]);
  });
  it("une activité à l'espace inconnu prend la couleur Papotages", () => {
    expect(lireActivites([{ nom: "A", espace: "inconnu" }])[0].espace).toBe("papotages");
    expect(lireActivites("pas une liste")).toEqual([]);
  });
  it("un lieu « à définir » n'a pas de lien vers la carte", () => {
    expect(lieuSurCarte("Gagny, lieu à définir")).toBe(false);
    expect(lieuSurCarte("Le Flow bien-être, Gagny")).toBe(true);
    expect(lieuSurCarte("")).toBe(false);
  });
  it("trie les offres par ordre puis par prix", () => {
    expect(trierOffres([{ ordre: 2, prix: 100 }, { ordre: 1, prix: 80 }, { ordre: 2, prix: 50 }]).map(o => o.prix)).toEqual([80, 50, 100]);
  });
});

describe("Bon à savoir", () => {
  const q = (id: string, ordre: number, est_publiee = true) => ({ id, question: `Q${id}`, reponse: "", est_publiee, ordre });

  it("ne garde que les questions publiées, dans l'ordre", () => {
    expect(questionsPubliees([q("b", 2), q("a", 1), q("c", 3, false)]).map(x => x.id)).toEqual(["a", "b"]);
  });
  it("monter une question échange sa place avec la précédente", () => {
    expect(deplacer([q("a", 1), q("b", 2), q("c", 3)], "c", -1)).toEqual([{ id: "c", ordre: 2 }, { id: "b", ordre: 3 }]);
  });
  it("renumérote des ordres en double", () => {
    expect(deplacer([q("a", 0), q("b", 0)], "a", 1)).toEqual([{ id: "b", ordre: 1 }, { id: "a", ordre: 2 }]);
  });
  it("ne bouge pas au-delà des bords", () => {
    expect(deplacer([q("a", 1), q("b", 2)], "a", -1)).toEqual([]);
  });
});
