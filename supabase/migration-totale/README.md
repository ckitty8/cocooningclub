# Migration totale du site : mode d'emploi

Ce dossier contient **tout ce qu'il faut le jour où le site bascule en production** : le SQL (en un seul
fichier), ses vérifications, le retour arrière et la checklist fonctionnelle. Il est tenu à jour à chaque
changement (voir « Règle de maintenance »).

| Fichier | Rôle |
|---|---|
| `migration-totale.sql` | Le SQL à coller dans le SQL Editor de Supabase. **Généré**, ne pas le modifier à la main. Une seule transaction : tout ou rien. Rejouable sans risque. |
| `verifications.sql` | À lancer juste après : chaque ligne doit afficher `ok = true`. Lecture seule. |
| `retour-arriere.sql` | Annule la migration (destructif pour les formules, adhésions et bulletins saisis). |
| `checklist-fonctionnelle.md` | Les parcours à vérifier à la main, par rôle, avant et après la mise en ligne. |
| `journal-production.md` | Ce qui a **déjà** été fait directement en production (hors fichiers de migration). |
| `manifeste.json` | La liste ordonnée des migrations du paquet et la dernière appliquée en production. |
| `../manuel/20261023_supprimer_ciritecgrp.sql` | Étape finale **séparée et irréversible** : suppression d'un compte précis. |

## Important : la base est partagée

La preview Vercel et la production utilisent **la même base Supabase**. Toutes les migrations du paquet sont
**additives** (nouvelles tables, colonnes, vue et fonctions ; rien n'est supprimé ni renommé) : on peut donc
les appliquer **avant** de fusionner le code dans `main`, sans casser le site actuel.

## Déroulé

1. **Préparer**
   - Choisir un créneau peu fréquenté ; prévenir l'équipe.
   - Sauvegarde : Supabase → Database → Backups (ou export manuel).
   - En local : `npm run migration:verifier`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npm test`, `npm run test:e2e` doivent être verts.
   - Parcourir la partie « Avant » de `checklist-fonctionnelle.md`.
2. **Base de données**
   - Ouvrir le SQL Editor de Supabase, coller tout `migration-totale.sql`, exécuter.
   - Coller `verifications.sql`, exécuter : la dernière ligne `=> TOUT EST OK` doit valoir `true`.
   - Si une erreur survient, rien n'est appliqué (transaction) : corriger puis recommencer.
3. **Code**
   - Sur demande explicite de l'équipe, fusionner la branche de la preview dans `main` ; Vercel redéploie la production.
   - Ne jamais ajouter de redirection `www` ↔ domaine nu dans `vercel.json` (voir `CLAUDE.md`).
4. **Vérifier** : dérouler `checklist-fonctionnelle.md` (parties « Après »).
5. **Étape finale (irréversible, à part)** : supprimer le compte `ciritecgrp@gmail.com` avec `supabase/manuel/20261023_supprimer_ciritecgrp.sql`, après avoir vérifié que tout fonctionne.

## Retour arrière

- Code : annuler la fusion dans `main` (revert) ; Vercel redéploie l'ancienne version.
- Base : `retour-arriere.sql` (supprime les nouveaux objets). À éviter si des adhésions réelles ont été saisies : préférer corriger en avant.

## Règle de maintenance (à chaque changement)

À chaque modification qui touche la base de données ou un parcours fonctionnel :

1. Toute nouvelle migration va dans `supabase/migrations/` (jamais d'objet créé « à la main » en production sans le noter dans `journal-production.md`).
2. L'ajouter dans `manifeste.json` (ordre chronologique), puis lancer `npm run migration:build`.
3. Compléter `verifications.sql` (un contrôle par objet créé) et `retour-arriere.sql`.
4. Compléter `checklist-fonctionnelle.md` (le parcours à vérifier) et, si besoin, `supabase/tests/`.
5. Après la mise en production d'une migration : mettre à jour `derniereMigrationAppliqueeEnProd` dans le manifeste et la retirer de `migrations`.

`npm run migration:verifier` (et un test automatique) échouent si `migration-totale.sql` est périmé ou si une
migration postérieure à la production manque dans le manifeste.
