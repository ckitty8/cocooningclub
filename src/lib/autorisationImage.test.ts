import { describe, expect, it } from "vitest";
import { detailPhotos, etatPhotos, supportsLisibles, type AutorisationImage } from "./autorisationImage";

const base: AutorisationImage = {
  utilisateur_id: "u1", autorisation_image: true, image_supports: ["site", "reseaux"],
  image_signee_le: "2026-09-01", image_valable_jusqu_au: "2029-09-01", image_valide: true,
};

describe("état de l'autorisation photo", () => {
  it("accord valide", () => expect(etatPhotos(base)).toBe("accord"));
  it("accord échu", () => expect(etatPhotos({ ...base, image_valide: false })).toBe("expire"));
  it("refus", () => expect(etatPhotos({ ...base, autorisation_image: false, image_valide: false })).toBe("refus"));
  it("aucun bulletin", () => {
    expect(etatPhotos(undefined)).toBe("inconnu");
    expect(etatPhotos(null)).toBe("inconnu");
  });
});

describe("supports et précisions", () => {
  it("traduit les supports cochés", () => expect(supportsLisibles(["site", "interne"])).toEqual(["Site internet", "Communications internes"]));
  it("indique la date de fin et les supports", () => {
    const d = detailPhotos(base);
    expect(d).toContain("01/09/2029");
    expect(d).toContain("Site internet, Réseaux sociaux");
  });
  it("signale l'absence de bulletin", () => expect(detailPhotos(undefined)).toContain("Aucun bulletin"));
});
