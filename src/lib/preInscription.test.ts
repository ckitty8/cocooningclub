import { describe, expect, it, vi } from "vitest";
import type { Profile } from "@/contexts/auth";
import {
  ATELIER_AVEC_DATE_NAISSANCE,
  preInscriptionSchema,
  separerNomComplet,
  valeursInitiales,
} from "./preInscription";

// Le client Supabase n'est pas utilisé par ces fonctions pures.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const valide = {
  name: "Marie Dupont",
  email: "marie@exemple.fr",
  phone: "06 12 34 56 78",
  workshop: "Atelier Papotages",
  birthdate: "",
  cgu: true,
};

const erreurs = (data: unknown) => {
  const res = preInscriptionSchema.safeParse(data);
  return res.success ? {} : Object.fromEntries(res.error.issues.map(i => [i.path[0], i.message]));
};

describe("preInscriptionSchema", () => {
  it("accepte une pré-inscription complète", () => {
    expect(erreurs(valide)).toEqual({});
  });

  it("accepte un téléphone vide", () => {
    expect(erreurs({ ...valide, phone: "" })).toEqual({});
  });

  it("refuse un email invalide", () => {
    expect(erreurs({ ...valide, email: "marie" })).toHaveProperty("email");
  });

  it("refuse un téléphone qui contient des lettres", () => {
    expect(erreurs({ ...valide, phone: "appelle-moi" })).toHaveProperty("phone");
  });

  it("exige l'acceptation des CGU", () => {
    expect(erreurs({ ...valide, cgu: false })).toHaveProperty("cgu");
  });

  it("exige la date de naissance pour l'atelier qui en a besoin, et seulement lui", () => {
    expect(erreurs({ ...valide, workshop: ATELIER_AVEC_DATE_NAISSANCE })).toHaveProperty("birthdate");
    expect(erreurs({ ...valide, workshop: ATELIER_AVEC_DATE_NAISSANCE, birthdate: "1990-05-12" })).toEqual({});
  });
});

describe("separerNomComplet", () => {
  it("sépare le prénom du reste du nom", () => {
    expect(separerNomComplet("  Marie   de La Tour ")).toEqual({ prenom: "Marie", nom: "de La Tour" });
  });

  it("utilise le prénom comme nom quand il est seul", () => {
    expect(separerNomComplet("Marie")).toEqual({ prenom: "Marie", nom: "Marie" });
  });
});

describe("valeursInitiales", () => {
  it("laisse l'identité vide pour un visiteur", () => {
    expect(valeursInitiales("Atelier X")).toMatchObject({ name: "", email: "", workshop: "Atelier X", cgu: false });
  });

  it("pré-remplit l'identité d'un membre connecté", () => {
    const profil = { id: "u1", prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr" } as Profile;
    expect(valeursInitiales("Atelier X", profil)).toMatchObject({ name: "Marie Dupont", email: "marie@exemple.fr" });
  });
});
