import { describe, expect, it } from "vitest";
import { contenuIcs, googleCalendarUrl, nomDeFichier } from "./calendarLinks";

const atelier: Parameters<typeof contenuIcs>[0] = {
  id: "a1",
  titre: "Cocoon créatif - Atelier floral",
  date_atelier: "2026-10-26",
  heure_debut: "13:30:00",
  duree: "2h",
  lieu: null,
  adresse: null,
  description: null,
};

describe("ajout à l'agenda", () => {
  it("calcule le début et la fin dans le lien Google Agenda", () => {
    const url = new URL(googleCalendarUrl({ ...atelier, lieu: "Le flow" }));
    expect(url.searchParams.get("dates")).toBe("20261026T133000/20261026T153000");
    expect(url.searchParams.get("location")).toBe("Le flow");
  });

  it("produit un .ics valide même sans lieu ni description", () => {
    const ics = contenuIcs(atelier, new Date("2026-10-16T10:00:00Z"));
    expect(ics).toContain("UID:atelier-a1@lecocooningclub.fr");
    expect(ics).toContain("DTSTAMP:20261016T100000Z");
    expect(ics).toContain("DTSTART:20261026T133000");
    expect(ics).toContain("LOCATION:\r\n");
    expect(ics).not.toContain("null");
  });

  it("échappe les caractères spéciaux du .ics", () => {
    const ics = contenuIcs({ ...atelier, adresse: "1 rue X, Gagny; 93" });
    expect(ics).toContain("LOCATION:1 rue X\\, Gagny\\; 93");
  });

  it("donne au fichier un nom sans accents ni ponctuation", () => {
    expect(nomDeFichier("Atelier Papotages — Café des copines !")).toBe("Atelier-Papotages-Cafe-des-copines");
    expect(nomDeFichier("— !")).toBe("atelier");
  });
});
