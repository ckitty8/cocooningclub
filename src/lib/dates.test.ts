import { describe, expect, it } from "vitest";
import { dateFr, dateLongue } from "./dates";

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
