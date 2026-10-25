import { describe, expect, it } from "vitest";
import { ajouterMois, estEnCours, finDeValidite, formaterNumero, fondFormule, joursEntre, statutAdhesion } from "./adhesions";

describe("dates de validité", () => {
  it("ajoute 12 mois à la date de validation", () => expect(finDeValidite("2026-10-23", 12)).toBe("2027-10-23"));
  it("ramène à la fin du mois (31/01 + 1 mois)", () => {
    expect(ajouterMois("2027-01-31", 1)).toBe("2027-02-28");
    expect(ajouterMois("2028-01-31", 1)).toBe("2028-02-29");
  });
  it("passe d'une année à l'autre", () => expect(ajouterMois("2026-11-15", 3)).toBe("2027-02-15"));
  it("calcule un nombre de jours", () => expect(joursEntre("2026-10-23", "2026-11-22")).toBe(30));
});

describe("statut d'une adhésion", () => {
  const auj = "2026-10-23";
  it("à valider tant qu'elle n'est pas active", () =>
    expect(statutAdhesion({ statut: "en_attente", valable_jusqu_au: null }, auj)).toBe("a_valider"));
  it("refusée", () => expect(statutAdhesion({ statut: "refusee", valable_jusqu_au: null }, auj)).toBe("refusee"));
  it("active loin de l'échéance", () =>
    expect(statutAdhesion({ statut: "active", valable_jusqu_au: "2027-10-23" }, auj)).toBe("active"));
  it("expire bientôt à 30 jours ou moins, y compris le dernier jour", () => {
    expect(statutAdhesion({ statut: "active", valable_jusqu_au: "2026-11-22" }, auj)).toBe("expire_bientot");
    expect(statutAdhesion({ statut: "active", valable_jusqu_au: auj }, auj)).toBe("expire_bientot");
  });
  it("expirée le lendemain de l'échéance", () =>
    expect(statutAdhesion({ statut: "active", valable_jusqu_au: "2026-10-22" }, auj)).toBe("expiree"));
  it("compte les adhésions en cours", () => {
    expect(estEnCours("active")).toBe(true);
    expect(estEnCours("expire_bientot")).toBe(true);
    expect(estEnCours("expiree")).toBe(false);
  });
});

describe("présentation", () => {
  it("numérote sur 4 chiffres", () => expect(formaterNumero(43)).toBe("0043"));
  it("retombe sur la couleur par défaut", () => expect(fondFormule("inconnue")).toBe(fondFormule("terracotta")));
});
