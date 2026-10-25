import { describe, expect, it } from "vitest";
import { anniversairesDuJour, formaterDateNaissance } from "./anniversaires";

describe("formaterDateNaissance", () => {
  it("met la date au format français", () => expect(formaterDateNaissance("1990-05-12")).toBe("12/05/1990"));
  it("affiche un tiret si la date manque", () => {
    expect(formaterDateNaissance(null)).toBe("—");
    expect(formaterDateNaissance("")).toBe("—");
  });
});

describe("anniversairesDuJour", () => {
  const gens = [
    { prenom: "Marie", date_naissance: "1990-05-12" },
    { prenom: "Léa", date_naissance: "2000-02-29" },
    { prenom: "Sans", date_naissance: null },
  ];
  it("trouve le jour et calcule l'âge", () => {
    expect(anniversairesDuJour(gens, "2026-05-12")).toEqual([{ prenom: "Marie", age: 36 }]);
    expect(anniversairesDuJour(gens, "2026-05-13")).toEqual([]);
  });
  it("fête le 29 février le 28 les années non bissextiles", () => {
    expect(anniversairesDuJour(gens, "2026-02-28")).toEqual([{ prenom: "Léa", age: 26 }]);
    expect(anniversairesDuJour(gens, "2028-02-28")).toEqual([]);
    expect(anniversairesDuJour(gens, "2028-02-29")).toEqual([{ prenom: "Léa", age: 28 }]);
  });
});
