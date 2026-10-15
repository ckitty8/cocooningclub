# Notes pour Claude

## Rappel obligatoire

Quand l'utilisateur demande ce qu'il reste à faire, lui rappeler en premier les points en attente ci-dessous.

## Points en attente

- **Migration `supabase/migrations/20261016000000_coherence_fonctionnelle.sql`** : à coller dans le SQL Editor Supabase (l'outil `apply_migration` expire côté session). Le site déployé en dépend pour l'annulation par un membre et les témoignages.
- **Code mort à supprimer** (suppression refusée par les permissions de la session) : voir la section « Code mort » ci-dessous.

- **Mentions légales** (obligatoires, loi LCEN) : page à créer avec éditeur (nom, adresse, statut juridique du club), directeur de publication et hébergeur (Vercel). L'utilisateur a toutes les infos mais veut traiter ce point plus tard.
- **Google Analytics 4 + bannière cookie** : reporté à plus tard par l'utilisateur. Il faudra son identifiant de mesure `G-XXXXXXXXXX`.

## Décisions prises

- **Analytics** : Google Analytics 4 (mise en place reportée). Implique une vraie bannière cookie (Accepter / Refuser / Personnaliser), avec Google Consent Mode v2 : rien n'est chargé avant consentement.
- **Domaine** : le domaine principal configuré dans Vercel est `www.lecocooningclub.fr` (Vercel redirige déjà le domaine nu vers `www`). NE JAMAIS ajouter de redirection `www` ↔ domaine nu dans `vercel.json` : le 15/10 une règle `www` → nu a créé une boucle (ERR_TOO_MANY_REDIRECTS, site KO). Les URL canoniques, le sitemap, robots.txt et og:image utilisent `https://www.lecocooningclub.fr`. Exception : le lien de réinitialisation du mot de passe (`src/pages/auth/ForgotPassword.tsx`) reste sur le domaine nu tant que `www` n'est pas ajouté aux URL de redirection autorisées dans Supabase Auth.

## Plan de mise en conformité (octobre 2026)

Ordre prévu :
1. ✅ Fait (commit aab2b35). Restent hors code : supprimer les pages mortes `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/admin/Messages.tsx` et `src/assets/hero-workshop.jpg` (suppression refusée par les permissions) ; soumettre le sitemap dans Google Search Console. Contenu : Rapide et sans risque : HSTS / en-têtes de sécurité, sitemap + robots.txt, page 404, liens cassés, compression images (favicon de 783 Ko), meta title par page, image de partage 1200×630, favicon multi-tailles, textes alternatifs.
2. Juridique et analytics : ✅ CGU (page `/cgu` + case à cocher obligatoire sur les formulaires de pré-inscription ; textes « annulation / remboursement » à faire valider par l'utilisateur) ; bannière cookie, GA4, mise à jour de `/confidentialite` (GA, durée de conservation), mentions légales quand l'utilisateur fournit les infos.
3. Sécurité : ✅ migrations `20261015000000_verrouille_colonnes_sensibles.sql` et `20261015000001_validation_et_limite_envois.sql` (appliquées en prod le 16/10) ; ⏳ `20261016000000_coherence_fonctionnelle.sql` À APPLIQUER EN PROD (journal admin, annulation par un membre, places rendues, témoignages, durcissement anti-spam) ; ✅ piège à robots + délai minimal côté navigateur (`useAntiSpam`). Reste : Cloudflare Turnstile (nécessite un compte Cloudflare de l'utilisateur).
4. Contraste (AA) et responsive (360 → 1280 px).

## Code mort

Fichiers inaccessibles depuis `src/main.tsx` (calcul par les imports), à supprimer puis activer `noUnusedLocals` / `noUnusedParameters` dans `tsconfig.app.json` :
- `src/App.css`, `src/assets/hero-workshop.jpg`, `src/components/NavLink.tsx`, `src/data/antennesTheme.ts`, `src/hooks/use-mobile.tsx`, `src/hooks/use-toast.ts`
- `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/admin/Messages.tsx` (remplacée par Formulaire)
- `src/components/ui/*` sauf `sonner.tsx` (soit 48 fichiers, dont `toast.tsx`, `toaster.tsx`, `tooltip.tsx`, `use-toast.ts`)
- `playwright-fixture.ts`, `src/test/example.test.ts`
- Dépendances devenues inutiles : `@tanstack/react-query`, `next-themes`, `cmdk`, `date-fns`, `embla-carousel-react`, `input-otp`, `react-day-picker`, `react-resizable-panels`, `recharts`, `vaul`, et tous les `@radix-ui/*`.

## Tests

- `npm test` : tests unitaires (Vitest).
- `npm run test:e2e` : site public de bout en bout (Playwright, Supabase simulé, `CHROMIUM_PATH` optionnel).
- `supabase/tests/README.md` : scénarios SQL des migrations de sécurité sur une base Postgres jetable.
