import { describe, expect, it } from "vitest";
import { dureeEnMinutes, dureeEntre, formaterDuree, heureDeFin } from "./dureeAtelier";

describe("durée saisie", () => {
  it.each([
    ["3h", 180],
    ["3H", 180],
    ["2h30", 150],
    ["2 h 30", 150],
    ["1h05", 65],
    ["1,5h", 90],
    ["90 min", 90],
    ["45min", 45],
    ["2 hours", 120],
    ["2 heures 15", 135],
    ["02:00:00", 120],
    ["1:30", 90],
  ])("comprend « %s »", (saisie, minutes) => {
    expect(dureeEnMinutes(saisie)).toBe(minutes);
  });

  it.each(["", "  ", "bientôt", "0h", "25h", "-2h"])("refuse « %s »", saisie => {
    expect(dureeEnMinutes(saisie)).toBeNull();
  });

  it("formate les minutes", () => {
    expect(formaterDuree(120)).toBe("2h");
    expect(formaterDuree(150)).toBe("2h30");
    expect(formaterDuree(65)).toBe("1h05");
  });
});

describe("heure de fin", () => {
  it("ajoute la durée à l'heure de début", () => {
    expect(heureDeFin("18:30", "3H")).toBe("21:30");
    expect(heureDeFin("09:15", "2h30")).toBe("11:45");
    expect(heureDeFin("14:00:00", "2 hours")).toBe("16:00");
  });

  it("ne propose rien si la durée est inconnue ou dépasse minuit", () => {
    expect(heureDeFin("18:30", "bientôt")).toBeNull();
    expect(heureDeFin("", "2h")).toBeNull();
    expect(heureDeFin("22:30", "3h")).toBeNull();
  });
});

describe("durée entre deux horaires", () => {
  it("calcule la durée quand la fin est après le début", () => {
    expect(dureeEntre("18:30", "21:00")).toBe("2h30");
  });

  it("refuse une fin avant ou égale au début", () => {
    expect(dureeEntre("18:30", "16:30")).toBeNull();
    expect(dureeEntre("18:30", "18:30")).toBeNull();
  });
});
