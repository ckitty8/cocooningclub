import { describe, expect, it } from "vitest";
import { autorisationDepuisChamps, bulletinDepuisChamps, bulletinVierge, champsDepuisBulletin } from "./bulletin";

describe("bulletin d'adhésion", () => {
  it("n'enregistre ni supports ni signature d'image quand les photos sont refusées", () => {
    const champs = champsDepuisBulletin({ ...bulletinVierge("2026-10-23"), engagement: true, photos: false, supports: ["site"] });
    expect(champs).toEqual({
      engagement_accepte_le: "2026-10-23", whatsapp: false,
      autorisation_image: false, image_supports: [], image_signee_le: null,
    });
  });

  it("enregistre les supports cochés et la date de signature quand les photos sont acceptées", () => {
    const champs = champsDepuisBulletin({ engagement: true, whatsapp: true, photos: true, supports: ["site", "reseaux"], signeeLe: "2026-10-23" });
    expect(champs).toMatchObject({ autorisation_image: true, image_supports: ["site", "reseaux"], image_signee_le: "2026-10-23", whatsapp: true });
  });

  it("relit les valeurs d'une adhésion", () => {
    const v = bulletinDepuisChamps({
      engagement_accepte_le: "2026-10-21", whatsapp: true, autorisation_image: true, image_supports: ["site"], image_signee_le: "2026-10-21",
    });
    expect(v).toEqual({ engagement: true, whatsapp: true, photos: true, supports: ["site"], signeeLe: "2026-10-21" });
  });
});

describe("autorisation d'une adhésion", () => {
  const champs = { autorisation_image: true, image_supports: ["site"], image_signee_le: "2026-10-23" };
  it("vaut 3 ans à compter de la signature", () => {
    const a = autorisationDepuisChamps(champs, "u1", "2029-10-23");
    expect(a.image_valable_jusqu_au).toBe("2029-10-23");
    expect(a.image_valide).toBe(true);
  });
  it("est échue le lendemain", () => expect(autorisationDepuisChamps(champs, "u1", "2029-10-24").image_valide).toBe(false));
  it("n'est jamais valide en cas de refus", () =>
    expect(autorisationDepuisChamps({ ...champs, autorisation_image: false }, "u1", "2026-10-24").image_valide).toBe(false));
});
