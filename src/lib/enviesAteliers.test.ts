import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert }) } }));

import {
  HEURES, compterParStatut, enregistrerEnvie, enviesEnAttente, plageLisible, rejouerEnvies, filtrerEnvies, lienCreerAtelier, lienGmailEnvie, lienWhatsappEnvie, ligneEnvie, montantPlafond,
  numeroWhatsapp, phraseMateriel, tableauEnvies, validerEnvie, type Envie,
} from "./enviesAteliers";

const envie = (p: Partial<Envie> = {}): Envie => ({
  id: "1", cree_le: "2026-11-14T10:00:00Z", statut: "nouvelle", prenom: "Lucie", nom: "Durand", contact: "lucie@exemple.fr",
  espace: "creatifs", idee: "Couronnes de Noël", details: "Avec du sapin", souhait: "animer", materiel: "osier", budget: "25 €",
  jours: ["mercredi", "samedi"], heure_debut: "14:00", heure_fin: "17:30", ...p,
});

describe("validerEnvie", () => {
  it("exige prénom, espace, idée, souhait et consentement", () => {
    expect(Object.keys(validerEnvie({}))).toEqual(["prenom", "espace", "idee", "souhait", "consentement"]);
    expect(validerEnvie({ prenom: "Lucie", espace: "papotages", idee: "Tricot", souhait: "participer", consentement: true })).toEqual({});
  });
  it("refuse une idée trop longue", () => {
    expect(validerEnvie({ prenom: "L", espace: "creatifs", idee: "x".repeat(301), souhait: "animer", consentement: true }).idee).toMatch(/300/);
  });
});

