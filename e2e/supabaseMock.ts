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
  espaces: { slug: "papotages" },
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
  url_avatar: null,
  debut_abonnement: null,
  fin_abonnement: null,
  role: "membre",
  est_actif: true,
  cree_le: "2026-01-01T00:00:00Z",
};

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
  /** Corps JSON des UPDATE (PATCH) reçus, par table. */
  updates: Record<string, unknown[]>;
  /** Corps JSON des appels de fonctions (rpc), par nom. */
  rpc: Record<string, unknown[]>;
  /** Filtres des DELETE reçus (ex. « id=eq.… »), par table. */
  deletes: Record<string, string[]>;
  /**
   * Pannes simulées, modifiables en cours de test :
   * - inscriptions : l'enregistrement normal échoue (erreur serveur) ;
   * - doublon : la base répond « une pré-inscription existe déjà » ;
   * - secours : la table de secours est injoignable (coupure réseau).
   */
  pannes: { inscriptions: boolean; doublon: boolean; secours: boolean };
}

const corpsJson = (req: Request) => {
  const brut = req.postData();
  return brut ? JSON.parse(brut) : null;
};

export interface OptionsMock {
  /** Connecte ce membre : session stockée dans le navigateur + profil renvoyé par la base. */
  membre?: typeof MEMBRE_TEST;
  /** Ligne `utilisateurs` renvoyée à la personne connectée (voir e2e/session.ts). */
  profil?: Record<string, unknown>;
  /** Lignes renvoyées à la lecture de la table `inscriptions` (page admin). */
  inscriptions?: Record<string, unknown>[];
  /** Tables de l'offre (écran admin « Offre & adhésions »). */
  formules?: Record<string, unknown>[];
  adhesions?: Record<string, unknown>[];
  espaces?: Record<string, unknown>[];
  /** Ateliers renvoyés à la lecture de la table `ateliers` (par défaut : un atelier Papotages). */
  ateliers?: Record<string, unknown>[];
  /** Lignes de la vue `vue_autorisation_image` (consentement photo par personne). */
  autorisationsImage?: Record<string, unknown>[];
  /** Lignes de `vue_logs` (journal des actions de l'équipe). */
  logs?: Record<string, unknown>[];
  /** Ne pré-enregistre pas de choix de cookies : la bannière s'affiche (par défaut, le choix « refusé » est déjà fait). */
  sansChoixCookies?: boolean;
  /** Simule une base où la migration de l'offre n'est pas encore appliquée. */
  offreAbsente?: boolean;
  /** Lignes renvoyées à la recherche d'une adresse e-mail déjà utilisée (par défaut : aucune). */
  emailsExistants?: Record<string, unknown>[];
  /** Vacances scolaires (table `vacances_scolaires`, zone C). */
  vacances?: Record<string, unknown>[];
  /** Lignes de `pre_inscriptions_secours` (demandes à récupérer, page admin). */
  secours?: Record<string, unknown>[];
}

export const mockSupabase = async (page: Page, options: OptionsMock = {}): Promise<MockSupabase> => {
  const mock: MockSupabase = { inserts: {}, updates: {}, rpc: {}, deletes: {}, pannes: { inscriptions: false, doublon: false, secours: false } };
  const { membre } = options;

  if (membre) {
    await page.addInitScript(
      ([cle, valeur]) => localStorage.setItem(cle, valeur),
      ["sb-127-auth-token", JSON.stringify(sessionStockee(membre))],
    );
  }

  if (!options.sansChoixCookies) {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem("cc_consentement", JSON.stringify({ audience: false, date: new Date().toISOString() }));
      } catch { /* stockage indisponible */ }
    });
  }

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
    if (req.method() === "POST" && table === "inscriptions" && mock.pannes.doublon) {
      return route.fulfill({
        status: 400,
        json: { code: "P0001", message: "Une pré-inscription existe déjà pour cet atelier avec ces coordonnées. Nous revenons vers vous très vite !" },
      });
    }
    if (req.method() === "POST" && table === "inscriptions" && mock.pannes.inscriptions) {
      return route.fulfill({ status: 500, json: { code: "XX000", message: "panne simulée" } });
    }
    if (req.method() === "POST" && table === "pre_inscriptions_secours" && mock.pannes.secours) {
      return route.abort("failed");
    }
    if (req.method() === "POST" && table) {
      (mock.inserts[table] ??= []).push(corpsJson(req));
      if ((req.headers()["prefer"] ?? "").includes("return=representation")) {
        const ligne = { id: "eeeeeeee-0000-4000-8000-000000000001" };
        return route.fulfill({ status: 201, json: veutUnObjet ? ligne : [ligne] });
      }
      return route.fulfill({ status: 201, body: "" });
    }
    if (req.method() === "DELETE" && table) {
      (mock.deletes[table] ??= []).push(url.search);
      return route.fulfill({ status: 204, body: "" });
    }
    if (req.method() === "PATCH" && table) {
      (mock.updates[table] ??= []).push(corpsJson(req));
      return route.fulfill({ status: 204, body: "" });
    }
    // Recherche d'une adresse déjà utilisée (création d'un compte par l'équipe) : aucune par défaut.
    if (req.method() === "GET" && table === "utilisateurs" && url.search.includes("email=ilike")) {
      return route.fulfill({ json: options.emailsExistants ?? [] });
    }
    if (table === "utilisateurs" && (options.profil ?? membre)) {
      const profil = options.profil ?? membre;
      return route.fulfill({ json: veutUnObjet ? profil : [profil] });
    }
    if (table === "inscriptions" && options.inscriptions) return route.fulfill({ json: options.inscriptions });
    if (table === "formules" && options.formules) return route.fulfill({ json: options.formules });
    if (table === "adhesions" && options.adhesions) return route.fulfill({ json: options.adhesions });
    if (table === "vacances_scolaires") return route.fulfill({ json: options.vacances ?? [] });
    if (table === "pre_inscriptions_secours") return route.fulfill({ json: options.secours ?? [] });
    if (table === "vue_logs") return route.fulfill({ json: options.logs ?? [] });
    if (table === "vue_autorisation_image") return route.fulfill({ json: options.autorisationsImage ?? [] });
    if (table === "espaces" && options.espaces) return route.fulfill({ json: options.espaces });
    if (table === "ateliers" && options.ateliers && !veutUnObjet) return route.fulfill({ json: options.ateliers });
    if (table === "ateliers") return route.fulfill({ json: veutUnObjet ? ATELIER_TEST : [ATELIER_TEST] });
    if (table === "formulaires") return route.fulfill({ json: veutUnObjet ? FORMULAIRE_CONTACT : [FORMULAIRE_CONTACT] });
    return route.fulfill({ json: veutUnObjet ? null : [] });
  });

  return mock;
};
