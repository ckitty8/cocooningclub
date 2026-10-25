# Migration totale du site : mode d'emploi

Ce dossier contient **tout ce qu'il faut le jour où le site bascule en production** : le SQL (en un seul
fichier), ses vérifications, le retour arrière et la checklist fonctionnelle. Il est tenu à jour à chaque
changement (voir « Règle de maintenance »).

| Fichier | Rôle |
|---|---|
| `verifier-avant.sql` | À lancer avant tout : chaque ligne doit être `OK` ou `INFO` (aucun compte `membre_premium`, aucun document `premium`, `mot_de_passe_hash` vide…). Lecture seule. |
| `migration-totale.sql` | Le SQL à coller dans le SQL Editor de Supabase. **Généré**, ne pas le modifier à la main. Une seule transaction : tout ou rien. Rejouable sans risque. Migrations additives, applicables avant la mise en ligne du site. |
| `verifications.sql` | À lancer juste après : chaque ligne doit afficher `ok = true`. Lecture seule. |
| `retour-arriere.sql` | Annule la migration (destructif pour les formules, adhésions et bulletins saisis). |
| `migration-deploiement.sql` | **Généré.** Les migrations qui renomment ou suppriment ce que l'ancien code utilise encore (« antennes » → « espaces », colonne `utilisateurs.date_naissance`) : à lancer **au déploiement du site**, pas avant. |
| `verifications-deploiement.sql` / `retour-arriere-deploiement.sql` | Leurs contrôles et leur retour arrière (la colonne `date_naissance` est recréée vide). |
| `checklist-fonctionnelle.md` | Les parcours à vérifier à la main, par rôle, avant et après la mise en ligne. |
| `journal-production.md` | Ce qui a **déjà** été fait directement en production (hors fichiers de migration). |
| `manifeste.json` | La liste ordonnée des migrations du paquet et la dernière appliquée en production. |
| `../manuel/20261023_supprimer_ciritecgrp.sql` | Étape finale **séparée et irréversible** : suppression d'un compte précis. |

## Important : la base est partagée

La preview Vercel et la production utilisent **la même base Supabase**. Les migrations de `migration-totale.sql`
sont **additives** pour le site actuel (nouvelles tables, colonnes, vue et fonctions ; les valeurs d'enum
« premium » et la colonne `mot_de_passe_hash`, que le site n'utilise plus, sont retirées) : on peut donc les
appliquer **avant** de fusionner le code dans `main`, sans casser le site actuel.

`migration-deploiement.sql` fait l'inverse : il **renomme** `antennes` en `espaces` (et `antenne_id` en `espace_id`)
et **supprime** `utilisateurs.date_naissance`. L'ancien code lit encore ces noms : le site de la branche et ce
fichier doivent passer ensemble. Tant que la preview partage la base de production, la preview de cette branche ne
fonctionne pas complètement avant l'application de `migration-deploiement.sql` (et l'ancien site ne fonctionne plus
après) : choisir un créneau peu fréquenté et enchaîner déploiement puis migration.

## Déroulé

1. **Préparer**
   - Choisir un créneau peu fréquenté ; prévenir l'équipe.
   - Sauvegarde : Supabase → Database → Backups (ou export manuel).
   - Coller `verifier-avant.sql` : aucune ligne `A REGLER` (sinon repasser les comptes `membre_premium` en `membre`, etc.).
   - Valider les durées de conservation des données personnelles (voir `checklist-fonctionnelle.md`).
   - En local : `npm run migration:verifier`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npm test`, `npm run test:e2e` doivent être verts.
   - Parcourir la partie « Avant » de `checklist-fonctionnelle.md`.
2. **Base de données**
   - Ouvrir le SQL Editor de Supabase, coller tout `migration-totale.sql`, exécuter.
   - Coller `verifications.sql`, exécuter : la dernière ligne `=> TOUT EST OK` doit valoir `true`.
   - Si une erreur survient, rien n'est appliqué (transaction) : corriger puis recommencer.
3. **Code et renommages**
   - Sur demande explicite de l'équipe, fusionner la branche de la preview dans `main` ; Vercel redéploie la production.
   - Dès que le déploiement est en ligne : coller `migration-deploiement.sql`, puis `verifications-deploiement.sql` (`=> TOUT EST OK` = `true`).
   - Ne jamais ajouter de redirection `www` ↔ domaine nu dans `vercel.json` (voir `CLAUDE.md`).
4. **Vérifier** : dérouler `checklist-fonctionnelle.md` (parties « Après »).
5. **Étape finale (irréversible, à part)** : supprimer le compte `ciritecgrp@gmail.com` avec `supabase/manuel/20261023_supprimer_ciritecgrp.sql`, après avoir vérifié que tout fonctionne.

## Retour arrière

- Code : annuler la fusion dans `main` (revert) ; Vercel redéploie l'ancienne version.
- Base : `retour-arriere-deploiement.sql` d'abord (si `migration-deploiement.sql` a été appliquée), puis `retour-arriere.sql` (supprime les nouveaux objets). À éviter si des adhésions réelles ont été saisies : préférer corriger en avant.

## Règle de maintenance (à chaque changement)

À chaque modification qui touche la base de données ou un parcours fonctionnel :

1. Toute nouvelle migration va dans `supabase/migrations/` (jamais d'objet créé « à la main » en production sans le noter dans `journal-production.md`).
2. L'ajouter dans `manifeste.json` (ordre chronologique : `migrations` si elle ne casse pas l'ancien code, `migrationsAuDeploiement` si elle renomme ou supprime ce qu'il lit), puis lancer `npm run migration:build`.
3. Compléter `verifications.sql` (un contrôle par objet créé) et `retour-arriere.sql`.
4. Compléter `checklist-fonctionnelle.md` (le parcours à vérifier) et, si besoin, `supabase/tests/`.
5. Après la mise en production d'une migration : mettre à jour `derniereMigrationAppliqueeEnProd` dans le manifeste et la retirer de `migrations`.

`npm run migration:verifier` (et un test automatique) échouent si `migration-totale.sql` ou `migration-deploiement.sql` est périmé ou si une
migration postérieure à la production manque dans le manifeste.
