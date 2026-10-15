\set ON_ERROR_STOP 0
\set VERBOSITY terse
\echo '== 1. Membre essaie de devenir admin (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
UPDATE utilisateurs SET role='administrateur' WHERE id='11111111-1111-1111-1111-111111111111'; ROLLBACK;
\echo '== 2. Membre modifie son profil (doit réussir)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
UPDATE utilisateurs SET prenom='Marie-Jo', telephone='0601020304', url_avatar='x' WHERE id='11111111-1111-1111-1111-111111111111'; ROLLBACK;
\echo '== 3. Admin change le rôle d un membre (doit réussir)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
UPDATE utilisateurs SET role='inscrit' WHERE id='33333333-3333-3333-3333-333333333333'; ROLLBACK;
\echo '== 4. Visiteur anonyme : pré-inscription forgée confirme/paye/present (doit passer mais être neutralisée)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (id, atelier_id, prenom_invite, nom_invite, email_invite, statut, statut_paiement, present) VALUES ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','A','B','a@b.fr','confirme','paye',true);
RESET ROLE; SELECT statut, statut_paiement, present FROM inscriptions WHERE id='cccccccc-0000-0000-0000-000000000001'; ROLLBACK;
\echo '== 5. Visiteur anonyme : atelier gratuit -> non_requis'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (id, atelier_id, prenom_invite, nom_invite, email_invite, statut, statut_paiement) VALUES ('cccccccc-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000002','A','B','a@b.fr','en_attente','non_requis');
RESET ROLE; SELECT statut_paiement FROM inscriptions WHERE id='cccccccc-0000-0000-0000-000000000002'; ROLLBACK;
\echo '== 6. Anonyme rattache l inscription au compte d un membre (doit échouer)'
BEGIN; SET LOCAL ROLE anon;
INSERT INTO inscriptions (atelier_id, utilisateur_id, statut) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','en_attente'); ROLLBACK;
\echo '== 7. Membre s inscrit pour lui-même (doit réussir)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',true);
INSERT INTO inscriptions (atelier_id, utilisateur_id, statut, statut_paiement) VALUES ('aaaaaaaa-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','en_attente','non_requis'); ROLLBACK;
\echo '== 8. Membre se marque payé (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
UPDATE inscriptions SET statut_paiement='paye' WHERE id='bbbbbbbb-0000-0000-0000-000000000001'; ROLLBACK;
\echo '== 9. Membre annule son inscription (doit réussir, 1 ligne)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
UPDATE inscriptions SET statut='annule', annule_le=now() WHERE id='bbbbbbbb-0000-0000-0000-000000000001'; ROLLBACK;
\echo '== 10. Admin marque payé (doit réussir)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
UPDATE inscriptions SET statut_paiement='paye', present=true WHERE id='bbbbbbbb-0000-0000-0000-000000000001'; ROLLBACK;
\echo '== 11. Membre publie un avis approuvé et mis en avant (doit passer mais être neutralisé)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
INSERT INTO avis (utilisateur_id, inscription_id, note, moderation, mis_en_avant, nom_auteur) VALUES ('11111111-1111-1111-1111-111111111111','bbbbbbbb-0000-0000-0000-000000000002',5,'approuve',true,'Fake');
RESET ROLE; SELECT moderation, mis_en_avant, nom_auteur FROM avis; ROLLBACK;
\echo '== 12. Membre note l inscription d une autre (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
INSERT INTO avis (utilisateur_id, inscription_id, note) VALUES ('11111111-1111-1111-1111-111111111111','bbbbbbbb-0000-0000-0000-000000000003',1); ROLLBACK;
\echo '== 13. Membre note un atelier où il n était pas présent (doit échouer)'
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
INSERT INTO avis (utilisateur_id, inscription_id, note) VALUES ('11111111-1111-1111-1111-111111111111','bbbbbbbb-0000-0000-0000-000000000001',4); ROLLBACK;
\echo '== 14. SQL editor (postgres) : aucune restriction'
BEGIN; UPDATE utilisateurs SET role='administrateur' WHERE id='33333333-3333-3333-3333-333333333333'; ROLLBACK;
