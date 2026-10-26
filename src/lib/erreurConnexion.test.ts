import { describe, expect, it } from "vitest";
import { messageErreurConnexion } from "./erreurConnexion";

describe("message d'erreur de connexion", () => {
  it("distingue une adresse non confirmée d'un mauvais mot de passe", () => {
    expect(messageErreurConnexion({ code: "email_not_confirmed", message: "Email not confirmed" })).toMatch(/pas encore confirmée/);
    expect(messageErreurConnexion({ message: "Email not confirmed" })).toMatch(/pas encore confirmée/);
    expect(messageErreurConnexion({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe("Email ou mot de passe incorrect.");
  });
  it("signale une limite de tentatives", () => {
    expect(messageErreurConnexion({ status: 429, message: "Too many" })).toMatch(/Trop de tentatives/);
    expect(messageErreurConnexion({ code: "over_request_rate_limit" })).toMatch(/Trop de tentatives/);
  });
  it("retombe sur le message générique quand l'erreur est inconnue", () => {
    expect(messageErreurConnexion(null)).toBe("Email ou mot de passe incorrect.");
    expect(messageErreurConnexion({ message: "autre chose" })).toBe("Email ou mot de passe incorrect.");
  });
});
