import { describe, expect, it } from "vitest";
import { messageErreurServeur } from "./messageErreurServeur";

describe("messageErreurServeur", () => {
  it("affiche tel quel un message métier levé par la base (code P0001)", () => {
    expect(messageErreurServeur({ code: "P0001", message: "Adresse email invalide." })).toBe("Adresse email invalide.");
  });

  it("masque les erreurs techniques derrière un message générique", () => {
    expect(messageErreurServeur({ code: "42501", message: "permission denied for table inscriptions" }))
      .toBe("Une erreur est survenue. Veuillez réessayer.");
    expect(messageErreurServeur(null)).toBe("Une erreur est survenue. Veuillez réessayer.");
  });
});
