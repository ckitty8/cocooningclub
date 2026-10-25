import { beforeEach, describe, expect, it } from "vitest";
import { audienceAutorisee, enregistrerChoix, lireChoix, surChangementDeChoix } from "./consentement";

beforeEach(() => window.localStorage.clear());

describe("choix de mesure d'audience", () => {
  it("n'autorise rien tant qu'il n'y a pas de choix", () => {
    expect(lireChoix()).toBeNull();
    expect(audienceAutorisee()).toBe(false);
  });

  it("enregistre l'acceptation puis le refus", () => {
    enregistrerChoix(true);
    expect(audienceAutorisee()).toBe(true);
    enregistrerChoix(false);
    expect(audienceAutorisee()).toBe(false);
    expect(lireChoix()?.audience).toBe(false);
  });

  it("expire après 6 mois : le choix est alors redemandé", () => {
    const debut = new Date("2026-01-15T10:00:00Z");
    enregistrerChoix(true, debut);
    expect(lireChoix(new Date("2026-07-14T10:00:00Z"))?.audience).toBe(true);
    expect(lireChoix(new Date("2026-07-16T10:00:00Z"))).toBeNull();
  });

  it("ignore un contenu illisible", () => {
    window.localStorage.setItem("cc_consentement", "pas du json");
    expect(lireChoix()).toBeNull();
    window.localStorage.setItem("cc_consentement", JSON.stringify({ audience: "oui", date: "x" }));
    expect(lireChoix()).toBeNull();
  });

  it("prévient les écouteurs à chaque nouveau choix", () => {
    const recus: boolean[] = [];
    const arret = surChangementDeChoix(c => recus.push(c.audience));
    enregistrerChoix(true);
    enregistrerChoix(false);
    arret();
    enregistrerChoix(true);
    expect(recus).toEqual([true, false]);
  });
});
