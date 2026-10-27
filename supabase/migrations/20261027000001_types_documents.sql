-- Types de documents supplémentaires (Admin → Documents → menu « Type ») : documents internes, documents administratifs
-- et « autres », en plus de magazine, guide et lien externe.
--
-- Aucune politique à modifier : l'accès reste décidé par documents.acces, pas par le type. La contrainte de la table
-- (lien_externe exige un lien) ne vise que 'lien_externe'.

ALTER TYPE public.type_document ADD VALUE IF NOT EXISTS 'interne';
ALTER TYPE public.type_document ADD VALUE IF NOT EXISTS 'administratif';
ALTER TYPE public.type_document ADD VALUE IF NOT EXISTS 'autre';
