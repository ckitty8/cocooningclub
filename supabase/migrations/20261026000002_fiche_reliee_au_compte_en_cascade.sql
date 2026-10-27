-- Relier une fiche à son compte de connexion sans casser ce qui la référence.
--
-- Une fiche créée « sans connexion » (Membres, ou « Ajouter une adhésion » → Nouvelle personne) a un identifiant
-- tiré au hasard. Quand la connexion est activée, le déclencheur link_utilisateur_to_auth() (sur auth.users)
-- remplace cet identifiant par celui du compte de connexion. Or les clés étrangères vers utilisateurs(id)
-- n'avaient pas ON UPDATE CASCADE : dès que la fiche avait une adhésion (ou une inscription, un avis…),
-- le remplacement était refusé et la création du compte de connexion échouait.
--
-- Correctif : toutes les clés étrangères vers public.utilisateurs(id) suivent maintenant le changement d'identifiant.
-- Les règles de suppression (CASCADE / SET NULL) restent celles d'origine.

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conrelid::regclass AS table_ref, conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint
     WHERE confrelid = 'public.utilisateurs'::regclass
       AND contype = 'f'
       AND confupdtype = 'a'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.table_ref, c.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s ON UPDATE CASCADE', c.table_ref, c.conname, c.def);
  END LOOP;
END;
$$;
