import { describe, expect, it } from "vitest";
import { composerDescription, resumeAppareil, suiteDuSignalement, validerSignalement } from "./signalement";

describe("signalement d'une anomalie", () => {
  it("exige un titre et une description d'au moins quelques mots", () => {
    expect(validerSignalement("", "Le bouton ne marche pas du tout")).toMatch(/quelques mots/);
    expect(validerSignalement("Bouton", "court")).toMatch(/Décris/);
    expect(validerSignalement("Bouton", "Le bouton ne réagit pas")).toBeNull();
  });

  it("résume le navigateur, le système et l'écran", () => {
    expect(resumeAppareil("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36", 412, 915.4))
      .toBe("Chrome sur Android · écran 412×915");
    expect(resumeAppareil("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1", 390, 844))
      .toBe("Safari sur iOS · écran 390×844");
    expect(resumeAppareil("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0", 1920, 1080))
      .toBe("Edge sur Windows · écran 1920×1080");
    expect(resumeAppareil("Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0", 1366, 768))
      .toBe("Firefox sur Linux · écran 1366×768");
    expect(resumeAppareil("", 0, 0)).toBe("navigateur inconnu sur système inconnu · écran 0×0");
  });

  it("ajoute l'endroit et l'appareil sous le texte de la membre", () => {
    expect(composerDescription("  Le bouton ne répond pas.  ", "Ateliers", "Chrome sur Android · écran 412×915"))
      .toBe("Le bouton ne répond pas.\n\n—\nOù : Ateliers\nAppareil : Chrome sur Android · écran 412×915");
    expect(composerDescription("Texte seul", "", null)).toBe("Texte seul");
    expect(composerDescription("Texte", "Mon compte", null)).toBe("Texte\n\n—\nOù : Mon compte");
  });

  it("déduit la suite donnée par l'équipe, la plus avancée l'emportant", () => {
    expect(suiteDuSignalement([])).toBe("recu");
    expect(suiteDuSignalement(["non_valide"])).toBe("classe");
    expect(suiteDuSignalement(["non_valide", "a_discuter"])).toBe("en_discussion");
    expect(suiteDuSignalement(["a_discuter", "valide", "non_valide"])).toBe("pris_en_compte");
  });
});
