---
name: revue-qualite
description: Revue qualité complète du site Le Cocooning Club (React + TypeScript + Supabase) — code review, cohérence technique et fonctionnelle, tests unitaires, de bout en bout et de non-régression, audit de la base Supabase, code mort, doublons, cohérence pages ↔ liens, puis rapport avec corrections et suggestions. À lancer après une série d'évolutions, ou quand l'utilisatrice demande « revue », « audit », « nettoyage », « contrôle qualité ».
---

# Revue qualité du Cocooning Club

Les règles de `CLAUDE.md` s'appliquent pendant toute la revue. En particulier :
- **jamais de SQL appliqué en production** sans l'accord explicite de l'utilisatrice (la preview Vercel et la prod partagent la même base Supabase) : l'audit de la base est en **lecture seule**, les corrections SQL sont **proposées** dans une migration, pas exécutées ;
- tout changement de base ou de parcours met à jour `supabase/migration-totale/` dans le même commit ;
- rien n'est poussé sur `main` ; terminer par les deux phrases de `CLAUDE.md` avec le vrai hash.

Déroulé : 0 → 8 dans l'ordre. On **corrige** ce qui relève du code et de la documentation, on **propose** ce qui touche à la base, et on **suggère** le reste (sans l'appliquer).

## 0. État de départ (référence de non-régression)

```bash
git status --short            # idéalement vide ; sinon noter ce qui est déjà modifié
npx tsc -p tsconfig.app.json --noEmit
npm run lint
npm test
CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run test:e2e   # CHROMIUM_PATH si besoin
```

Noter le nombre de tests (unitaires, e2e passés / ignorés). **Ce sont les valeurs de référence** :
après chaque correction, on doit retrouver au moins les mêmes résultats. Si l'état de départ est déjà
rouge, le dire dans le rapport et corriger d'abord.

## 1. Contrôle automatique du code

```bash
npm run audit:code            # = node scripts/audit-code.mjs  (option --json)
```

