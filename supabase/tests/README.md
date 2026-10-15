# Tests SQL de sécurité

Scénarios qui vérifient les triggers de `migrations/20261015000000_verrouille_colonnes_sensibles.sql`
sur une base Postgres jetable (aucune connexion à la prod).

```bash
createdb t
psql -d t -v ON_ERROR_STOP=1 -f supabase/tests/verrouille_colonnes_sensibles.setup.sql
psql -d t -v ON_ERROR_STOP=1 -f supabase/migrations/20261015000000_verrouille_colonnes_sensibles.sql
psql -d t -f supabase/tests/verrouille_colonnes_sensibles.test.sql
```

Chaque bloc annonce s'il doit réussir ou échouer ; tout est fait dans des transactions annulées.
