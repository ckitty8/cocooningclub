# Procédure du 23/10/2026 — migrations base de données

Rien n'est appliqué tant que ces étapes ne sont pas faites. Tous les scripts se collent dans **Supabase > SQL Editor** (projet CocooningClubBDD).

| # | Quand | Fichier | Rôle |
|---|---|---|---|
| 1 | avant tout | `a_coller_1_verifier_avant.sql` | Lecture seule. Chaque ligne doit être `OK` ou `INFO`. |
| 2 | après le déploiement du site | `a_coller_2_migrations_20261023.sql` | Les 5 migrations, dans l'ordre. |
| 3 | juste après | `a_coller_3_verifier_apres.sql` | Lecture seule. Chaque ligne doit être `OK`. |

## Ordre

1. Lancer le script 1. Si une ligne dit `A REGLER`, la corriger (ex. repasser un compte `membre_premium` en `membre`) avant de continuer.
2. Valider les durées de conservation : visites 13 mois, journal 12 mois, messages de contact 3 ans, invités anonymisés 3 ans après l'atelier, date de naissance effacée 30 jours après l'atelier.
3. Fusionner la branche `claude/gifted-cannon-0xl660` pour déployer le site (Vercel).
4. Dès que le déploiement est en ligne, lancer le script 2.
5. Lancer le script 3. Si `pg_cron` n'est pas actif (ligne 12), l'activer dans Database > Extensions, puis relancer le dernier bloc `DO` de l'étape 2 du script 2 (planification des jobs).

## Si ça échoue

- Chaque migration s'arrête avec un message explicite et sans modifier la base si une condition n'est pas remplie.
- Corriger, puis relancer le script 2 en entier : les étapes déjà passées se rejouent sans dégât.
- Rien ne se perd : seules la colonne `utilisateurs.date_naissance`, la colonne `mot_de_passe_hash` (vide) et les deux tables `*_backup_20260430` sont supprimées, de façon volontaire.

## Pourquoi pas via Claude

Les instructions qui modifient la structure (`DROP`, `ALTER`, `CREATE`) expirent à 60 s depuis l'outil Supabase de la session et n'appliquent rien. La lecture fonctionne.
