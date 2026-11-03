import { describe, expect, it } from "vitest";
import { adresseLisible, estLien, googleMapsSearchUrl } from "./googleMaps";

const LIEN = "https://www.google.com/maps/place/LE+FLOW/@48.87,2.52,17z/data=!3m1!4b1";

describe("liens vers la carte", () => {
  it("reconnaît un lien web, pas une adresse ni un autre protocole", () => {
    expect(estLien(LIEN)).toBe(true);
    expect(estLien(" http://exemple.fr ")).toBe(true);
    expect(estLien("1 rue de la Paix, 93220 Gagny")).toBe(false);
    expect(estLien("javascript:alert(1)")).toBe(false);
  });

  it("garde tel quel un lien collé dans le champ adresse", () => {
    expect(googleMapsSearchUrl(LIEN)).toBe(LIEN);
  });

  it("lance une recherche Google Maps avec une adresse en clair", () => {
    expect(googleMapsSearchUrl("1 rue de la Paix, 93220 Gagny")).toBe(
      "https://www.google.com/maps/search/?api=1&query=1%20rue%20de%20la%20Paix%2C%2093220%20Gagny",
    );
  });

  it("ne cherche jamais un faux protocole : il retombe sur une simple recherche", () => {
    expect(googleMapsSearchUrl("javascript:alert(1)")).toMatch(/^https:\/\/www\.google\.com\/maps\/search\//);
  });

  it("n'écrit pas un lien comme une adresse", () => {
    expect(adresseLisible(LIEN)).toBeNull();
    expect(adresseLisible("  ")).toBeNull();
    expect(adresseLisible(null)).toBeNull();
    expect(adresseLisible(" 1 rue de la Paix ")).toBe("1 rue de la Paix");
  });
});
