import { describe, expect, it } from "vitest";
import { inscIdentite, type InscriptionIdentifiable } from "./inscriptionIdentite";

const base: InscriptionIdentifiable = {
  prenom_invite: null,
  nom_invite: null,
  email_invite: null,
  telephone_invite: null,
  date_naissance: null,
};

const compte = { prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr", telephone: "0601020304" };

describe("identité d'une pré-inscription", () => {
  it("utilise les champs saisis pour un visiteur", () => {
    expect(
      inscIdentite({ ...base, prenom_invite: "Léa", nom_invite: "Martin", email_invite: "lea@exemple.fr", telephone_invite: "0611223344" }),
    ).toEqual({ prenom: "Léa", nom: "Martin", email: "lea@exemple.fr", telephone: "0611223344", dateNaissance: null });
  });

  it("reprend la fiche du compte pour un membre connecté", () => {
    expect(inscIdentite({ ...base, utilisateurs: compte })).toEqual({
      prenom: "Marie",
      nom: "Dupont",
      email: "marie@exemple.fr",
      telephone: "0601020304",
      dateNaissance: null,
    });
  });

  it("préfère le téléphone et la date saisis pour l'atelier à la fiche du compte", () => {
    const res = inscIdentite({ ...base, telephone_invite: "0699999999", date_naissance: "1991-01-01", utilisateurs: compte });
    expect(res.telephone).toBe("0699999999");
    expect(res.dateNaissance).toBe("1991-01-01");
    expect(res.prenom).toBe("Marie");
  });

  it("ne plante pas sans aucune information", () => {
    expect(inscIdentite(base)).toEqual({ prenom: "", nom: "", email: null, telephone: null, dateNaissance: null });
  });
});
