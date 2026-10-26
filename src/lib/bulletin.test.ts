import { describe, expect, it } from "vitest";
import { autorisationDepuisChamps, bulletinDepuisChamps, bulletinVierge, champNaissance, champsDepuisBulletin } from "./bulletin";

describe("bulletin d'adhésion", () => {
  it("n'enregistre ni supports ni signature d'image quand les photos sont refusées", () => {
    const champs = champsDepuisBulletin({ ...bulletinVierge("2026-10-23"), engagement: true, photos: false, supports: ["site"] });
    expect(champs).toEqual({
      engagement_accepte_le: "2026-10-23", whatsapp: false,
      autorisation_image: false, image_supports: [], image_signee_le: null,
    });
  });

  it("enregistre les supports cochés et la date de signature quand les photos sont acceptées", () => {
    const champs = champsDepuisBulletin({ engagement: true, whatsapp: true, photos: true, supports: ["site", "reseaux"], signeeLe: "2026-10-23", naissance: "" });
    expect(champs).toMatchObject({ autorisation_image: true, image_supports: ["site", "reseaux"], image_signee_le: "2026-10-23", whatsapp: true });
  });

  it("relit les valeurs d'une adhésion", () => {
    const v = bulletinDepuisChamps({
      engagement_accepte_le: "2026-10-21", whatsapp: true, autorisation_image: true, image_supports: ["site"], image_signee_le: "2026-10-21",
    });
    expect(v).toEqual({ engagement: true, whatsapp: true, photos: true, supports: ["site"], signeeLe: "2026-10-21", naissance: "" });
  });

  it("relit la date de naissance d'une adhésion", () => {
    const v = bulletinDepuisChamps({
      engagement_accepte_le: null, whatsapp: false, autorisation_image: false, image_supports: [], image_signee_le: null, date_naissance: "1988-04-12",
    });
    expect(v.naissance).toBe("1988-04-12");
  });

  it("n'envoie la date de naissance que si elle est renseignée ou modifiée", () => {
    const v = { ...bulletinVierge("2026-10-23"), naissance: "" };
    expect(champNaissance(v)).toEqual({});
    expect(champNaissance(v, null)).toEqual({});
    expect(champNaissance({ ...v, naissance: "1988-04-12" })).toEqual({ date_naissance: "1988-04-12" });
    expect(champNaissance({ ...v, naissance: "1988-04-12" }, "1988-04-12")).toEqual({});
    expect(champNaissance(v, "1988-04-12")).toEqual({ date_naissance: null });
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
