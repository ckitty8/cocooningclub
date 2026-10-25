# Tests SQL de sécurité

Scénarios qui vérifient les triggers de sécurité sur une base Postgres jetable
(aucune connexion à la prod) :

- `20261015000000_verrouille_colonnes_sensibles.sql` : rôle, inscriptions et avis forgés ;
- `20261015000001_validation_et_limite_envois.sql` : validation des champs, doublons, limite d'envois ;
- `20261016000000_coherence_fonctionnelle.sql` : journal admin, annulation par un membre, places, témoignages ;
- `20261023000001_corrige_inscription_tardive.sql` : pré-inscriptions bloquées pour tout le monde par un appel à `private.is_admin()` inexistant en prod (son test rejoue la panne puis le correctif).
- `20261023000003_offre_et_adhesions.sql` : formules d'adhésion, adhésions, validation (`valider_adhesion`, passage `inscrit` → `membre`) et échéance (`expirer_adhesions`).
- `20261023000005_droits_par_offre.sql` : droits par offre (`atelier_inclus`, colonne `antennes.gratuit_pour_tous`, déclencheur des inscriptions : paiement « non requis » si atelier gratuit ou inclus dans l'adhésion).
- `20261023000006_bloque_validation_impayee.sql` : une inscription ne peut pas être validée tant que son paiement est « en attente » ; dérogation motivée et journalisée par `valider_sans_paiement` (administrateurs).
- `20261023000007_tarif_adherente.sql` : colonne `ateliers.tarif_adherent` (prix adhérente) et `atelier_inclus` mise à jour.
- `20261023000009_reserve_admin_dispo_aux_admins.sql` : `admin_dispo_le` réservée aux administrateurs (droit retiré aux visiteurs + contrôle dans la fonction).
- `20261024000000_nettoyage_premium_et_mot_de_passe_hash.sql` : retrait des valeurs premium des enums (policies recréées à l'identique), suppression de `mot_de_passe_hash` ;
- `20261024000001_conservation_des_donnees.sql` et `20261024000002_minimisation_date_naissance.sql` : purge et anonymisation RGPD, retrait de la date de naissance des comptes ;
- `20261025000000_pre_inscriptions_secours.sql` : filet de sécurité des pré-inscriptions (table `pre_inscriptions_secours` : dépôt ouvert aux visiteurs, lecture réservée aux administrateurs, champs tronqués, limite large, purge à 6 mois). Test : `pre_inscriptions_secours.test.sql`, sur la base `t` du premier bloc ci-dessous après les trois migrations de sécurité.
- `20261025000001_consentements_pre_inscription.sql` : droit à l'image et accord WhatsApp de la pré-inscription, date de consentement posée par la base. Test : `consentements_pre_inscription.test.sql` (même base `t`).
- `20261024000003_renomme_antennes_en_espaces.sql` : renommage de la table, des colonnes (`ateliers`, `formule_espaces`) et des vues, réécriture de `atelier_inclus`.

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

# Droits par offre : base séparée (le setup rejoue 000003), à lancer depuis la racine du dépôt
createdb d
psql -d d -v ON_ERROR_STOP=1 -f supabase/tests/droits_par_offre.setup.sql
psql -d d -v ON_ERROR_STOP=1 -f supabase/migrations/20261023000005_droits_par_offre.sql
psql -d d -v ON_ERROR_STOP=1 -f supabase/migrations/20261023000006_bloque_validation_impayee.sql
psql -d d -v ON_ERROR_STOP=1 -f supabase/migrations/20261023000007_tarif_adherente.sql
psql -d d -v ON_ERROR_STOP=1 -f supabase/migrations/20261023000009_reserve_admin_dispo_aux_admins.sql
psql -d d -f supabase/tests/droits_par_offre.test.sql
```

Le paquet complet de la migration totale (SQL unique, vérifications, retour arrière) est dans `supabase/migration-totale/` ; il a été rejoué sur une base jetable (première application, deuxième application, retour arrière, réapplication).

Les migrations du 24/10 ont leurs propres bases jetables (à lancer depuis la racine du dépôt) :

```bash
createdb t2
psql -d t2 -v ON_ERROR_STOP=1 -f supabase/tests/nettoyage_premium.setup.sql
psql -d t2 -f supabase/tests/nettoyage_premium.test.sql      # exécute la migration lui-même

createdb t3
psql -d t3 -v ON_ERROR_STOP=1 -f supabase/tests/conservation_des_donnees.setup.sql
psql -d t3 -v ON_ERROR_STOP=1 -f supabase/migrations/20261024000001_conservation_des_donnees.sql
psql -d t3 -v ON_ERROR_STOP=1 -f supabase/migrations/20261024000002_minimisation_date_naissance.sql
psql -d t3 -f supabase/tests/conservation_des_donnees.test.sql
```

```bash
createdb t4
psql -d t4 -v ON_ERROR_STOP=1 -f supabase/tests/renomme_espaces.setup.sql
psql -d t4 -v ON_ERROR_STOP=1 -f supabase/migrations/20261024000003_renomme_antennes_en_espaces.sql
psql -d t4 -f supabase/tests/renomme_espaces.test.sql
```

Renommage après l'offre : rejouer la base « Droits par offre » (ci-dessus, base `d`), puis le renommage par-dessus
et son test d'intégration (`formule_espaces`, `atelier_inclus`, pré-inscription) :

```bash
psql -d d -v ON_ERROR_STOP=1 -f supabase/migrations/20261024000003_renomme_antennes_en_espaces.sql
psql -d d -f supabase/tests/renomme_espaces_apres_offre.test.sql
```

Chaque bloc annonce s'il doit réussir ou échouer ; tout est fait dans des transactions annulées.
