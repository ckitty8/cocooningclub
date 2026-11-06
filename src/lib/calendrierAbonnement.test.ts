import { afterEach, describe, expect, it, vi } from "vitest";
import { calendrierIcs, debutFenetre, dureeMinutes, GET, lieuIcs, replier, texteSimple } from "../../api/calendrier-ateliers";

const atelier = {
  id: "abc", titre: "Papotages - Human design", date_atelier: "2026-11-08", heure_debut: "14:30:00", heure_fin: "16:30:00",
  duree: "2h", lieu: "Le flamboyant", adresse: "https://maps.app.goo.gl/xyz", description: "<p>Un <strong>moment</strong> d'échange ; café, thé.</p>", statut: "publie",
};

describe("calendrier d'abonnement des ateliers", () => {
  it("écrit un événement par atelier, avec le lien d'inscription du site en ligne", () => {
    const ics = calendrierIcs([atelier], new Date("2026-11-06T10:00:00Z"));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("X-WR-CALNAME:Ateliers - Le Cocooning Club");
    expect(ics).toContain("UID:atelier-abc@lecocooningclub.fr");
    expect(ics).toContain("DTSTART:20261108T143000");
    expect(ics).toContain("DTEND:20261108T163000");
    expect(ics).toContain("SUMMARY:Papotages - Human design");
    expect(ics).toContain("LOCATION:Le flamboyant"); // le lien Google Maps collé dans « adresse » n'est pas un lieu
    expect(ics).toContain("URL:https://www.lecocooningclub.fr/inscription/abc");
    expect(ics.replace(/\r\n /g, "")).toContain("DESCRIPTION:Un moment d'échange \\; café\\, thé.\\n\\nInscription : https://www.lecocooningclub.fr/inscription/abc");
  });
  it("calcule la fin d'après la durée si l'heure de fin manque, et gère un atelier sans heure", () => {
    const ics = calendrierIcs([{ ...atelier, heure_fin: null, duree: "1h30" }, { ...atelier, id: "j", heure_debut: null }]);
    expect(ics).toContain("DTEND:20261108T160000");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261108");
    expect(dureeMinutes("02:00:00")).toBe(120);
    expect(dureeMinutes("7h")).toBe(420);
    expect(dureeMinutes(null)).toBe(120);
  });
  it("signale un atelier complet et nettoie le texte mis en forme", () => {
    expect(calendrierIcs([{ ...atelier, statut: "complet" }])).toContain("Atelier complet.");
    expect(texteSimple("<ul><li>Un</li><li>Deux</li></ul><p>A&amp;B</p>")).toBe("• Un\n• Deux\nA&B");
  });
  it("replie les lignes longues sans couper les caractères accentués", () => {
    const ligne = `DESCRIPTION:${"é".repeat(60)}`;
    const replie = replier(ligne);
    for (const morceau of replie.split("\r\n")) expect(new TextEncoder().encode(morceau).length).toBeLessThanOrEqual(75);
    expect(replie.replace(/\r\n /g, "")).toBe(ligne);
  });
  it("compose le lieu sans répéter son nom ni reprendre un lien Google Maps", () => {
    expect(lieuIcs({ lieu: "La picorette", adresse: "La Picorette, 21 avenue de la Résistance, Le Raincy" })).toBe("La Picorette, 21 avenue de la Résistance, Le Raincy");
    expect(lieuIcs({ lieu: "Le flow", adresse: "https://www.google.com/maps/place/x" })).toBe("Le flow");
    expect(lieuIcs({ lieu: "Gagny", adresse: "1 rue de la Paix" })).toBe("Gagny, 1 rue de la Paix");
    expect(lieuIcs({ lieu: null, adresse: null })).toBe("");
  });
  it("garde les ateliers depuis le début du mois dernier", () => {
    expect(debutFenetre(new Date(2026, 10, 6))).toBe("2026-10-01");
    expect(debutFenetre(new Date(2026, 0, 15))).toBe("2025-12-01");
  });
});

describe("adresse /api/calendrier-ateliers", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("lit seulement les ateliers publiés ou complets et répond un calendrier", async () => {
    const appel = vi.fn(async () => new Response(JSON.stringify([atelier]), { status: 200 }));
    vi.stubGlobal("fetch", appel);
    const reponse = await GET();
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    expect(await reponse.text()).toContain("SUMMARY:Papotages - Human design");
    const url = String((appel.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("/rest/v1/ateliers?");
    expect(url).toContain("statut=in.(publie,complet)");
    expect(url).not.toMatch(/inscriptions|utilisateurs/);
  });
  it("répond 503 si la base ne répond pas (l'agenda garde sa version)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await GET()).status).toBe(503);
  });
});

describe("liens d'abonnement", () => {
  it("pointe vers le site en ligne, en https, webcal et Google Agenda", async () => {
    const { URL_CALENDRIER_ATELIERS, webcalCalendrier, lienGoogleAgenda } = await import("./abonnementCalendrier");
    expect(URL_CALENDRIER_ATELIERS).toBe("https://www.lecocooningclub.fr/api/calendrier-ateliers");
    expect(webcalCalendrier()).toBe("webcal://www.lecocooningclub.fr/api/calendrier-ateliers");
    expect(lienGoogleAgenda()).toBe("https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fwww.lecocooningclub.fr%2Fapi%2Fcalendrier-ateliers");
  });
});
