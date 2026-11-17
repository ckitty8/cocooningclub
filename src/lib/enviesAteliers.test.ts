import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert }) } }));

import {
  compterParStatut, enregistrerEnvoi, enviesEnAttente, filtrerEnvies, ideesRemplies, lienCreerAtelier, lienGmailEnvie,
  lienWhatsappEnvie, lignesEnvoi, montantPlafond, numeroWhatsapp, phraseMateriel, plagesLisibles, plagesRemplies,
  rejouerEnvies, tableauEnvies, validerEnvoi, type Envie, type EnvoiEnvies,
} from "./enviesAteliers";

const envie = (p: Partial<Envie> = {}): Envie => ({
  id: "1", cree_le: "2026-11-14T10:00:00Z", statut: "nouvelle", groupe_id: "g1", prenom: "Lucie", nom: "Durand",
  contact: "lucie@exemple.fr", espace: "creatifs", idee: "Couronnes de Noël", details: "Avec du sapin", souhait: "animer",
  materiel: "osier", budget: "25 €", jours: ["mercredi", "samedi"], plages: ["14 h – 17 h 30", "après 19 h"], ...p,
});

const base = { prenom: "Lucie", espace: "creatifs" as const, idees: ["Bougies"], souhait: "participer" as const, consentement: true };

describe("validerEnvoi", () => {
  it("exige le prénom, l'espace, au moins une idée, le souhait et le consentement", () => {
    expect(Object.keys(validerEnvoi({ idees: ["", "  "] }))).toEqual(["prenom", "espace", "idee-0", "souhait", "consentement"]);
    expect(validerEnvoi({ ...base, idees: ["", "Tricot"] })).toEqual({});
  });
  it("refuse une idée trop longue, sur sa ligne", () => {
    expect(validerEnvoi({ ...base, idees: ["Tricot", "x".repeat(301)] })).toEqual({ "idee-1": "300 caractères au maximum" });
  });
});

describe("idées saisies librement", () => {
  it("retire les lignes vides, les espaces superflus et les doublons", () => {
    expect(ideesRemplies([" Tricot ", "", "Couronnes  de Noël", "Tricot"])).toEqual(["Tricot", "Couronnes de Noël"]);
  });
});

describe("plages horaires saisies librement", () => {
  it("retire les espaces superflus, les lignes vides et les doublons", () => {
    expect(plagesRemplies(["  14 h   – 17 h ", "", "après 18 h", "14 h – 17 h", "  "])).toEqual(["14 h – 17 h", "après 18 h"]);
  });
  it("garde 5 plages de 100 caractères au plus", () => {
    expect(plagesRemplies(["a", "b", "c", "d", "e", "f"])).toHaveLength(5);
    expect(plagesRemplies(["x".repeat(150)])[0]).toHaveLength(100);
  });
  it("écrit les plages à la suite", () => {
    expect(plagesLisibles(["14 h – 17 h", "après 18 h"])).toBe("14 h – 17 h ; après 18 h");
    expect(plagesLisibles([])).toBe("");
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

describe("lignesEnvoi", () => {
  it("fait une ligne par idée, avec les mêmes réponses, reliées par le même groupe", () => {
    const envoi: EnvoiEnvies = {
      prenom: " Lucie ", nom: " ", contact: "", espace: "creatifs", souhait: "animer", details: " Pour Noël ", materiel: "osier", budget: "",
      idees: ["Couronnes", "", "Bougies"], jours: ["samedi", "lundi"], plages: [" après 18 h ", "", "le matin", "après 18 h"],
    };
    const lignes = lignesEnvoi(envoi, "g1");
    expect(lignes).toHaveLength(2);
    const commun = {
      groupe_id: "g1", prenom: "Lucie", nom: null, contact: null, espace: "creatifs", souhait: "animer", details: "Pour Noël",
      materiel: "osier", budget: null, jours: ["lundi", "samedi"], plages: ["après 18 h", "le matin"],
    };
    expect(lignes[0]).toMatchObject({ ...commun, idee: "Couronnes" });
    expect(lignes[1]).toMatchObject({ ...commun, idee: "Bougies" });
    expect(lignes[0].consentement_le).toMatch(/^\d{4}-/);
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
  const liste = [envie(), envie({ id: "2", statut: "retenue", espace: "papotages", idee: "Jeux de société", contact: null, materiel: null })];
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
      "L'animer moi-même, bénévolement", "osier", "25 €", "Mercredi, Samedi", "14 h – 17 h 30 ; après 19 h", "Nouvelle"]);
  });
  it("prépare la création d'un atelier", () => {
    const url = new URL(lienCreerAtelier(envie()), "https://x");
    expect(url.pathname).toBe("/admin/ateliers");
    expect(Object.fromEntries(url.searchParams)).toEqual({ nouveau: "1", titre: "Couronnes de Noël", description: "Avec du sapin", espace: "creatifs" });
    expect(new URL(lienCreerAtelier(envie({ espace: "je_ne_sais_pas" })), "https://x").searchParams.has("espace")).toBe(false);
  });
});

describe("aucune envie perdue", () => {
  const envoi: EnvoiEnvies = { prenom: "Lucie", espace: "creatifs", souhait: "participer", idees: ["Bougies", "Tricot"], jours: [], plages: [] };
  beforeEach(() => { localStorage.clear(); insert.mockReset(); });

  it("enregistre toutes les idées en une fois quand le serveur répond", async () => {
    insert.mockResolvedValue({ error: null });
    expect(await enregistrerEnvoi(envoi)).toBe("enregistree");
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toHaveLength(2);
    expect(enviesEnAttente()).toBe(0);
  });

  it("garde les idées dans le navigateur si la table manque ou le réseau tombe, puis les renvoie", async () => {
    insert.mockResolvedValueOnce({ error: { message: 'relation "envies_ateliers" does not exist' } });
    expect(await enregistrerEnvoi(envoi)).toBe("locale");
    insert.mockRejectedValueOnce(new Error("Failed to fetch"));
    expect(await enregistrerEnvoi({ ...envoi, idees: ["Bougies"] })).toBe("locale");
    expect(enviesEnAttente()).toBe(3);

    insert.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "panne" } }).mockResolvedValueOnce({ error: null });
    expect(await rejouerEnvies()).toBe(2);
    expect(enviesEnAttente()).toBe(1);
    insert.mockResolvedValue({ error: null });
    expect(await rejouerEnvies()).toBe(1);
    expect(enviesEnAttente()).toBe(0);
  });
});
