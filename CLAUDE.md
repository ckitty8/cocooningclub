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
2. Juridique et analytics : CGU, bannière cookie, GA4, mise à jour de `/confidentialite` (GA, durée de conservation), mentions légales quand l'utilisateur fournit les infos.
3. Sécurité : audit RLS, fonctions Supabase pour contact / pré-inscription, validation côté serveur, anti-spam (honeypot + Cloudflare Turnstile + limite par IP).
4. Contraste (AA) et responsive (360 → 1280 px).
