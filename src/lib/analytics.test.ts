import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("Google Analytics avec un identifiant de mesure", () => {
  const charger = async () => {
    vi.resetModules();
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST000000");
    return import("./analytics");
  };
  const commandes = () => window.dataLayer.map(e => Array.from(e as ArrayLike<unknown>));

  beforeEach(() => {
    window.localStorage.clear();
    document.head.querySelectorAll('script[src*="googletagmanager"]').forEach(s => s.remove());
    delete (window as unknown as Record<string, unknown>)["ga-disable-G-TEST000000"];
  });
  afterEach(() => vi.unstubAllEnvs());

  it("accepter : consentement accordé, puis js et config (13 mois, sans page vue automatique), et le script est ajouté", async () => {
    const ga = await charger();
    ga.preparerConsentement();
    ga.appliquerChoix(true);
    const noms = commandes().map(a => a[0]);
    expect(noms).toEqual(["consent", "consent", "js", "config"]);
    expect(commandes()[1]).toEqual(["consent", "update", { analytics_storage: "granted" }]);
    expect(commandes()[3]).toEqual(["config", "G-TEST000000", { send_page_view: false, cookie_expires: 396 * 24 * 3600 }]);
    expect(document.querySelector('script[src*="gtag/js?id=G-TEST000000"]')).not.toBeNull();
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST000000"]).toBe(false);
  });

  it("refuser après avoir accepté : l'interrupteur de Google coupe la mesure", async () => {
    const ga = await charger();
    ga.appliquerChoix(true);
    ga.appliquerChoix(false);
    expect((window as unknown as Record<string, unknown>)["ga-disable-G-TEST000000"]).toBe(true);
    expect(commandes().pop()).toEqual(["consent", "update", { analytics_storage: "denied" }]);
  });

  it("les pages vues ne partent qu'après acceptation, et jamais depuis une page privée", async () => {
    const ga = await charger();
    const consentement = await import("./consentement");
    const pagesVues = () => commandes().filter(a => a[0] === "event").map(a => (a[2] as { page_path: string }).page_path);

    ga.preparerConsentement();
    ga.suivrePage("/calendrier");
    expect(pagesVues()).toEqual([]);

    consentement.enregistrerChoix(true);
    ga.suivrePage("/calendrier");
    for (const privee of ["/admin/dashboard", "/espace-membre/mon-compte", "/login", "/forgot-password", "/reset-password"]) {
      ga.suivrePage(privee);
    }
    ga.suivrePage("/inscription/abc");
    expect(pagesVues()).toEqual(["/calendrier", "/inscription/abc"]);
  });
});
