-- À lancer depuis la racine du dépôt, sur la base « t » du README (trois setup de sécurité et migrations 20261015000000,
-- 20261015000001, 20261016000000), après 20261025000001_consentements_pre_inscription.sql.
\set ON_ERROR_STOP 0
\set VERBOSITY terse
\echo '== 1. Une visiteuse envoie ses deux réponses : la base pose la date, même si le navigateur en envoie une fausse (attendu : true, false, date du jour)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite, telephone_invite, autorisation_image, accord_whatsapp, consentements_le)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Léa', 'Martin', 'lea-consent@test.fr', '0611223344', true, false, '2000-01-01');
RESET ROLE;
SELECT autorisation_image, accord_whatsapp, consentements_le::date = current_date AS date_du_jour FROM inscriptions WHERE email_invite = 'lea-consent@test.fr';
ROLLBACK;

\echo '== 2. Sans réponse (ancien formulaire, ou saisie par l''équipe), rien n''est daté (attendu : NULL, NULL, NULL)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite, consentements_le)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Zoé', 'Durand', 'zoe-sans@test.fr', '2000-01-01');
RESET ROLE;
SELECT autorisation_image, accord_whatsapp, consentements_le FROM inscriptions WHERE email_invite = 'zoe-sans@test.fr';
ROLLBACK;

\echo '== 3. Un administrateur qui saisit à la main garde ses valeurs (attendu : true, true, la date saisie)'
BEGIN;
INSERT INTO inscriptions (atelier_id, prenom_invite, nom_invite, email_invite, autorisation_image, accord_whatsapp, consentements_le)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'Ana', 'Roy', 'ana-admin@test.fr', true, true, '2026-01-02');
SELECT autorisation_image, accord_whatsapp, consentements_le::date FROM inscriptions WHERE email_invite = 'ana-admin@test.fr';
ROLLBACK;
