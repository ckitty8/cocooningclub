import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert }) } }));

import {
  HEURES, compterParStatut, enregistrerEnvoi, enviesEnAttente, filtrerEnvies, ideeVide, lienCreerAtelier, lienGmailEnvie,
  lienWhatsappEnvie, lignesEnvoi, montantPlafond, numeroWhatsapp, phraseMateriel, plageLisible, plagesLisibles,
  rejouerEnvies, tableauEnvies, validerEnvoi, type Envie, type EnvoiEnvies,
} from "./enviesAteliers";

const envie = (p: Partial<Envie> = {}): Envie => ({
  id: "1", cree_le: "2026-11-14T10:00:00Z", statut: "nouvelle", groupe_id: "g1", prenom: "Lucie", nom: "Durand",
  contact: "lucie@exemple.fr", espace: "creatifs", idee: "Couronnes de Noël", details: "Avec du sapin", souhait: "animer",
  materiel: "osier", budget: "25 €", jours: ["mercredi", "samedi"], plages: ["14:00-17:30", "19:00-21:00"], ...p,
});

const idee = (p: Partial<ReturnType<typeof ideeVide>> = {}) => ({ ...ideeVide(), espace: "creatifs" as const, idee: "Bougies", souhait: "participer" as const, ...p });

describe("validerEnvoi", () => {
  it("exige le prénom, le consentement et, pour chaque idée, l'espace, l'idée et le souhait", () => {
    expect(Object.keys(validerEnvoi({ idees: [ideeVide(), ideeVide()] }))).toEqual([
      "prenom", "idee-0-espace", "idee-0-idee", "idee-0-souhait", "idee-1-espace", "idee-1-idee", "idee-1-souhait", "consentement",
    ]);
    expect(validerEnvoi({ prenom: "Lucie", idees: [idee(), idee({ idee: "Tricot" })], plages: [{}], consentement: true })).toEqual({});
  });
  it("refuse une idée trop longue", () => {
    expect(validerEnvoi({ prenom: "L", idees: [idee({ idee: "x".repeat(301) })], consentement: true })["idee-0-idee"]).toMatch(/300/);
  });
  it("contrôle chaque plage horaire (ligne vide ignorée)", () => {
    const base = { prenom: "L", idees: [idee()], consentement: true };
    const e = validerEnvoi({ ...base, plages: [{ debut: "09:00", fin: "12:00" }, {}, { debut: "14:00", fin: "12:00" }, { debut: "18:00" }] });
    expect(e).toEqual({
      "plage-2": "L'heure de fin doit être après l'heure de début",
      "plage-3": "Choisis l'heure de début et l'heure de fin",
    });
  });
});

describe("plages horaires", () => {
  it("propose les heures de 8 h à 22 h par demi-heure", () => {
    expect(HEURES[0]).toBe("08:00");
    expect(HEURES[1]).toBe("08:30");
    expect(HEURES.at(-1)).toBe("22:00");
  });
  it("écrit les plages en clair", () => {
    expect(plageLisible("09:00-12:30")).toBe("de 9 h à 12 h 30");
    expect(plagesLisibles(["09:00-12:00", "18:00-20:00"])).toBe("de 9 h à 12 h, de 18 h à 20 h");
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
  it("fait une ligne par idée, avec la personne, les jours triés et les plages complètes, reliées par le même groupe", () => {
    const envoi: EnvoiEnvies = {
      prenom: " Lucie ", nom: " ", contact: "", jours: ["samedi", "lundi"],
      plages: [{ debut: "18:00", fin: "20:00" }, {}, { debut: "09:00", fin: "12:00" }, { debut: "18:00", fin: "20:00" }],
      idees: [idee({ idee: " Tricot ", espace: "papotages" }), idee({ details: " Cire de soja ", budget: "20 €" })],
    };
    const lignes = lignesEnvoi(envoi, "g1");
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toMatchObject({
      groupe_id: "g1", prenom: "Lucie", nom: null, contact: null, jours: ["lundi", "samedi"], plages: ["18:00-20:00", "09:00-12:00"],
      espace: "papotages", idee: "Tricot", details: null, materiel: null, budget: null,
    });
    expect(lignes[1]).toMatchObject({ groupe_id: "g1", idee: "Bougies", details: "Cire de soja", budget: "20 €" });
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
      "L'animer moi-même, bénévolement", "osier", "25 €", "Mercredi, Samedi", "de 14 h à 17 h 30, de 19 h à 21 h", "Nouvelle"]);
  });
  it("prépare la création d'un atelier", () => {
    const url = new URL(lienCreerAtelier(envie()), "https://x");
    expect(url.pathname).toBe("/admin/ateliers");
    expect(Object.fromEntries(url.searchParams)).toEqual({ nouveau: "1", titre: "Couronnes de Noël", description: "Avec du sapin", espace: "creatifs" });
    expect(new URL(lienCreerAtelier(envie({ espace: "je_ne_sais_pas" })), "https://x").searchParams.has("espace")).toBe(false);
  });
});

describe("aucune envie perdue", () => {
  const envoi: EnvoiEnvies = { prenom: "Lucie", idees: [idee(), idee({ idee: "Tricot" })], jours: [], plages: [] };
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
    expect(await enregistrerEnvoi({ ...envoi, idees: [idee()] })).toBe("locale");
    expect(enviesEnAttente()).toBe(3);

    insert.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "panne" } }).mockResolvedValueOnce({ error: null });
    expect(await rejouerEnvies()).toBe(2);
    expect(enviesEnAttente()).toBe(1);
    insert.mockResolvedValue({ error: null });
    expect(await rejouerEnvies()).toBe(1);
    expect(enviesEnAttente()).toBe(0);
  });
});
