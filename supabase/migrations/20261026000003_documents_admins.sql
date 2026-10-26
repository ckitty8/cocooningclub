-- Documents réservés aux administrateurs (bulletin d'adhésion vierge, trames internes…).
--
-- Nouvelle valeur « admins » pour documents.acces. Aucune politique à modifier : les politiques de lecture des
-- membres (acces IN ('tous', 'membres')) et du public (acces = 'tous') l'excluent d'elles-mêmes, la politique
-- administrateur voit tout, et la lecture du fichier dans le bucket privé exige de pouvoir lire la ligne documents
-- (20260420000002) : un membre ne peut donc ni lister ni télécharger un document « admins ».

ALTER TYPE public.acces_document ADD VALUE IF NOT EXISTS 'admins';
