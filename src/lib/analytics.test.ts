import { beforeEach, describe, expect, it } from "vitest";
import { appliquerChoix, preparerConsentement, supprimerCookiesGoogle } from "./analytics";

const evenementsConsentement = () =>
  window.dataLayer.map(e => Array.from(e as ArrayLike<unknown>)).filter(a => a[0] === "consent");

beforeEach(() => {
  window.dataLayer = [];
  document.cookie = "_ga=GA1.1.1; path=/";
  document.cookie = "_ga_TEST=GS1.1.1; path=/";
  document.cookie = "autre=1; path=/";
});

describe("Google Analytics et consentement", () => {
  it("refuse tout par défaut, avant tout chargement de Google", () => {
    preparerConsentement();
    const [, action, valeurs] = evenementsConsentement()[0];
    expect(action).toBe("default");
    expect(valeurs).toEqual({ ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it("supprime les cookies _ga et laisse les autres", () => {
    supprimerCookiesGoogle();
    expect(document.cookie).not.toContain("_ga");
    expect(document.cookie).toContain("autre=1");
  });

  it("un refus coupe la mesure et efface les cookies Google", () => {
    appliquerChoix(false);
    const dernier = evenementsConsentement().pop()!;
    expect(dernier[1]).toBe("update");
    expect(dernier[2]).toEqual({ analytics_storage: "denied" });
    expect(document.cookie).not.toContain("_ga");
  });
});