describe("jours et plage horaire", () => {
  it("propose les heures de 8 h à 22 h par demi-heure", () => {
    expect(HEURES[0]).toBe("08:00");
    expect(HEURES[1]).toBe("08:30");
    expect(HEURES.at(-1)).toBe("22:00");
  });
  it("écrit la plage en clair", () => {
    expect(plageLisible("09:00", "12:30")).toBe("De 9 h à 12 h 30");
    expect(plageLisible("18:00", "")).toBe("À partir de 18 h");
    expect(plageLisible(null, "12:00")).toBe("Jusqu'à 12 h");
    expect(plageLisible(null, null)).toBe("");
  });
  it("refuse une fin avant le début", () => {
    const base = { prenom: "L", espace: "creatifs" as const, idee: "x", souhait: "animer" as const, consentement: true };
    expect(validerEnvie({ ...base, heure_debut: "14:00", heure_fin: "12:00" }).plage).toMatch(/après l'heure de début/);
    expect(validerEnvie({ ...base, heure_debut: "14:00", heure_fin: "16:00" })).toEqual({});
  });
});

describe("plafond du matériel", () => {
  it("formate le montant", () => {
    expect(montantPlafond(50)).toBe("50 €");
    expect(montantPlafond(37.5)).toBe("37,50 €");
    expect(montantPlafond(null)).toBe("");
  });
  it("garde une phrase générique sans montant", () => {
    expect(phraseMateriel(50)).toContain("dans la limite de 50 € par atelier");
    expect(phraseMateriel(null)).toContain("budget fixé par l'équipe");
  });
});

describe("ligneEnvie", () => {
  it("retire les champs vides et ajoute la date du consentement", () => {
    const l = ligneEnvie({ prenom: " Lucie ", nom: " ", contact: "", espace: "papotages", idee: " Tricot ", souhait: "participer", jours: ["samedi", "lundi"] });
    expect(l).toMatchObject({ jours: ["lundi", "samedi"], heure_debut: null, heure_fin: null, prenom: "Lucie", nom: null, contact: null, idee: "Tricot", details: null, materiel: null, budget: null });
    expect(l.consentement_le).toMatch(/^\d{4}-/);
  });
});

describe("contact", () => {
  it("reconnaît un numéro pour WhatsApp", () => {
    expect(numeroWhatsapp("06 00 00 00 00")).toBe("33600000000");
    expect(numeroWhatsapp("+33 6 00 00 00 00")).toBe("33600000000");
    expect(numeroWhatsapp("lucie@exemple.fr")).toBeNull();
    expect(numeroWhatsapp("bonjour")).toBeNull();
  });
  it("prépare Gmail pour un e-mail, WhatsApp pour un numéro", () => {
    expect(lienGmailEnvie(envie())).toContain("to=lucie%40exemple.fr");
    expect(lienWhatsappEnvie(envie())).toBeNull();
    expect(lienGmailEnvie(envie({ contact: "06 00 00 00 00" }))).toBeNull();
    expect(lienWhatsappEnvie(envie({ contact: "06 00 00 00 00" }))).toMatch(/^https:\/\/wa\.me\/33600000000\?text=Bonjour%20Lucie/);
  });
});

describe("écran admin", () => {
  const liste = [envie(), envie({ id: "2", statut: "retenue", espace: "papotages", idee: "Jeux de société", contact: null, materiel: undefined })];
  it("filtre par statut, espace et recherche", () => {
    expect(filtrerEnvies(liste, { statut: "retenue", espace: "", recherche: "" }).map(e => e.id)).toEqual(["2"]);
    expect(filtrerEnvies(liste, { statut: "", espace: "creatifs", recherche: "" }).map(e => e.id)).toEqual(["1"]);
    expect(filtrerEnvies(liste, { statut: "", espace: "", recherche: "osier" }).map(e => e.id)).toEqual(["1"]);
  });
  it("compte par statut", () => {
    expect(compterParStatut(liste)).toMatchObject({ nouvelle: 1, retenue: 1, programmee: 0 });
  });
  it("exporte en clair", () => {
    const t = tableauEnvies([envie()]);
    expect(t[1]).toEqual(["14/11/2026", "Lucie", "Durand", "lucie@exemple.fr", "Créatif", "Couronnes de Noël", "Avec du sapin",
      "L'animer moi-même, bénévolement", "osier", "25 €", "Mercredi, Samedi", "De 14 h à 17 h 30", "Nouvelle"]);
  });
  it("prépare la création d'un atelier", () => {
    const url = new URL(lienCreerAtelier(envie()), "https://x");
    expect(url.pathname).toBe("/admin/ateliers");
    expect(Object.fromEntries(url.searchParams)).toEqual({ nouveau: "1", titre: "Couronnes de Noël", description: "Avec du sapin", espace: "creatifs" });
    expect(new URL(lienCreerAtelier(envie({ espace: "je_ne_sais_pas" })), "https://x").searchParams.has("espace")).toBe(false);
  });
});

describe("aucune envie perdue", () => {
  const nouvelle = { prenom: "Lucie", espace: "creatifs" as const, idee: "Bougies", souhait: "participer" as const, jours: [] };
  beforeEach(() => { localStorage.clear(); insert.mockReset(); });

  it("enregistre directement quand le serveur répond", async () => {
    insert.mockResolvedValue({ error: null });
    expect(await enregistrerEnvie(nouvelle)).toBe("enregistree");
    expect(enviesEnAttente()).toBe(0);
  });

  it("garde l'envie dans le navigateur si la table manque ou le réseau tombe, puis la renvoie", async () => {
    insert.mockResolvedValueOnce({ error: { message: 'relation "envies_ateliers" does not exist' } });
    insert.mockRejectedValueOnce(new Error("Failed to fetch"));
    expect(await enregistrerEnvie(nouvelle)).toBe("locale");
    expect(await enregistrerEnvie(nouvelle)).toBe("locale");
    expect(enviesEnAttente()).toBe(2);

    insert.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "panne" } });
    expect(await rejouerEnvies()).toBe(1);
    expect(enviesEnAttente()).toBe(1);
    insert.mockResolvedValue({ error: null });
    expect(await rejouerEnvies()).toBe(1);
    expect(enviesEnAttente()).toBe(0);
  });
});
