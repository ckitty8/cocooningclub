import { beforeEach, describe, expect, it, vi } from "vitest";

// Faux client Supabase : chaque table renvoie la réponse programmée par le test.
const reponses: Record<string, { error: { code?: string; message?: string } | null } | "reseau"> = {};
const envois: { table: string; ligne: Record<string, unknown> }[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      insert: async (ligne: Record<string, unknown>) => {
        envois.push({ table, ligne });
        const r = reponses[table] ?? { error: null };
        if (r === "reseau") throw new TypeError("Failed to fetch");
        return r;
      },
    }),
  },
}));

import { enregistrerPreInscription, estDoublon, nombreEnFile, rejouerFile, type DemandePreInscription } from "./preInscriptionSecours";

const demande: DemandePreInscription = {
  data: { prenom: "Léa", nom: "Martin", email: "lea@exemple.fr", phone: "0611223344", workshop: "Atelier floral", birthdate: "", droitImage: "oui", whatsapp: "non", cgu: true },
  atelierId: "atelier-1",
  atelierTitre: "Atelier floral",
  profil: null,
};

beforeEach(() => {
  window.localStorage.clear();
  envois.length = 0;
  for (const cle of Object.keys(reponses)) delete reponses[cle];
});

describe("enregistrerPreInscription", () => {
  it("enregistre normalement dans inscriptions, sans rien en secours", async () => {
    expect(await enregistrerPreInscription(demande)).toEqual({ issue: "enregistree" });
    expect(envois.map(e => e.table)).toEqual(["inscriptions"]);
    expect(nombreEnFile()).toBe(0);
  });

  it("n'enregistre pas en secours un doublon : la personne est déjà notée", async () => {
    reponses.inscriptions = { error: { code: "P0001", message: "Une pré-inscription existe déjà pour cet atelier." } };
    expect(await enregistrerPreInscription(demande)).toEqual({ issue: "doublon", message: "Une pré-inscription existe déjà pour cet atelier." });
    expect(envois.map(e => e.table)).toEqual(["inscriptions"]);
  });

  it("garde les coordonnées en secours quand l'enregistrement normal échoue, avec la cause", async () => {
    reponses.inscriptions = { error: { code: "XX000", message: "panne" } };
    expect(await enregistrerPreInscription(demande)).toEqual({ issue: "secours" });
    expect(envois[1]).toEqual({
      table: "pre_inscriptions_secours",
      ligne: expect.objectContaining({ prenom: "Léa", nom: "Martin", email: "lea@exemple.fr", telephone: "0611223344", atelier_id: "atelier-1", droit_image: true, accord_whatsapp: false, erreur: "XX000 : panne" }),
    });
  });

  it("enregistre quand même la pré-inscription si la base n'a pas encore les colonnes de consentement", async () => {
    let appels = 0;
    reponses.inscriptions = { get error() { appels += 1; return appels === 1 ? { code: "PGRST204", message: "Could not find the 'accord_whatsapp' column" } : null; } } as never;
    expect(await enregistrerPreInscription(demande)).toEqual({ issue: "enregistree" });
    expect(envois.map(e => e.table)).toEqual(["inscriptions", "inscriptions"]);
    expect(envois[0].ligne).toHaveProperty("accord_whatsapp");
    expect(envois[1].ligne).not.toHaveProperty("accord_whatsapp");
    expect(envois[1].ligne).toEqual(expect.objectContaining({ email_invite: "lea@exemple.fr" }));
  });

  it("garde aussi en secours une limite d'envois atteinte (la demande n'est pas perdue)", async () => {
    reponses.inscriptions = { error: { code: "P0001", message: "Trop d'envois en peu de temps." } };
    expect((await enregistrerPreInscription(demande)).issue).toBe("secours");
  });

  it("passe directement en secours si l'atelier est introuvable", async () => {
    expect(await enregistrerPreInscription({ ...demande, atelierId: null })).toEqual({ issue: "secours" });
    expect(envois.map(e => e.table)).toEqual(["pre_inscriptions_secours"]);
    expect(envois[0].ligne.atelier_titre).toBe("Atelier floral");
  });

  it("prend l'identité du compte pour un membre connecté", async () => {
    reponses.inscriptions = { error: { code: "XX000", message: "panne" } };
    await enregistrerPreInscription({ ...demande, profil: { id: "u1", prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr" } });
    expect(envois[1].ligne).toEqual(expect.objectContaining({ prenom: "Marie", nom: "Dupont", email: "marie@exemple.fr", utilisateur_id: "u1" }));
  });

  it("garde la demande dans le navigateur quand tout échoue, puis la renvoie une fois le réseau revenu", async () => {
    reponses.inscriptions = "reseau";
    reponses.pre_inscriptions_secours = "reseau";
    expect(await enregistrerPreInscription(demande)).toEqual({ issue: "locale" });
    expect(nombreEnFile()).toBe(1);

    // Toujours en panne : la demande reste dans la file.
    expect(await rejouerFile()).toBe(0);
    expect(nombreEnFile()).toBe(1);

    // Retour à la normale : elle part en base et la file se vide.
    delete reponses.inscriptions;
    delete reponses.pre_inscriptions_secours;
    envois.length = 0;
    expect(await rejouerFile()).toBe(1);
    expect(nombreEnFile()).toBe(0);
    expect(envois.map(e => e.table)).toEqual(["inscriptions"]);
  });
});

describe("estDoublon", () => {
  it("ne reconnaît que le message de doublon", () => {
    expect(estDoublon({ code: "P0001", message: "Une pré-inscription existe déjà…" })).toBe(true);
    expect(estDoublon({ code: "P0001", message: "Trop d'envois" })).toBe(false);
    expect(estDoublon({ code: "XX000", message: "existe déjà" })).toBe(false);
    expect(estDoublon(null)).toBe(false);
  });
});
