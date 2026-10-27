import { describe, expect, it } from "vitest";
import { decalageFrance, dureeEnMinutes, evenementJsonLd, evenementsJsonLd } from "./evenements";

const atelier = {
  id: "a1",
  titre: "Atelier Papotages — Café des copines",
  date_atelier: "2026-11-12",
  heure_debut: "14:30:00",
  duree: "2h",
  description: "Un café pour papoter.",
  lieu: "Maison des associations",
  adresse: "1 rue de la Paix, 93220 Gagny",
  tarif_standard: 5,
  statut: "publie",
};

describe("décalage horaire de la France", () => {
  it.each([
    ["2026-01-15", "+01:00"],
    ["2026-03-28", "+01:00"],
    ["2026-03-29", "+02:00"], // dernier dimanche de mars 2026
    ["2026-07-14", "+02:00"],
    ["2026-10-24", "+02:00"],
    ["2026-10-25", "+01:00"], // dernier dimanche d'octobre 2026
    ["2026-12-25", "+01:00"],
  ])("%s → %s", (date, attendu) => {
    expect(decalageFrance(date)).toBe(attendu);
  });
});

describe("durée d'un atelier", () => {
  it.each([
    ["2h", 120],
    ["1h30", 90],
    ["2 h", 120],
    ["90 min", 90],
    ["toute la journée", null],
    ["", null],
    [null, null],
  ])("%s → %s", (texte, minutes) => {
    expect(dureeEnMinutes(texte)).toBe(minutes);
  });
});

describe("événement schema.org", () => {
  it("reprend uniquement les champs publics de l'atelier", () => {
    const e = evenementJsonLd(atelier)!;
    expect(e["@type"]).toBe("Event");
    expect(e.name).toBe(atelier.titre);
    expect(e.startDate).toBe("2026-11-12T14:30:00+01:00");
    expect(e.endDate).toBe("2026-11-12T16:30:00+01:00");
    expect(e.location).toEqual({
      "@type": "Place",
      name: "Maison des associations",
      address: { "@type": "PostalAddress", streetAddress: "1 rue de la Paix, 93220 Gagny", addressCountry: "FR" },
    });
    expect(e.offers).toMatchObject({ price: "5", priceCurrency: "EUR", availability: "https://schema.org/InStock" });
  });

  it("un atelier complet est signalé « complet »", () => {
    const e = evenementJsonLd({ ...atelier, statut: "complet" })!;
    expect((e.offers as { availability: string }).availability).toBe("https://schema.org/SoldOut");
  });

  it("une fin après minuit passe au jour suivant", () => {
    const e = evenementJsonLd({ ...atelier, heure_debut: "23:00:00", duree: "2h" })!;
    expect(e.endDate).toBe("2026-11-13T01:00:00+01:00");
  });

  it("sans durée lisible, pas de date de fin ; sans description, pas de description", () => {
    const e = evenementJsonLd({ ...atelier, duree: "toute la journée", description: null })!;
    expect(e).not.toHaveProperty("endDate");
    expect(e).not.toHaveProperty("description");
  });

  it("un atelier sans lieu est ignoré (le lieu est obligatoire pour Google)", () => {
    expect(evenementJsonLd({ ...atelier, lieu: null })).toBeNull();
    expect(evenementJsonLd({ ...atelier, lieu: "  " })).toBeNull();
  });

  it("sans adresse, le lieu sert d'adresse", () => {
    const e = evenementJsonLd({ ...atelier, adresse: null })!;
    expect((e.location as { address: string }).address).toBe("Maison des associations");
  });

  it("le document rassemble les ateliers exploitables, ou vaut null", () => {
    const doc = evenementsJsonLd([atelier, { ...atelier, id: "a2", lieu: null }])!;
    expect(doc["@context"]).toBe("https://schema.org");
    expect(doc["@graph"]).toHaveLength(1);
    expect(evenementsJsonLd([])).toBeNull();
  });
});
