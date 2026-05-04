// =========================================================================
// Migrate Carouge data (team_id = 'ecfc-juniors') from one Supabase
// project to another. Run from your local machine — the service_role
// keys never leave it.
//
// Usage:
//   OLD_URL=https://OLDREF.supabase.co \
//   OLD_SERVICE_KEY=eyJ...service_role... \
//   NEW_URL=https://NEWREF.supabase.co \
//   NEW_SERVICE_KEY=eyJ...service_role... \
//   node scripts/migrate-carouge.mjs
//
// Both schemas are assumed to be the post-bootstrap shape (the SQL in
// docs/sql/03-fresh-project-setup.sql).
//
// What it copies:
//   * ecfc_players, ecfc_sessions, ecfc_attendances, ecfc_match_events,
//     ecfc_player_stints, ecfc_saved_formations, ecfc_saved_teams
//   * Photos from the old 'players/<id>.jpg' path to the new
//     'ecfc-juniors/players/<id>.jpg' path, then rewrites
//     ecfc_players.photo_url accordingly.
// =========================================================================

import { createClient } from '@supabase/supabase-js';

const TEAM_ID = 'ecfc-juniors';
const PHOTO_BUCKET = 'ecfc-photos';
const CHUNK = 200;

const OLD_URL = process.env.OLD_URL;
const OLD_KEY = process.env.OLD_SERVICE_KEY;
const NEW_URL = process.env.NEW_URL;
const NEW_KEY = process.env.NEW_SERVICE_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error(
    'Manque OLD_URL / OLD_SERVICE_KEY / NEW_URL / NEW_SERVICE_KEY.\n' +
      'Exemple :\n' +
      '  OLD_URL=https://oldref.supabase.co OLD_SERVICE_KEY=eyJ... \\\n' +
      '  NEW_URL=https://newref.supabase.co NEW_SERVICE_KEY=eyJ... \\\n' +
      '  node scripts/migrate-carouge.mjs',
  );
  process.exit(1);
}

const oldDb = createClient(OLD_URL, OLD_KEY, {
  auth: { persistSession: false },
});
const newDb = createClient(NEW_URL, NEW_KEY, {
  auth: { persistSession: false },
});

async function fetchAllByTeam(client, table) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .eq('team_id', TEAM_ID)
      .range(from, from + 999);
    if (error) throw new Error(`fetch ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function fetchAttendancesFor(client, sessionIds) {
  const out = [];
  for (let i = 0; i < sessionIds.length; i += 100) {
    const batch = sessionIds.slice(i, i + 100);
    const { data, error } = await client
      .from('ecfc_attendances')
      .select('*')
      .in('session_id', batch);
    if (error) throw new Error(`fetch attendances: ${error.message}`);
    out.push(...data);
  }
  return out;
}

async function upsertChunked(client, table, rows) {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const { error } = await client.from(table).upsert(batch);
    if (error) throw new Error(`upsert ${table}: ${error.message}`);
  }
}

async function migratePhotos(players) {
  let migrated = 0;
  let skipped = 0;
  for (const p of players) {
    if (!p.photo_url) continue;

    const oldPath = `players/${p.id}.jpg`;
    const newPath = `${TEAM_ID}/players/${p.id}.jpg`;

    const { data: blob, error: downErr } = await oldDb.storage
      .from(PHOTO_BUCKET)
      .download(oldPath);
    if (downErr || !blob) {
      console.warn(`  · ${p.name}: photo introuvable côté ancien projet (${downErr?.message ?? 'no data'}) — skip`);
      skipped += 1;
      continue;
    }

    const { error: upErr } = await newDb.storage
      .from(PHOTO_BUCKET)
      .upload(newPath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (upErr) {
      console.warn(`  · ${p.name}: upload échoué (${upErr.message})`);
      skipped += 1;
      continue;
    }

    const { data: pub } = newDb.storage.from(PHOTO_BUCKET).getPublicUrl(newPath);
    const freshUrl = `${pub.publicUrl}?v=${Date.now()}`;

    const { error: rowErr } = await newDb
      .from('ecfc_players')
      .update({ photo_url: freshUrl, updated_at: new Date().toISOString() })
      .eq('id', p.id);
    if (rowErr) {
      console.warn(`  · ${p.name}: maj photo_url échouée (${rowErr.message})`);
      skipped += 1;
      continue;
    }

    migrated += 1;
  }
  console.log(`  · ${migrated} photo(s) migrée(s), ${skipped} ignorée(s).`);
}

async function main() {
  console.log('▶ Lecture côté ancien projet…');
  const players = await fetchAllByTeam(oldDb, 'ecfc_players');
  const sessions = await fetchAllByTeam(oldDb, 'ecfc_sessions');
  const matchEvents = await fetchAllByTeam(oldDb, 'ecfc_match_events');
  const stints = await fetchAllByTeam(oldDb, 'ecfc_player_stints');
  const savedFormations = await fetchAllByTeam(oldDb, 'ecfc_saved_formations');
  const savedTeams = await fetchAllByTeam(oldDb, 'ecfc_saved_teams');
  const sessionIds = sessions.map((s) => s.id);
  const attendances = await fetchAttendancesFor(oldDb, sessionIds);

  console.log(
    `  · ${players.length} joueurs · ${sessions.length} séances · ` +
      `${attendances.length} présences · ${matchEvents.length} évènements · ` +
      `${stints.length} stints · ${savedFormations.length} formations · ` +
      `${savedTeams.length} équipes enregistrées`,
  );

  console.log('▶ Écriture côté nouveau projet (ordre des FK respecté)…');
  await upsertChunked(newDb, 'ecfc_players', players);
  await upsertChunked(newDb, 'ecfc_sessions', sessions);
  await upsertChunked(newDb, 'ecfc_attendances', attendances);
  await upsertChunked(newDb, 'ecfc_match_events', matchEvents);
  await upsertChunked(newDb, 'ecfc_player_stints', stints);
  await upsertChunked(newDb, 'ecfc_saved_formations', savedFormations);
  await upsertChunked(newDb, 'ecfc_saved_teams', savedTeams);
  console.log('  · tables migrées.');

  console.log('▶ Migration des photos…');
  await migratePhotos(players);

  console.log('\n✓ Terminé. Ouvre l\'app, crée un compte, et claim CAROUGE-FUSTIER-2026.');
}

main().catch((err) => {
  console.error('\n✗ Erreur:', err.message ?? err);
  process.exit(1);
});
