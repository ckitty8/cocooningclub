import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout du site public (dossier e2e/).
// Le site est construit puis servi localement ; les appels à Supabase sont
// interceptés dans le navigateur (voir e2e/supabaseMock.ts) : aucun test ne
// touche la base de production.
//
//   npm run test:e2e
//
// Variable optionnelle : CHROMIUM_PATH pour utiliser un Chromium déjà installé.
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  // L'audit de contraste et de mise en page (long) se lance à part : npm run audit:visuel
  testIgnore: process.env.AUDIT_VISUEL ? [] : ["**/audit/**"],
  testMatch: process.env.AUDIT_VISUEL ? "**/audit/*.spec.ts" : "**/*.spec.ts",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx vite build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Supabase « factice » sur la même origine : toutes ses routes sont mockées.
      VITE_SUPABASE_URL: `${BASE_URL}/__supabase`,
      VITE_SUPABASE_PUBLISHABLE_KEY: "e2e-anon-key",
      // Identifiant Google Analytics factice : le script de Google est intercepté dans les tests.
      VITE_GA_MEASUREMENT_ID: "G-TEST000000",
    },
  },
});
