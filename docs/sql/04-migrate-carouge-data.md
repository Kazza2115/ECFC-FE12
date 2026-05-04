# Migrer les données Carouge vers le nouveau projet Supabase

Le nouveau projet (`qrkhlohmycrjlscsqpps`) est vierge. On va y copier tout
ce qui se trouve dans l'ancien projet (`tivcwtzzhrsdfzxirjkw`) sous le
`team_id = 'ecfc-juniors'` :

* joueurs, photos
* séances, présences
* évènements de match, stints, équipes / formations enregistrées

L'opération est faite par le script `scripts/migrate-carouge.mjs`. Il
tourne **en local** sur ta machine — les `service_role` keys ne sortent
pas de chez toi.

## 1. Récupérer les `service_role` keys des deux projets

Pour **chacun** des deux projets :

1. Dashboard Supabase → ton projet → **Settings** (⚙️) → **API**
2. Section **Project API keys** → ligne `service_role` (clé `secret`).
3. Clique l'œil pour la révéler, copie-la.

⚠️ Cette clé contourne RLS, **ne la commit pas, ne la partage pas**.
On l'utilise une fois en local puis on l'oublie.

## 2. Lance le script

Depuis le dossier du projet :

```bash
OLD_URL='https://tivcwtzzhrsdfzxirjkw.supabase.co' \
OLD_SERVICE_KEY='eyJ...service_role...ANCIEN' \
NEW_URL='https://qrkhlohmycrjlscsqpps.supabase.co' \
NEW_SERVICE_KEY='eyJ...service_role...NOUVEAU' \
node scripts/migrate-carouge.mjs
```

Tu devrais voir quelque chose comme :

```
▶ Lecture côté ancien projet…
  · 14 joueurs · 23 séances · 312 présences · 28 évènements · 45 stints · 2 formations · 3 équipes enregistrées
▶ Écriture côté nouveau projet (ordre des FK respecté)…
  · tables migrées.
▶ Migration des photos…
  · 9 photo(s) migrée(s), 5 ignorée(s).
✓ Terminé. Ouvre l'app, crée un compte, et claim CAROUGE-FUSTIER-2026.
```

## 3. Vérifier

Dans le nouveau projet, **Table Editor** :

* `ecfc_players` → ton effectif Carouge.
* `ecfc_sessions` → toutes les séances et matchs.
* `ecfc_attendances` → les statuts par séance.
* `ecfc_match_events`, `ecfc_player_stints` → events / temps de jeu.

Puis dans l'app : créer un compte, choisir « J'ai un code », saisir
`CAROUGE-FUSTIER-2026`. Le dashboard doit afficher tes données.

## 4. Quand tout est OK

Quand tu confirmes que la migration a bien eu lieu et que l'app
fonctionne sur le nouveau projet, tu peux :

* Soit garder l'ancien projet en backup (pas grave, il consomme peu).
* Soit le supprimer depuis le dashboard Supabase (Settings → General →
  Delete project) une fois sûr de ton coup.

## Re-run safely

Le script utilise `upsert` partout : tu peux le relancer plusieurs fois
sans dupliquer. Si une partie a échoué (réseau, photo cassée), relance
simplement la commande.
