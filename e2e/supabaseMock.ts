import type { Page, Request } from "@playwright/test";

// Faux backend Supabase pour les tests : répond aux requêtes REST du site
// public avec des données d'exemple et garde la trace des écritures.

const dansJours = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const ATELIER_TEST = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  titre: "Atelier Papotages — Café des copines",
  date_atelier: dansJours(14),
  heure_debut: "14:00:00",
  duree: "2h",
  places_disponibles: 6,
  places_max: 10,
  description: "Un moment d'échange autour d'un café.",
  description_courte: "Échanges autour d'un café",
  lieu: "Gagny",
  adresse: "1 rue de la Paix, 93220 Gagny",
  tarif_affichage: "15 €",
  tarif_standard: 15,
  statut: "publie",
  date_fin_inscription: null,
  antennes: { slug: "papotages" },
};

const FORMULAIRE_CONTACT = {
  id: "f0000000-0000-4000-8000-000000000001",
  nom: "Contact",
  est_actif: true,
  form_fields: [
    { id: "c1", label: "Nom", field_type: "text", obligatoire: true, position: 1, options: null },
    { id: "c2", label: "Email", field_type: "email", obligatoire: true, position: 2, options: null },
    { id: "c3", label: "Message", field_type: "textarea", obligatoire: true, position: 3, options: null },
  ],
};

export interface MockSupabase {
  /** Corps JSON des INSERT reçus, par table. */
  inserts: Record<string, unknown[]>;
  /** Corps JSON des UPDATE (PATCH) reçus, par table. */
  updates: Record<string, unknown[]>;
  /** Corps JSON des appels de fonctions (rpc), par nom. */
  rpc: Record<string, unknown[]>;
}

const corpsJson = (req: Request) => {
  const brut = req.postData();
  return brut ? JSON.parse(brut) : null;
};

interface OptionsMock {
  /** Ligne `utilisateurs` renvoyée à la personne connectée (voir e2e/session.ts). */
  profil?: Record<string, unknown>;
  /** Lignes renvoyées à la lecture de la table `inscriptions` (page admin). */
  inscriptions?: Record<string, unknown>[];
  /** Tables de l'offre (écran admin « Offre & adhésions »). */
  formules?: Record<string, unknown>[];
  adhesions?: Record<string, unknown>[];
  antennes?: Record<string, unknown>[];
  /** Lignes de la vue `vue_autorisation_image` (consentement photo par personne). */
  autorisationsImage?: Record<string, unknown>[];
  /** Lignes de `vue_logs` (journal des actions de l'équipe). */
  logs?: Record<string, unknown>[];
  /** Simule une base où la migration de l'offre n'est pas encore appliquée. */
  offreAbsente?: boolean;
}

export const mockSupabase = async (page: Page, options: OptionsMock = {}): Promise<MockSupabase> => {
  const mock: MockSupabase = { inserts: {}, updates: {}, rpc: {} };

  await page.route("**/__supabase/**", async route => {
    const req = route.request();
    const url = new URL(req.url());
    const [, table] = url.pathname.split("/rest/v1/");
    const veutUnObjet = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");

    if (options.offreAbsente && (table === "formules" || table === "adhesions")) {
      return route.fulfill({
        status: 404,
        json: { code: "PGRST205", message: `Could not find the table 'public.${table}' in the schema cache` },
      });
    }
    if (req.method() === "POST" && table?.startsWith("rpc/")) {
      (mock.rpc[table.slice(4)] ??= []).push(corpsJson(req));
      return route.fulfill({ json: [] });
    }
    if (req.method() === "POST" && table) {
      (mock.inserts[table] ??= []).push(corpsJson(req));
      if ((req.headers()["prefer"] ?? "").includes("return=representation")) {
        const ligne = { id: "eeeeeeee-0000-4000-8000-000000000001" };
        return route.fulfill({ status: 201, json: veutUnObjet ? ligne : [ligne] });
      }
      return route.fulfill({ status: 201, body: "" });
    }
    if (req.method() === "PATCH" && table) {
      (mock.updates[table] ??= []).push(corpsJson(req));
      return route.fulfill({ status: 204, body: "" });
    }
    if (table === "utilisateurs" && options.profil) {
      return route.fulfill({ json: veutUnObjet ? options.profil : [options.profil] });
    }
    if (table === "inscriptions" && options.inscriptions) return route.fulfill({ json: options.inscriptions });
    if (table === "formules" && options.formules) return route.fulfill({ json: options.formules });
    if (table === "adhesions" && options.adhesions) return route.fulfill({ json: options.adhesions });
    if (table === "vue_logs") return route.fulfill({ json: options.logs ?? [] });
    if (table === "vue_autorisation_image") return route.fulfill({ json: options.autorisationsImage ?? [] });
    if (table === "antennes" && options.antennes) return route.fulfill({ json: options.antennes });
    if (table === "ateliers") return route.fulfill({ json: [ATELIER_TEST] });
    if (table === "formulaires") return route.fulfill({ json: veutUnObjet ? FORMULAIRE_CONTACT : [FORMULAIRE_CONTACT] });
    return route.fulfill({ json: veutUnObjet ? null : [] });
  });

  return mock;
};
