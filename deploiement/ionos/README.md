# Remettre le site en ligne sur IONOS

Le site est d'ordinaire publié par **Vercel** (chaque envoi sur `main` le met en ligne tout seul) ;
le domaine `lecocooningclub.fr` est seulement **géré** chez IONOS (DNS). Ce dossier sert le jour où le site
doit être hébergé directement sur l'espace web IONOS (hébergement Apache).

## 1. Préparer la version (sur un ordinateur, une fois)

1. Créer à la racine du projet un fichier `.env.production.local` (il n'est jamais envoyé sur GitHub) :
   ```
   VITE_SUPABASE_PUBLISHABLE_KEY=la-clé-publishable
   ```
   La clé se copie dans Vercel (Settings → Environment Variables) ou dans Supabase
   (Project Settings → API Keys, clé « publishable »). L'adresse Supabase du club est déjà connue.
2. Lancer :
   ```
   npm ci
   npm run build:ionos
   ```
3. Le script contrôle tout (clé présente, Google Analytics `G-X361LVXTDW` présent, aucune balise Google en dur
   dans les pages) et crée `ionos/cocooningclub-ionos-AAAA-MM-JJ.zip`.

## 2. Déposer sur IONOS

1. IONOS → **Hébergement** → **Webspace** (gestionnaire de fichiers) ou un logiciel SFTP (identifiants SFTP dans
   IONOS → Hébergement → SFTP & SSH).
2. Dans le dossier vers lequel pointe le domaine (IONOS → Domaines → `lecocooningclub.fr` → « Utilisation » →
   dossier cible), **vider l'ancienne version** puis décompresser l'archive : `index.html`, `.htaccess`, `assets/`,
   `calendrier/`… doivent être **directement** dans ce dossier (pas dans un sous-dossier `dist`).
   Le fichier `.htaccess` commence par un point : il peut être masqué, vérifier qu'il est bien là.
3. IONOS → Domaines → **SSL** : le certificat doit être actif (le `.htaccess` force le HTTPS).
4. Domaine nu / www : l'adresse principale est `https://www.lecocooningclub.fr`. Si IONOS ne redirige pas déjà
   `lecocooningclub.fr` vers `www`, décommenter les deux lignes « Domaine nu -> www » du `.htaccess`
   (jamais si IONOS redirige `www` vers le domaine nu : boucle de redirections).

## 3. Basculer le domaine

Tant que les DNS du domaine pointent vers Vercel, c'est Vercel qui répond. Pour servir la version IONOS :
IONOS → Domaines → DNS → remplacer les enregistrements A / CNAME de Vercel par ceux de l'hébergement IONOS
(**ne pas supprimer** l'enregistrement TXT de validation Google Search Console). La propagation prend de quelques
minutes à quelques heures.

## 4. Vérifier après la mise en ligne

- `https://www.lecocooningclub.fr/calendrier` affiche le calendrier (pas une erreur 404) ;
- un lien direct comme `/espace-membre` ou `/inscription/<id>` s'ouvre ;
- bannière cookies : rien n'est envoyé à Google avant « Tout accepter » ; après acceptation, Google Analytics
  (Rapports → Temps réel) voit la visite ; « Gérer mes cookies » (pied de page) → « Tout refuser » coupe la mesure ;
- Supabase → Authentication → URL Configuration : `https://www.lecocooningclub.fr/**` dans les Redirect URLs.

## Ce que fait le `.htaccess`

Équivalent de `vercel.json` (un test vérifie que les en-têtes restent identiques) : HTTPS obligatoire, en-têtes de
sécurité (HSTS, CSP en mode rapport, etc.), pages pré-générées servies avec leur propre titre (référencement),
toutes les autres adresses renvoyées vers l'application, cache long des fichiers `assets/`, `noindex` sur
l'administration et l'espace membre, compression.
