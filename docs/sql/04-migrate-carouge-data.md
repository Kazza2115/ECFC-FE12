# Migrer les données Carouge vers le nouveau projet Supabase

Le nouveau projet (`qrkhlohmycrjlscsqpps`) est vierge. On va y copier
tout ce qui se trouve dans l'ancien projet (`tivcwtzzhrsdfzxirjkw`)
sous le `team_id = 'ecfc-juniors'` :

* joueurs (+ photos)
* séances, présences
* évènements de match, stints
* équipes / formations enregistrées

L'opération est faite par le workflow GitHub Actions
**Migrate Carouge data** qui exécute le script
`scripts/migrate-carouge.mjs` sur un runner Ubuntu. Tu n'as **rien à
installer** sur ta machine, tout se passe dans GitHub.

## Étape 0 — Pré-requis sur le nouveau projet

Avant de lancer la migration, le nouveau projet doit avoir le bon
schéma. Si pas encore fait :

1. Dashboard Supabase → projet `qrkhlohmycrjlscsqpps` → **SQL Editor**
2. Colle tout le contenu de `docs/sql/03-fresh-project-setup.sql`
3. **Run** — tu dois voir « Success »

Vérifie aussi : Authentication → Providers → **Email** activé,
*Confirm email* décoché (recommandé pendant le pilote).

## Étape 1 — Récupérer les `service_role` des deux projets

Pour **chacun** des deux projets dans le dashboard Supabase :

1. Settings ⚙️ → **API**
2. Section **Project API keys** → ligne `service_role` (badge orange
   `secret`)
3. Clic 👁 pour révéler, copie la clé.

⚠️ Cette clé contourne RLS. Tu vas la stocker quelques minutes dans
les secrets GitHub puis la supprimer aussitôt la migration finie.

## Étape 2 — Ajouter les 4 secrets dans GitHub

Sur GitHub :

1. Repo **kazza2115/ecfc-fe12** → onglet **Settings**
2. **Secrets and variables** → **Actions** → bouton **New repository
   secret**
3. Crée ces quatre secrets, un par un :

   | Nom du secret      | Valeur                                                |
   |--------------------|-------------------------------------------------------|
   | `OLD_URL`          | `https://tivcwtzzhrsdfzxirjkw.supabase.co`            |
   | `OLD_SERVICE_KEY`  | la clé service_role de l'**ancien** projet            |
   | `NEW_URL`          | `https://qrkhlohmycrjlscsqpps.supabase.co`            |
   | `NEW_SERVICE_KEY`  | la clé service_role du **nouveau** projet             |

   Les secrets sont chiffrés. GitHub ne te les ré-affichera plus après
   création — c'est normal.

## Étape 3 — Lancer la migration

1. GitHub repo → onglet **Actions**
2. Liste de gauche → **Migrate Carouge data**
3. Bouton **Run workflow** (en haut à droite) → confirme **Run
   workflow** sur la branche `claude/football-attendance-app-u9wTy`
   (ou `main` si tu as mergé)
4. Au bout de quelques secondes, un job apparaît. Clic dessus →
   **migrate** → tu vois les logs en direct, par exemple :

   ```
   ▶ Lecture côté ancien projet…
     · 14 joueurs · 23 séances · 312 présences · 28 évènements ·
       45 stints · 2 formations · 3 équipes enregistrées
   ▶ Écriture côté nouveau projet (ordre des FK respecté)…
     · tables migrées.
   ▶ Migration des photos…
     · 9 photo(s) migrée(s), 5 ignorée(s).
   ✓ Terminé. Ouvre l'app, crée un compte, et claim CAROUGE-FUSTIER-2026.
   ```

5. Si la step **Run migration** est verte, c'est gagné.

## Étape 4 — Vérifier dans Supabase

Sur le nouveau projet, **Table Editor** :

* `ecfc_players` → ton effectif Carouge.
* `ecfc_sessions` → toutes les séances et matchs.
* `ecfc_attendances` → les statuts par séance.
* `ecfc_match_events`, `ecfc_player_stints` → events / temps de jeu.

Puis dans l'app : crée un compte → choisis **« J'ai un code »** →
saisis `CAROUGE-FUSTIER-2026`. Le dashboard doit afficher ton
historique.

## Étape 5 — Hygiène : supprimer les secrets

Une fois la migration validée :

1. GitHub repo → Settings → Secrets and variables → Actions
2. Supprime un par un : `OLD_URL`, `OLD_SERVICE_KEY`, `NEW_URL`,
   `NEW_SERVICE_KEY`. (Ils ne servent qu'à cette migration.)
3. Sur Supabase, dans le **nouveau** projet, tu peux **rotater à
   nouveau** la `service_role` (Settings → API → JWT Settings ou API
   Keys → revoke / regenerate) par hygiène — ça invalide tout secret
   qui aurait pu fuiter.
4. L'ancien projet (`tivcwtzz...`), tu peux le **supprimer** quand
   tu es 100 % sûr (Settings → General → Delete project), ou le
   laisser dormir sans frais.

## Re-run safely

Le script utilise `upsert` partout. Si la migration plante au milieu
(réseau, photo cassée, etc.), tu peux **relancer le workflow**, ça ne
crée pas de doublons.
