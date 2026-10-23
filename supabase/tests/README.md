# Tests SQL de sécurité

Scénarios qui vérifient les triggers de sécurité sur une base Postgres jetable
(aucune connexion à la prod) :

- `20261015000000_verrouille_colonnes_sensibles.sql` : rôle, inscriptions et avis forgés ;
- `20261015000001_validation_et_limite_envois.sql` : validation des champs, doublons, limite d'envois ;
- `20261016000000_coherence_fonctionnelle.sql` : journal admin, annulation par un membre, places, témoignages ;
- `20261023000001_corrige_inscription_tardive.sql` : pré-inscriptions bloquées pour tout le monde par un appel à `private.is_admin()` inexistant en prod (son test rejoue la panne puis le correctif).
- `20261023000003_offre_et_adhesions.sql` : formules d'adhésion, adhésions, validation (`valider_adhesion`, passage `inscrit` → `membre`) et échéance (`expirer_adhesions`).

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

# Correctif des inscriptions tardives : base séparée, à lancer depuis la racine du dépôt
createdb i
psql -d i -v ON_ERROR_STOP=1 -f supabase/tests/inscription_tardive.setup.sql
psql -d i -f supabase/tests/inscription_tardive.test.sql

# Offre et adhésions : base séparée, à lancer depuis la racine du dépôt
createdb o
psql -d o -v ON_ERROR_STOP=1 -f supabase/tests/offre_et_adhesions.setup.sql
psql -d o -v ON_ERROR_STOP=1 -f supabase/migrations/20261023000003_offre_et_adhesions.sql
psql -d o -f supabase/tests/offre_et_adhesions.test.sql
```

Chaque bloc annonce s'il doit réussir ou échouer ; tout est fait dans des transactions annulées.
