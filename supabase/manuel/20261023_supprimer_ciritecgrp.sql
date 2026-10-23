-- À LANCER À LA MAIN (SQL Editor Supabase), après la migration
-- 20261023000002_supprime_membre_et_compte.sql. Ce n'est PAS une migration.
-- Supprime définitivement le compte ciritecgrp@gmail.com (irréversible).

-- 1. Avant : ce qui existe (doit montrer une ligne auth.users, aucune utilisateurs).
select 'auth.users' as source, id, email from auth.users where email = 'ciritecgrp@gmail.com'
union all
select 'utilisateurs', id, email from public.utilisateurs where email = 'ciritecgrp@gmail.com';

-- 2. Suppression du compte de connexion (les identités et sessions partent en cascade)
--    et de toute fiche éventuelle.
delete from public.utilisateurs where id = '50cdffe5-39f5-4360-97a5-0bbe1cb480a0';
delete from auth.users          where id = '50cdffe5-39f5-4360-97a5-0bbe1cb480a0'
                                   and email = 'ciritecgrp@gmail.com';

-- 3. Après : doit renvoyer 0 ligne partout.
select 'auth.users' as source, count(*) from auth.users where email = 'ciritecgrp@gmail.com'
union all
select 'auth.identities', count(*) from auth.identities where email = 'ciritecgrp@gmail.com'
union all
select 'utilisateurs', count(*) from public.utilisateurs where email = 'ciritecgrp@gmail.com';
