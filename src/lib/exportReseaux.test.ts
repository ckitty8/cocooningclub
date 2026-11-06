import { describe, expect, it } from "vitest";
import { ateliersPourReseaux, dateLongueReseaux, feuilleReseaux, heureReseaux, lienPublicInscription, nomFichierReseaux } from "./exportReseaux";

const a = (id: string, date: string, statut = "publie", heure: string | null = "14:30:00") =>
  ({ id, titre: `Atelier ${id}`, date_atelier: date, heure_debut: heure, heure_fin: "16:30:00", lieu: "Gagny", statut });

describe("export réseaux sociaux", () => {
  it("garde les ateliers à venir publiés ou complets, triés par date", () => {
    const l = ateliersPourReseaux([a("3", "2026-12-01"), a("1", "2026-11-06"), a("p", "2026-11-05"), a("b", "2026-12-01", "brouillon"), a("c", "2026-11-20", "complet"), a("x", "2026-11-21", "annule")], "2026-11-06");
    expect(l.map(x => x.id)).toEqual(["1", "c", "3"]);
  });
  it("met en forme la date, l'heure et le lien du site en ligne", () => {
    expect(dateLongueReseaux("2026-12-06")).toBe("Dimanche 6 décembre 2026");
    expect(heureReseaux("14:30:00", "16:30:00")).toBe("14h30 – 16h30");
    expect(heureReseaux("10:00:00", null)).toBe("10h00");
    expect(heureReseaux(null)).toBe("");
    expect(lienPublicInscription("abc")).toBe("https://www.lecocooningclub.fr/inscription/abc");
    expect(nomFichierReseaux("2026-11-06")).toBe("ateliers-reseaux-sociaux-2026-11-06.xlsx");
  });
  it("écrit une ligne par atelier avec un lien cliquable", () => {
    const f = feuilleReseaux([a("abc", "2026-12-06")]);
    expect(f.cellules[0].map(c => c?.value)).toEqual(["Atelier", "Date", "Heure", "Lieu", "Lien d'inscription"]);
    expect(f.cellules[1].slice(0, 4).map(c => c?.value)).toEqual(["Atelier abc", "Dimanche 6 décembre 2026", "14h30 – 16h30", "Gagny"]);
    expect(f.cellules[1][4]).toMatchObject({ type: "Formula", value: 'HYPERLINK("https://www.lecocooningclub.fr/inscription/abc","https://www.lecocooningclub.fr/inscription/abc")' });
  });
});
