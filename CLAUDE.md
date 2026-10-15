# Notes pour Claude

## Rappel obligatoire

Quand l'utilisateur demande ce qu'il reste à faire, lui rappeler en premier les points en attente ci-dessous.

## Points en attente


- **Mentions légales** (obligatoires, loi LCEN) : page à créer avec éditeur (nom, adresse, statut juridique du club), directeur de publication et hébergeur (Vercel). L'utilisateur a toutes les infos mais veut traiter ce point plus tard.
- **Google Analytics 4 + bannière cookie** : reporté à plus tard par l'utilisateur. Il faudra son identifiant de mesure `G-XXXXXXXXXX`.

## Décisions prises

- **Analytics** : Google Analytics 4 (mise en place reportée). Implique une vraie bannière cookie (Accepter / Refuser / Personnaliser), avec Google Consent Mode v2 : rien n'est chargé avant consentement.
- **Domaine** : le domaine principal configuré dans Vercel est `www.lecocooningclub.fr` (Vercel redirige déjà le domaine nu vers `www`). NE JAMAIS ajouter de redirection `www` ↔ domaine nu dans `vercel.json` : le 15/10 une règle `www` → nu a créé une boucle (ERR_TOO_MANY_REDIRECTS, site KO). Les URL canoniques, le sitemap, robots.txt et og:image utilisent `https://www.lecocooningclub.fr`. Exception : le lien de réinitialisation du mot de passe (`src/pages/auth/ForgotPassword.tsx`) reste sur le domaine nu tant que `www` n'est pas ajouté aux URL de redirection autorisées dans Supabase Auth.

## Plan de mise en conformité (octobre 2026)

Ordre prévu :
1. ✅ Fait (commit aab2b35). Reste hors code : soumettre le sitemap dans Google Search Console. Contenu : Rapide et sans risque : HSTS / en-têtes de sécurité, sitemap + robots.txt, page 404, liens cassés, compression images (favicon de 783 Ko), meta title par page, image de partage 1200×630, favicon multi-tailles, textes alternatifs.
2. Juridique et analytics : ✅ CGU (page `/cgu` + case à cocher obligatoire sur les formulaires de pré-inscription ; textes « annulation / remboursement » à faire valider par l'utilisateur) ; bannière cookie, GA4, mise à jour de `/confidentialite` (GA, durée de conservation), mentions légales quand l'utilisateur fournit les infos.
3. Sécurité : ✅ migrations `20261015000000_verrouille_colonnes_sensibles.sql` et `20261015000001_validation_et_limite_envois.sql` (appliquées en prod le 16/10) ; ✅ `20261016000000_coherence_fonctionnelle.sql` appliquée en prod (journal admin, annulation par un membre, places rendues, témoignages, durcissement anti-spam). Note : l'outil `apply_migration` expire depuis la session, les migrations se collent dans le SQL Editor Supabase ; ✅ piège à robots + délai minimal côté navigateur (`useAntiSpam`). Reste : Cloudflare Turnstile (nécessite un compte Cloudflare de l'utilisateur).
4. Contraste (AA) et responsive (360 → 1280 px).

## Qualité du code

- `noUnusedLocals` / `noUnusedParameters` activés : `npx tsc -p tsconfig.app.json --noEmit` doit rester à 0 erreur, `npm run lint` à 0 avertissement.
- Code mort supprimé le 16/10 (composants shadcn/ui inutilisés, anciennes pages, dépendances). Seul `src/components/ui/sonner.tsx` reste de shadcn ; ajouter un composant = l'écrire ou le réinstaller, pas réintroduire tout le kit.
- Gestionnaires de paquets : `package-lock.json` (npm, cf. README) et `bun.lock` (Bun, utilisé par Vercel) doivent rester synchronisés : `bun add/remove …` puis `npm install --package-lock-only`.

## Tests

- `npm test` : tests unitaires (Vitest).
- `npm run test:e2e` : site public de bout en bout (Playwright, Supabase simulé, `CHROMIUM_PATH` optionnel).
- `supabase/tests/README.md` : scénarios SQL des migrations de sécurité sur une base Postgres jetable.