| Contrôle | Gravité | Règle |
|---|---|---|
| Lien vers une page inexistante | erreur | `to=`, `href`, `navigate()`, `<Navigate>` doivent correspondre à une `<Route>` de `App.tsx` |
| Export jamais utilisé | erreur | code mort : supprimer (vérifier d'abord avec `grep -rn "<nom>" src/ e2e/`) |
| Fichier jamais importé | erreur | code mort : supprimer le fichier |
| `console.log`, `debugger`, `TODO`, `FIXME` | erreur | restes de mise au point |
| Page jamais liée | avertissement | à juger : atelier caché voulu, ou lien oublié |
| Doublon (ligne ≥ 90 caractères à 2 endroits) | avertissement | factoriser si la logique est vraiment la même (formatage de date, état d'un formulaire, requête identique) ; laisser si c'est un hasard de gabarit |
| Fichier > 700 lignes | avertissement | proposer un découpage (composants, hooks, `src/lib/`) |

Ne jamais construire un nom de route ou de fonction par concaténation : le contrôle ne le verrait pas.
Pour chaque **doublon**, regarder si une fonction partagée existe déjà dans `src/lib/` ou `src/utils/` (ex. formats de dates,
`droits.ts`, `roles.ts`, `placesAtelier.ts`) avant d'en créer une nouvelle.

## 2. Code review

Relire **tous les fichiers modifiés depuis la dernière revue** (`git log --stat <dernier tag ou commit de revue>..HEAD`),
puis survoler le reste. Pour chacun, chercher :

**Correction**
- gestion d'erreur : un `supabase.from(...)` dont l'`error` est ignoré, un `await` oublié, un `setState` après démontage ;
- cas limites : liste vide, valeur `null`, date absente, rôle simulé, migration non appliquée (les écrans `/admin/offre`, `Mon adhésion`, droits par offre doivent se masquer proprement) ;
- sécurité : jamais de décision de droit uniquement côté navigateur (la RLS et les déclencheurs SQL font foi) ; pas de secret en dur ; entrées utilisateur jamais injectées dans du HTML ou du SQL ;
- accessibilité de base : `aria-label` sur les boutons-icônes, `label` associé aux champs, ordre de tabulation, contraste.

**Lisibilité**
- noms en français cohérents avec les tables SQL ; pas d'abréviation obscure ;
- un commentaire pour les règles métier (formule, seuil, source) ; pas de commentaire qui répète le code ;
- composants courts : un fichier de page qui dépasse ~500 lignes doit être découpé ; la logique pure va dans `src/lib/` (testable) ;
- pas de code commenté laissé « au cas où », pas d'import ni de paramètre inutilisé.

**Cohérence avec les conventions du projet** : `src/lib/roles.ts` source unique des rôles et des accès, `src/lib/droits.ts` source
unique des droits d'atelier, composants communs de `src/components/vitrine.tsx`, thème crème (`.theme-creme`) et titres `font-brand`.

## 3. Cohérence technique et fonctionnelle

**Technique**
- `tsc` à 0 erreur, `npm run lint` à 0 avertissement (`noUnusedLocals` / `noUnusedParameters` actifs) ;
- `package-lock.json` et `bun.lock` synchronisés (`bun add/remove …` puis `npm install --package-lock-only`) ;
- `npm run migration:verifier` : le paquet de migration totale est à jour ; toute migration de `supabase/migrations/` postérieure à `derniereMigrationAppliqueeEnProd` figure dans `manifeste.json` ;
- `src/integrations/supabase/types.ts` contient les colonnes et fonctions que le code utilise (sinon `as unknown as` à justifier ou à retirer après migration).

**Règles à un seul endroit** (chercher les copies dans `src/pages/` et `src/components/`) :
- droits d'atelier : `src/lib/droits.ts` **et** `public.atelier_inclus` doivent donner les mêmes résultats (vérifier avec les scénarios `supabase/tests/droits_par_offre.test.sql`) ;
- rôles et accès : `src/lib/roles.ts` ↔ policies RLS ↔ `RoleGuard` de `App.tsx` ↔ menus de `AdminLayout` / espace membre ;
- places : `src/lib/placesAtelier.ts` ↔ trigger SQL des places ;
- paiement : blocage des validations impayées côté page Pré-inscriptions **et** déclencheur SQL ;
- libellés : une même notion porte le même nom partout (menu, titre, boutons, e-mails, CGU).

**Fonctionnel** : rejouer la `supabase/migration-totale/checklist-fonctionnelle.md` pour tout ce qui a changé depuis la dernière revue
(simulateur du créateur pour tester chaque profil : Inscrit, Membre, Adhérente Business / Créatif / Complet, Administrateur).

## 4. Tests

- **Unitaires** (`npm test`) : toute logique pure nouvelle ou corrigée a son test (`src/lib/*.test.ts`) ; cas limites inclus.
- **Bout en bout** (`npm run test:e2e`, Playwright avec Supabase simulé `e2e/supabaseMock.ts`) : un parcours par fonctionnalité visible
  (public, membre, inscrit, admin, créateur) ; desktop **et** mobile quand la mise en page change ; pas de `waitForTimeout` arbitraire ;
  sélecteurs par rôle / libellé plutôt que par classe CSS.
- **SQL** (`supabase/tests/README.md`) : chaque migration a son scénario sur une base jetable, y compris le cas « refusé » ;
  rejouer : application, 2ᵉ application (idempotence), retour arrière, réapplication.
- **Lacunes** : lister les fichiers de `src/lib/`, `src/hooks/`, `src/pages/` sans test ni parcours e2e et les mettre dans les suggestions.

### Non-régression

1. Comparer aux valeurs de référence de l'étape 0 : mêmes tests passés, aucun test supprimé ou affaibli pour « faire passer ».
2. Un nettoyage ne doit **rien** changer à l'écran : capturer avant / après les pages clés (accueil, calendrier, espace membre,
   admin Ateliers, Pré-inscriptions, Offre) avec Playwright et le faux Supabase, à 360 px et 1280 px, puis comparer ; toute différence est
   expliquée ou corrigée.
3. Aucun test e2e ne dépend d'une base réelle ni de la date du jour sans l'avoir figée.

## 5. Audit de la base Supabase (lecture seule)

Exécuter `supabase/audit/verifier-bdd.sql` sur le projet `rakqbuxgzuwrnjangqcy` (outil `execute_sql`, ou SQL Editor). Chaque
ligne renvoyée est un écart (`erreur` / `avertissement`) :
- structure et sécurité : table sans RLS ou sans politique, sans clé primaire, droit d'écriture au rôle `anon`, fonction `SECURITY DEFINER`
  sans `search_path`, vue sans `security_invoker`, clé étrangère sans index ;
- données : inscription confirmée au paiement en attente, places incohérentes, atelier sans espace ou sans tarif, doublon d'e-mail,
  compte sans fiche (et inversement), membre sans adhésion en cours, adhésion échue toujours active, consentement photo sans date, rôle interdit ;
- **migrations ↔ base** (requêtes en commentaire en bas du fichier) : tout objet de la base est créé par un fichier de
  `supabase/migrations/`, et réciproquement ; sinon la base n'est plus reconstructible ;
- **fonctions jamais appelées** : pour chaque fonction de `public`, chercher `rpc("<nom>"` dans `src/` ; sinon code mort.

Si la connexion à Supabase échoue, le dire dans le rapport (ne pas conclure « tout est bon ») et fournir le fichier SQL à coller.
**Corrections** : préparer `supabase/migrations/AAAAMMJJNNNNNN_<objet>.sql` commenté, l'ajouter au paquet (`manifeste.json`,
`npm run migration:build`, vérifications, retour arrière, checklist), le **montrer**, et attendre le « ok » de l'utilisatrice. Jamais d'`apply_migration` ni d'écriture en prod sans cet accord.

