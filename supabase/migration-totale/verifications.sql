-- À lancer après migration-totale.sql : chaque ligne doit afficher ok = true.
-- Lecture seule. Fonctionne même si la migration n'est pas appliquée (les lignes affichent alors ok = false).
WITH controles(controle, ok) AS (
  VALUES
    ('Table formules',                        to_regclass('public.formules') IS NOT NULL),
    ('Table formule_espaces',                 to_regclass('public.formule_espaces') IS NOT NULL),
    ('Table adhesions',                       to_regclass('public.adhesions') IS NOT NULL),
    ('Vue vue_autorisation_image',            to_regclass('public.vue_autorisation_image') IS NOT NULL),
    ('Fonction valider_adhesion',             to_regprocedure('public.valider_adhesion(uuid,text,date,date)') IS NOT NULL),
    ('Fonction expirer_adhesions',            to_regprocedure('public.expirer_adhesions()') IS NOT NULL),
    ('Fonction supprimer_membre',             to_regprocedure('public.supprimer_membre(uuid)') IS NOT NULL),
    ('Colonne utilisateurs.commune',          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'utilisateurs' AND column_name = 'commune')),
    ('Colonne utilisateurs.activite',         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'utilisateurs' AND column_name = 'activite')),
    ('RLS activée sur formules',              COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.formules')), false)),
    ('RLS activée sur formule_espaces',       COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.formule_espaces')), false)),
    ('RLS activée sur adhesions',             COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.adhesions')), false)),
    ('Politiques sur adhesions (2 attendues)', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'adhesions') = 2),
    ('Vue en security_invoker',               COALESCE((SELECT reloptions::text[] && ARRAY['security_invoker=true', 'security_invoker=on'] FROM pg_class WHERE oid = to_regclass('public.vue_autorisation_image')), false)),
    ('Rôle membre premium interdit (contrainte)', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'utilisateurs_sans_role_premium' AND conrelid = 'public.utilisateurs'::regclass)),
    ('Colonne antennes.gratuit_pour_tous',   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'antennes' AND column_name = 'gratuit_pour_tous')),
    ('Fonction atelier_inclus',               to_regprocedure('public.atelier_inclus(uuid,uuid)') IS NOT NULL),
    ('Fonction mon_droit_atelier',            to_regprocedure('public.mon_droit_atelier(uuid)') IS NOT NULL),
    ('Fonction valider_sans_paiement',        to_regprocedure('public.valider_sans_paiement(uuid,text)') IS NOT NULL),
    ('Déclencheur de blocage des validations impayées', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_verifier_validation_impayee' AND tgrelid = 'public.inscriptions'::regclass)),
    ('Colonne ateliers.tarif_adherent',       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ateliers' AND column_name = 'tarif_adherent')),
    ('Tables de sauvegarde d''avril supprimées', to_regclass('public.inscriptions_backup_20260430') IS NULL AND to_regclass('public.transactions_paypal_backup_20260430') IS NULL),
    ('admin_dispo_le fermée aux visiteurs',   to_regprocedure('public.admin_dispo_le(date)') IS NULL OR NOT has_function_privilege('anon', 'public.admin_dispo_le(date)', 'EXECUTE')),
    ('Fonction morte decrement_atelier_spots supprimée', to_regprocedure('public.decrement_atelier_spots()') IS NULL),
    ('Au moins les 3 formules du bulletin',   CASE WHEN to_regclass('public.formules') IS NULL THEN false ELSE ((xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM public.formules', false, true, '')))[1]::text)::int >= 3 END),
    ('Formules rattachées à des espaces',     CASE WHEN to_regclass('public.formule_espaces') IS NULL THEN false ELSE ((xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM public.formule_espaces', false, true, '')))[1]::text)::int >= 4 END)
)
SELECT controle, ok FROM controles
UNION ALL
SELECT '=> TOUT EST OK', bool_and(ok) FROM controles;
