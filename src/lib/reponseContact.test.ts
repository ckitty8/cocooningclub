import { describe, expect, it } from "vitest";
import { brouillonReponse, emailContact, lienGmailReponse, prenomContact } from "./reponseContact";

const formulaire = {
  email: null, prenom: null, message: null, cree_le: "2026-11-03T10:00:00Z",
  reponses: { Nom: "Chauvet", Email: "maria@live.com", Message: "Bonjour\nSuper site.", "Prénom": "Maria-Victoria", "Téléphone": "06" },
};

describe("réponse Gmail à un message de contact", () => {
  it("retrouve l'e-mail et le prénom dans les réponses du formulaire", () => {
    expect(emailContact(formulaire)).toBe("maria@live.com");
    expect(prenomContact(formulaire)).toBe("Maria-Victoria");
    expect(emailContact({ ...formulaire, email: "col@x.fr" })).toBe("col@x.fr");
  });
  it("prépare un brouillon avec la formule d'appel et le message cité", () => {
    const { sujet, corps } = brouillonReponse(formulaire);
    expect(sujet).toBe("Votre message au Cocooning Club");
    expect(corps.startsWith("Bonjour Maria-Victoria,")).toBe(true);
    expect(corps).toContain("--- Votre message du 3 novembre 2026 ---\n> Bonjour\n> Super site.");
  });
  it("ouvre Gmail avec le destinataire, ou rien sans adresse", () => {
    const lien = lienGmailReponse(formulaire)!;
    expect(lien.startsWith("https://mail.google.com/mail/?view=cm&fs=1&to=maria%40live.com&su=")).toBe(true);
    expect(lienGmailReponse({ cree_le: "2026-11-03", reponses: {} })).toBeNull();
  });
  it("coupe un message trop long", () => {
    const { corps } = brouillonReponse({ cree_le: "2026-11-03", email: "a@b.fr", message: "x".repeat(3000) });
    expect(corps.length).toBeLessThan(1700);
  });
});
