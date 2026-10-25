import type { Page } from "@playwright/test";

// Ouvre le site « déjà connecté » : la session est écrite dans le
// localStorage avant le chargement, comme le fait supabase-js après un
// vrai login. Le profil est fourni au faux backend (voir supabaseMock.ts).

const CLE_SESSION = "sb-127-auth-token"; // sb-<premier segment du nom d'hôte>-auth-token

const base64url = (objet: unknown) => Buffer.from(JSON.stringify(objet)).toString("base64url");

export const profilTest = (surcharge: Record<string, unknown> = {}) => ({
  id: "bbbbbbbb-0000-4000-8000-000000000001",
  nom: "Test",
  prenom: "Christelle",
  email: "christellelab@gmail.com",
  telephone: null,
  url_avatar: null,
  debut_abonnement: null,
  fin_abonnement: null,
  role: "administrateur",
  est_actif: true,
  cree_le: "2026-01-01T00:00:00Z",
  ...surcharge,
});

export const connecterEn = async (page: Page, profil: ReturnType<typeof profilTest>) => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jeton = `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url({ sub: profil.id, role: "authenticated", exp })}.signature`;
  const session = {
    access_token: jeton,
    refresh_token: "refresh-test",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    user: { id: profil.id, aud: "authenticated", role: "authenticated", email: profil.email, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
  };
  await page.addInitScript(([cle, valeur]) => localStorage.setItem(cle, valeur), [CLE_SESSION, JSON.stringify(session)]);
};
