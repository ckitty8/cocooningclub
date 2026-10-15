# Notes pour Claude

## Rappel obligatoire

Quand l'utilisateur demande ce qu'il reste à faire, lui rappeler en premier les points en attente ci-dessous.

## Points en attente

- **Mentions légales** (obligatoires, loi LCEN) : page à créer avec éditeur (nom, adresse, statut juridique du club), directeur de publication et hébergeur (Vercel). L'utilisateur a toutes les infos mais veut traiter ce point plus tard.
- **Google Analytics 4 + bannière cookie** : reporté à plus tard par l'utilisateur. Il faudra son identifiant de mesure `G-XXXXXXXXXX`.

## Décisions prises

- **Analytics** : Google Analytics 4 (mise en place reportée). Implique une vraie bannière cookie (Accepter / Refuser / Personnaliser), avec Google Consent Mode v2 : rien n'est chargé avant consentement.
- **Domaine** : `lecocooningclub.fr` sans `www` (l'utilisateur n'a pas de préférence) ; rediriger `www` vers le domaine nu.

## Plan de mise en conformité (octobre 2026)

Ordre prévu :
1. ✅ Fait (commit aab2b35). Restent hors code : supprimer les pages mortes `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`, `src/pages/admin/Messages.tsx` et `src/assets/hero-workshop.jpg` (suppression refusée par les permissions) ; soumettre le sitemap dans Google Search Console. Contenu : Rapide et sans risque : HSTS / en-têtes de sécurité, sitemap + robots.txt, page 404, liens cassés, compression images (favicon de 783 Ko), meta title par page, image de partage 1200×630, favicon multi-tailles, textes alternatifs.
2. Juridique et analytics : ✅ CGU (page `/cgu` + case à cocher obligatoire sur les formulaires de pré-inscription ; textes « annulation / remboursement » à faire valider par l'utilisateur) ; bannière cookie, GA4, mise à jour de `/confidentialite` (GA, durée de conservation), mentions légales quand l'utilisateur fournit les infos.
3. Sécurité : ✅ audit RLS → migration `20261015000000_verrouille_colonnes_sensibles.sql` (À APPLIQUER EN PROD : élévation de rôle, inscriptions et avis forgés) ; ✅ migration `20261015000001_validation_et_limite_envois.sql` (À APPLIQUER EN PROD, après la précédente : validation des champs, doublons, limite d'envois par IP/email) ; ✅ piège à robots + délai minimal côté navigateur (`useAntiSpam`). Reste : Cloudflare Turnstile (nécessite un compte Cloudflare de l'utilisateur).
4. Contraste (AA) et responsive (360 → 1280 px).
