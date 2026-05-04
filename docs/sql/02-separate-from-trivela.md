# Séparer complètement Coach Hub de Trivela

Tu nous a signalé deux symptômes :

1. *« Mon compte existe déjà »* à la création de compte sur Coach Hub.
2. *« Quand je me connecte ça tourne en boucle »* à la connexion.

Les deux viennent du même fait : **Trivela et Coach Hub utilisent le même
projet Supabase.** Du coup ils partagent :

* La table `auth.users` → un email = un seul compte, peu importe l'app.
* Les tables `ecfc_*` → tout le monde lit / écrit au même endroit.
* La table `ecfc_coach_profiles` → un seul profil par utilisateur, donc
  rattacher le même compte à deux équipes différentes est impossible.

Tu as **deux options** pour les rendre indépendants. Je recommande la
première.

---

## Option A — Un projet Supabase dédié à Coach Hub (propre)

C'est la solution recommandée : 100 % d'isolation, pas de partage
d'auth ni de données. Trivela continue de tourner sur son projet, Coach
Hub reçoit le sien.

### 1. Créer un nouveau projet Supabase

1. Va sur [supabase.com/dashboard](https://supabase.com/dashboard) →
   **New project**.
2. Nomme-le par exemple `coach-hub` ou `ecfc-coach-hub`.
3. Récupère :
   * `Project URL`  → ex. `https://abc123.supabase.co`
   * `anon` API key → la clé publique du nouveau projet.
4. Active le provider **Email** dans
   *Authentication → Providers*.
5. (Optionnel) Désactive *Confirm email* le temps de la phase pilote
   pour éviter d'avoir à valider chaque inscription.

### 2. Lancer le schéma sur ce nouveau projet

Dans le SQL editor du **nouveau** projet, exécute dans cet ordre :

* le SQL d'origine de la base (création des tables `ecfc_*` — celui que
  tu avais déjà collé pour Carouge la première fois) ;
* puis `docs/sql/01-multi-tenant-auth.sql` (auth + RLS + claim code).

### 3. Mettre à jour `src/storage/supabase.ts`

```ts
const SUPABASE_URL = 'https://NOUVEAU-PROJET.supabase.co';
const SUPABASE_ANON_KEY = 'NOUVELLE_ANON_KEY';
```

et redéploie.

### 4. (Optionnel) Récupérer les données existantes de Carouge

Si tu veux conserver les joueurs / matchs déjà saisis, exporte-les
depuis l'ancien projet (`pg_dump` ou export CSV par table) et
ré-importe-les dans le nouveau projet en gardant les mêmes
`team_id = 'ecfc-juniors'`. Julien peut alors rejoindre via le claim
code.

---

## Option B — Garder un seul Supabase, isoler par préfixe de table

Si tu préfères ne pas créer un deuxième projet, on peut simplement
préfixer les tables de Coach Hub différemment. Trivela continue avec
`ecfc_*`, Coach Hub passe sur `chub_*`. L'auth reste partagée (même
email = même compte), mais les **données** sont isolées.

À faire si tu choisis cette voie :

1. Renomme les tables de Coach Hub côté SQL :

   ```sql
   ALTER TABLE ecfc_players          RENAME TO chub_players;
   ALTER TABLE ecfc_sessions         RENAME TO chub_sessions;
   ALTER TABLE ecfc_attendances      RENAME TO chub_attendances;
   ALTER TABLE ecfc_match_events     RENAME TO chub_match_events;
   ALTER TABLE ecfc_player_stints    RENAME TO chub_player_stints;
   ALTER TABLE ecfc_saved_formations RENAME TO chub_saved_formations;
   ALTER TABLE ecfc_saved_teams      RENAME TO chub_saved_teams;
   ALTER TABLE ecfc_teams            RENAME TO chub_teams;
   ALTER TABLE ecfc_coach_profiles   RENAME TO chub_coach_profiles;
   ```

2. Mets à jour les politiques RLS (le contenu de
   `01-multi-tenant-auth.sql`) en remplaçant `ecfc_` par `chub_`.

3. Dis-le-moi : je remplace les noms `ecfc_*` par `chub_*` dans
   `src/storage/remote.ts` et l'abonnement realtime de
   `DataContext.tsx`.

⚠️ Inconvénient : l'auth reste partagée. Si tu créés un compte sur
Trivela, tu utilises **le même email + même mot de passe** pour Coach
Hub, mais sur Coach Hub ton profil pointera vers `chub_coach_profiles`
qui est vide → tu refais l'onboarding (claim ou create). C'est gérable
mais il faut le savoir.

---

## En attendant que tu choisisses

Côté code j'ai déjà mis trois garde-fous :

* `setActiveTeamId` est appelé synchronement avant que `DataProvider` ne
  monte → plus de fuite vers la team_id de fallback.
* Les clés du cache local sont préfixées `coachhub:<teamId>:…` → les
  caches navigateur de Trivela et Coach Hub ne se mélangent pas.
* L'écran de chargement affiche un bouton **« Forcer la déconnexion »**
  après 4 secondes pour pouvoir sortir d'un état coincé.
* Les messages d'erreur Supabase sont traduits en français pour que tu
  voies tout de suite la cause (compte déjà existant, mauvais mot de
  passe, email non confirmé…).

Dis-moi quelle option tu préfères et je termine la migration.
