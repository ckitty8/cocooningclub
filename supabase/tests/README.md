# Tests SQL de sécurité

Scénarios qui vérifient les triggers de sécurité sur une base Postgres jetable
(aucune connexion à la prod) :

- `20261015000000_verrouille_colonnes_sensibles.sql` : rôle, inscriptions et avis forgés ;
- `20261015000001_validation_et_limite_envois.sql` : validation des champs, doublons, limite d'envois ;
- `20261016000000_coherence_fonctionnelle.sql` : journal admin, annulation par un membre, places, témoignages ;
- `20261023000000_nettoyage_premium_et_mot_de_passe_hash.sql` : retrait des valeurs premium des enums (policies recréées à l'identique), suppression de `mot_de_passe_hash` ;
- `20261023000001_conservation_des_donnees.sql` et `20261023000002_minimisation_date_naissance.sql` : purge et anonymisation RGPD, retrait de la date de naissance des comptes.

```bash
createdb t
psql -d t -v ON_ERROR_STOP=1 -f supabase/tests/verrouille_colonnes_sensibles.setup.sql
psql -d t -v ON_ERROR_STOP=1 -f supabase/tests/validation_et_limite_envois.setup.sql
psql -d t -v ON_ERROR_STOP=1 -f supabase/tests/coherence_fonctionnelle.setup.sql
psql -d t -v ON_ERROR_STOP=1 -f supabase/migrations/20261015000000_verrouille_colonnes_sensibles.sql
psql -d t -v ON_ERROR_STOP=1 -f supabase/migrations/20261015000001_validation_et_limite_envois.sql
psql -d t -v ON_ERROR_STOP=1 -f supabase/migrations/20261016000000_coherence_fonctionnelle.sql
psql -d t -f supabase/tests/verrouille_colonnes_sensibles.test.sql
psql -d t -f supabase/tests/validation_et_limite_envois.test.sql
psql -d t -f supabase/tests/coherence_fonctionnelle.test.sql
```

Les deux dernières migrations ont leurs propres bases jetables (à lancer depuis la racine du dépôt) :

```bash
createdb t2
psql -d t2 -v ON_ERROR_STOP=1 -f supabase/tests/nettoyage_premium.setup.sql
psql -d t2 -f supabase/tests/nettoyage_premium.test.sql      # exécute la migration lui-même

createdb t3
psql -d t3 -v ON_ERROR_STOP=1 -f supabase/tests/conservation_des_donnees.setup.sql
psql -d t3 -v ON_ERROR_STOP=1 -f supabase/migrations/20261023000001_conservation_des_donnees.sql
psql -d t3 -v ON_ERROR_STOP=1 -f supabase/migrations/20261023000002_minimisation_date_naissance.sql
psql -d t3 -f supabase/tests/conservation_des_donnees.test.sql
```

Chaque bloc annonce s'il doit réussir ou échouer ; tout est fait dans des transactions annulées.
