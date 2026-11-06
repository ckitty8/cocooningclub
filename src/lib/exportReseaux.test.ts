import { describe, expect, it } from "vitest";
import { ateliersPourReseaux, dateLongueReseaux, heureReseaux, lienPublicInscription, lienWhatsAppMessage, messageWhatsApp } from "./exportReseaux";

const a = (id: string, date: string, statut = "publie", lieu: string | null = "Gagny") =>
  ({ id, titre: `Atelier ${id}`, date_atelier: date, heure_debut: "14:30:00", heure_fin: "16:30:00", lieu, statut });

describe("message WhatsApp des ateliers", () => {
  it("garde les ateliers à venir publiés (pas complets, brouillons, annulés ni passés), triés par date", () => {
    const l = ateliersPourReseaux([a("3", "2026-12-01"), a("1", "2026-11-06"), a("p", "2026-11-05"), a("b", "2026-12-01", "brouillon"), a("c", "2026-11-20", "complet"), a("x", "2026-11-21", "annule")], "2026-11-06");
    expect(l.map(x => x.id)).toEqual(["1", "3"]);
  });
  it("met en forme la date, l'heure et le lien du site en ligne", () => {
    expect(dateLongueReseaux("2026-12-06")).toBe("Dimanche 6 décembre 2026");
    expect(heureReseaux("14:30:00", "16:30:00")).toBe("14h30 – 16h30");
    expect(heureReseaux("10:00:00", null)).toBe("10h00");
    expect(lienPublicInscription("abc")).toBe("https://www.lecocooningclub.fr/inscription/abc");
  });
  it("écrit un bloc par atelier, sans ligne de lieu quand il n'y en a pas", () => {
    expect(messageWhatsApp([a("abc", "2026-12-06"), a("def", "2027-01-05", "publie", null)])).toBe([
      "✨ *Nos prochains ateliers* ✨",
      "*Atelier abc*\n📅 Dimanche 6 décembre 2026 · 14h30 – 16h30\n📍 Gagny\n👉 Inscription : https://www.lecocooningclub.fr/inscription/abc",
      "*Atelier def*\n📅 Mardi 5 janvier 2027 · 14h30 – 16h30\n👉 Inscription : https://www.lecocooningclub.fr/inscription/def",
      "À très vite au Cocooning Club 💛",
    ].join("\n\n"));
  });
  it("ouvre WhatsApp avec le message encodé, sans destinataire imposé", () => {
    expect(lienWhatsAppMessage("Bonjour 💛 & à bientôt")).toBe(`https://wa.me/?text=${encodeURIComponent("Bonjour 💛 & à bientôt")}`);
  });
});
