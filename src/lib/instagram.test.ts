import { describe, expect, it } from "vitest";
import { instagramValide, lienInstagram, normaliserInstagram } from "./instagram";

describe("compte Instagram de la pré-inscription", () => {
  it("garde « @identifiant » quelle que soit la saisie", () => {
    expect(normaliserInstagram("@Mon.Compte")).toBe("@mon.compte");
    expect(normaliserInstagram("  mon_compte ")).toBe("@mon_compte");
    expect(normaliserInstagram("https://www.instagram.com/mon.compte/?hl=fr")).toBe("@mon.compte");
    expect(normaliserInstagram("instagram.com/moncompte")).toBe("@moncompte");
    expect(normaliserInstagram("@@moncompte")).toBe("@moncompte");
  });
  it("vide ou illisible : rien", () => {
    expect(normaliserInstagram("")).toBeNull();
    expect(normaliserInstagram(null)).toBeNull();
    expect(normaliserInstagram("mon compte")).toBeNull();
    expect(normaliserInstagram("a".repeat(31))).toBeNull();
  });
  it("valide la saisie (vide accepté : champ facultatif)", () => {
    expect(instagramValide("")).toBe(true);
    expect(instagramValide("@moncompte")).toBe(true);
    expect(instagramValide("mon compte")).toBe(false);
    expect(instagramValide("mon-compte")).toBe(false);
  });
  it("donne le lien du profil", () => {
    expect(lienInstagram("@moncompte")).toBe("https://www.instagram.com/moncompte/");
    expect(lienInstagram(null)).toBeNull();
  });
});
