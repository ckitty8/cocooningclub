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

export const ATELIER_ORACLE = {
  ...ATELIER_TEST,
  id: "aaaaaaaa-0000-4000-8000-000000000002",
  titre: "Atelier Créatif — Pierre & Oracle",
  date_atelier: dansJours(21),
};

export const MEMBRE_TEST = {
  id: "bbbbbbbb-0000-4000-8000-000000000001",
  prenom: "Marie",
  nom: "Dupont",
  email: "marie@exemple.fr",
  telephone: null,
  date_naissance: null,
  url_avatar: null,
  debut_abonnement: null,
  fin_abonnement: null,
  role: "membre",
  est_actif: true,
  cree_le: "2026-01-01T00:00:00Z",
};

export interface OptionsMock {
  /** Connecte ce membre : session stockée dans le navigateur + profil renvoyé par la base. */
  membre?: typeof MEMBRE_TEST;
  /** Ateliers renvoyés par la base (par défaut : ATELIER_TEST seul). */
  ateliers?: object[];
}

// Session Supabase telle que le client la relit depuis localStorage au
// chargement. La clé dépend du nom d'hôte de VITE_SUPABASE_URL (127.0.0.1).
const sessionStockee = (membre: typeof MEMBRE_TEST) => ({
  access_token: "e2e.access.token",
  refresh_token: "e2e-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: membre.id, aud: "authenticated", role: "authenticated", email: membre.email, app_metadata: {}, user_metadata: {}, created_at: membre.cree_le },
});

export interface MockSupabase {
  /** Corps JSON des INSERT reçus, par table. */
  inserts: Record<string, unknown[]>;
}

const corpsJson = (req: Request) => {
  const brut = req.postData();
  return brut ? JSON.parse(brut) : null;
};

export const mockSupabase = async (page: Page, options: OptionsMock = {}): Promise<MockSupabase> => {
  const mock: MockSupabase = { inserts: {} };
  const { membre, ateliers = [ATELIER_TEST] } = options;

  if (membre) {
    await page.addInitScript(
      ([cle, valeur]) => localStorage.setItem(cle, valeur),
      ["sb-127-auth-token", JSON.stringify(sessionStockee(membre))],
    );
  }

  await page.route("**/__supabase/**", async route => {
    const req = route.request();
    const url = new URL(req.url());
    const [, table] = url.pathname.split("/rest/v1/");
    const veutUnObjet = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");

    if (req.method() === "POST" && table?.startsWith("rpc/")) {
      return route.fulfill({ json: [] });
    }
    if (req.method() === "POST" && table) {
      (mock.inserts[table] ??= []).push(corpsJson(req));
      return route.fulfill({ status: 201, body: "" });
    }
    if (table === "ateliers") return route.fulfill({ json: ateliers });
    if (table === "utilisateurs" && membre) return route.fulfill({ json: veutUnObjet ? membre : [membre] });
    if (table === "formulaires") return route.fulfill({ json: veutUnObjet ? FORMULAIRE_CONTACT : [FORMULAIRE_CONTACT] });
    return route.fulfill({ json: veutUnObjet ? null : [] });
  });

  return mock;
};
