import { describe, expect, it } from "vitest";
import { dateFr, dateLongue, formaterSaisieDate, isoDepuisSaisie, saisieDepuisIso } from "./dates";

describe("formats de dates", () => {
  it("dateFr : jour/mois/année, ou un tiret si la date est absente", () => {
    expect(dateFr("2026-10-23")).toBe("23/10/2026");
    expect(dateFr(null)).toBe("—");
  });
  it("dateLongue : jour de la semaine en toutes lettres, sans décalage d'un jour", () => {
    expect(dateLongue("2026-10-23")).toBe("vendredi 23 octobre 2026");
    expect(dateLongue("2026-01-01")).toBe("jeudi 1 janvier 2026");
  });
});

describe("saisie d'une date à la main", () => {
  it("ajoute les barres obliques au fil de la frappe et ignore les caractères non numériques", () => {
    expect(formaterSaisieDate("1")).toBe("1");
    expect(formaterSaisieDate("12")).toBe("12");
    expect(formaterSaisieDate("120")).toBe("12/0");
    expect(formaterSaisieDate("1204")).toBe("12/04");
    expect(formaterSaisieDate("12041988")).toBe("12/04/1988");
    expect(formaterSaisieDate("12/04/1988")).toBe("12/04/1988");
    expect(formaterSaisieDate("12-04-1988 xx 99")).toBe("12/04/1988");
  });
  it("convertit en date ISO seulement si la date existe", () => {
    expect(isoDepuisSaisie("12/04/1988")).toBe("1988-04-12");
    expect(isoDepuisSaisie("29/02/2024")).toBe("2024-02-29");
    expect(isoDepuisSaisie("29/02/2023")).toBeNull();
    expect(isoDepuisSaisie("31/04/1988")).toBeNull();
    expect(isoDepuisSaisie("00/10/1988")).toBeNull();
    expect(isoDepuisSaisie("12/04/19")).toBeNull();
    expect(isoDepuisSaisie("")).toBeNull();
  });
  it("revient de l'ISO au format français", () => {
    expect(saisieDepuisIso("1988-04-12")).toBe("12/04/1988");
    expect(saisieDepuisIso("")).toBe("");
  });
});
