import { describe, expect, it, vi } from "vitest";
import type { Profile } from "@/contexts/auth";
import {
  ATELIER_AVEC_DATE_NAISSANCE,
  preInscriptionMembreSchema,
  preInscriptionSchema,
  reponseEnBooleen,
  valeursInitiales,
} from "./preInscription";

// Le client Supabase n'est pas utilisé par ces fonctions pures.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const valide = {
  prenom: "Marie",
  nom: "Dupont",
  email: "marie@exemple.fr",
  phone: "06 12 34 56 78",
  workshop: "Atelier Papotages",
  birthdate: "",
  droitImage: "oui",
  whatsapp: "non",
  cgu: true,
};

const erreurs = (data: unknown, schema = preInscriptionSchema) => {
  const res = schema.safeParse(data);
  return res.success ? {} : Object.fromEntries(res.error.issues.map(i => [i.path[0], i.message]));
};

describe("preInscriptionSchema", () => {
  it("accepte une pré-inscription complète", () => {
    expect(erreurs(valide)).toEqual({});
  });

  it("accepte les deux réponses « non »", () => {
    expect(erreurs({ ...valide, droitImage: "non", whatsapp: "non" })).toEqual({});
  });

  it("exige un nom et un prénom distincts", () => {
    expect(erreurs({ ...valide, prenom: "  " })).toEqual({ prenom: "Veuillez indiquer votre prénom." });
    expect(erreurs({ ...valide, nom: "" })).toEqual({ nom: "Veuillez indiquer votre nom." });
  });

  it("refuse un email invalide", () => {
    expect(erreurs({ ...valide, email: "marie" })).toHaveProperty("email");
  });

  it("exige un téléphone valide", () => {
    expect(erreurs({ ...valide, phone: "" })).toEqual({ phone: "Veuillez indiquer votre numéro de téléphone." });
    expect(erreurs({ ...valide, phone: "appelle-moi" })).toHaveProperty("phone");
  });

  it("exige une réponse au droit à l'image et au groupe WhatsApp", () => {
    expect(erreurs({ ...valide, droitImage: "" })).toEqual({ droitImage: "Merci de choisir une réponse." });
    expect(erreurs({ ...valide, whatsapp: "" })).toEqual({ whatsapp: "Merci de choisir une réponse." });
    expect(erreurs({ ...valide, droitImage: "peut-être" })).toHaveProperty("droitImage");
  });

  it("exige l'acceptation des CGU", () => {
    expect(erreurs({ ...valide, cgu: false })).toHaveProperty("cgu");
  });

  it("exige la date de naissance pour l'atelier qui en a besoin, et seulement lui", () => {
    expect(erreurs({ ...valide, workshop: ATELIER_AVEC_DATE_NAISSANCE })).toHaveProperty("birthdate");
    expect(erreurs({ ...valide, workshop: ATELIER_AVEC_DATE_NAISSANCE, birthdate: "1990-05-12" })).toEqual({});
  });
});

describe("preInscriptionMembreSchema", () => {
  it("n'exige pas de ressaisir l'identité du compte, mais garde téléphone et réponses obligatoires", () => {
    const membre = { ...valide, prenom: "", nom: "", email: "" };
    expect(erreurs(membre, preInscriptionMembreSchema)).toEqual({});
    expect(erreurs({ ...membre, phone: "" }, preInscriptionMembreSchema)).toHaveProperty("phone");
    expect(erreurs({ ...membre, droitImage: "" }, preInscriptionMembreSchema)).toHaveProperty("droitImage");
  });
});

describe("reponseEnBooleen", () => {
  it("« oui » vaut true, tout le reste false", () => {
    expect(reponseEnBooleen("oui")).toBe(true);
    expect(reponseEnBooleen("non")).toBe(false);
    expect(reponseEnBooleen("")).toBe(false);
  });
});

describe("valeursInitiales", () => {
  it("laisse l'identité et les réponses vides pour une visiteuse", () => {
    expect(valeursInitiales("Atelier X")).toMatchObject({ prenom: "", nom: "", email: "", workshop: "Atelier X", droitImage: "", whatsapp: "", cgu: false });
  });

  it("pré-remplit l'identité d'un membre connecté", () => {
    const profil = { id: "u1", prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr", telephone: "0601020304" } as Profile;
    expect(valeursInitiales("Atelier X", profil)).toMatchObject({ prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr", phone: "0601020304" });
  });
});
