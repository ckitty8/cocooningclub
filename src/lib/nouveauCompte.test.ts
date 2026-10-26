import { describe, expect, it } from "vitest";
import { validerNouveauCompte, type NouveauCompte } from "./nouveauCompte";

const base: NouveauCompte = { prenom: "Toto", nom: "Durand", email: "toto@exemple.fr", role: "inscrit", est_actif: false };

describe("validerNouveauCompte", () => {
  it("accepte une fiche sans compte de connexion, sans mot de passe", () => {
    expect(validerNouveauCompte(base)).toBeNull();
  });

  it("exige prénom, nom et e-mail", () => {
    expect(validerNouveauCompte({ ...base, prenom: "  " })).toMatch(/obligatoires/);
    expect(validerNouveauCompte({ ...base, nom: "" })).toMatch(/obligatoires/);
    expect(validerNouveauCompte({ ...base, email: "" })).toMatch(/obligatoires/);
  });

  it("exige un mot de passe d'au moins 6 caractères quand la connexion est activée", () => {
    expect(validerNouveauCompte({ ...base, est_actif: true })).toMatch(/obligatoire/);
    expect(validerNouveauCompte({ ...base, est_actif: true, mot_de_passe: "12345" })).toMatch(/6 caractères/);
    expect(validerNouveauCompte({ ...base, est_actif: true, mot_de_passe: "123456" })).toBeNull();
  });
});