## 6. Pages et liens

- `npm run audit:code` couvre les liens statiques ; compléter à la main pour les liens construits (``to={`/admin/ateliers/${id}`}``, paramètres `?atelier=`, `?modifier=`) : la page cible lit bien le paramètre.
- Chaque entrée de menu (admin, espace membre, espace créateur, en-tête public, pied de page) mène à une page qui existe, avec les bons droits ;
  chaque page protégée est atteignable par au moins un lien pour les rôles autorisés (`ACCES` de `roles.ts`).
- Les pages interdites redirigent proprement (inscrit → pas d'espace membre, membre → pas d'admin) ; la matrice des rôles (`/admin/createur/matrice`) reflète la réalité.
- Parcours croisés : bouton « Inscrits » d'un atelier → Pré-inscriptions filtrée ; fiche atelier → Modifier ; Mon adhésion ; liens des e-mails et du calendrier partagé.
- Même notion = même nom ; titres `<title>` (`RouteSeo`), `sitemap.xml` et `robots.txt` en phase avec les routes publiques.

## 7. Corrections

Appliquer, dans cet ordre, **par petits commits** (un thème par commit, tests passés à chaque fois) :
1. code mort et restes de mise au point (suppression pure) ;
2. liens cassés et incohérences de libellés ;
3. doublons factorisés (avec test de la fonction extraite) ;
4. correctifs de la code review (bugs, erreurs ignorées, cas limites) ;
5. documentation : `CLAUDE.md` (décisions, points en attente), `supabase/tests/README.md`, `supabase/migration-totale/`.

Ne corriger **pas** dans la foulée : une refonte, une nouvelle fonctionnalité, un changement de règle métier — les mettre dans les suggestions.
Après chaque lot : `tsc`, `lint`, `npm test`, `npm run test:e2e`, `npm run migration:verifier`.

## 8. Rapport

Écrire `docs/revue-qualite/AAAA-MM-JJ.md` (en français) et en donner le résumé à l'utilisatrice :

1. **Résumé** : verdict en 3 lignes, état de départ vs état d'arrivée (tests, erreurs, avertissements).
2. **Tableau des contrôles** : contrôle · résultat · corrigé / à valider / à juger.
3. **Corrigé** : liste des corrections avec le commit.
4. **À valider par l'utilisatrice** : tout ce qui touche à la base (migration proposée, jamais appliquée) ou à une règle métier.
5. **Suggestions** : améliorations hors périmètre, classées par valeur / effort (découpages, tests manquants, performances, accessibilité, sécurité).
6. **Risques restants** et **ce qui n'a pas pu être vérifié** (ex. base inaccessible, Chromium absent).

Pour qu'elle puisse le relire facilement, publier aussi le rapport en page web (Artifact) si l'utilisatrice le souhaite.

Terminer par : « C'est la branche de la preview Vercel : le dernier commit dessus est `<hash>`. Rien n'a été poussé sur `main`. »

## Ajouter une vérification

Un nouveau contrôle s'ajoute **dans le script** (`scripts/audit-code.mjs` ou `supabase/audit/verifier-bdd.sql`), avec un commentaire qui
dit pourquoi, plutôt que dans cette liste : un contrôle automatique ne s'oublie pas.
