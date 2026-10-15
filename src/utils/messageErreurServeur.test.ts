import { describe, expect, it } from "vitest";
import { messageErreurServeur } from "./messageErreurServeur";

describe("messageErreurServeur", () => {
  it("affiche tel quel un message métier levé par la base (code P0001)", () => {
    expect(messageErreurServeur({ code: "P0001", message: "Adresse email invalide." })).toBe("Adresse email invalide.");
  });

  it("affiche le message d'inscriptions closes (code 22023)", () => {
    const message = "Les inscriptions à cet atelier sont closes depuis le 2026-10-10";
    expect(messageErreurServeur({ code: "22023", message })).toBe(message);
  });

  it("masque les erreurs techniques derrière un message générique", () => {
    expect(messageErreurServeur({ code: "42501", message: "permission denied for table inscriptions" }))
      .toBe("Une erreur est survenue. Veuillez réessayer.");
    expect(messageErreurServeur(null)).toBe("Une erreur est survenue. Veuillez réessayer.");
  });
});
