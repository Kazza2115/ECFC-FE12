import { kv } from './kv';
import { getActiveTeamId } from './supabase';
import type {
  Attendance,
  MatchEvent,
  Player,
  PlayerStint,
  SavedFormation,
  SavedTeam,
  Session,
} from '@/types';

// Local cache keys are namespaced per team so two coaches sharing a
// browser (or two apps deployed on the same origin) don't ever see
// each other's data.
const APP_NS = 'coachhub';

function k(scope: string): string {
  return `${APP_NS}:${getActiveTeamId()}:${scope}`;
}

const SCOPES = {
  players: 'players',
  sessions: 'sessions',
  attendances: 'attendances',
  matchEvents: 'matchEvents',
  stints: 'stints',
  savedFormations: 'savedFormations',
  savedTeams: 'savedTeams',
  seeded: 'seeded',
};

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await kv.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON<T>(key: string, value: T): Promise<void> {
  await kv.setItem(key, JSON.stringify(value));
}

export const db = {
  async getPlayers(): Promise<Player[]> {
    return readJSON<Player[]>(k(SCOPES.players), []);
  },
  async savePlayers(players: Player[]): Promise<void> {
    await writeJSON(k(SCOPES.players), players);
  },
  async getSessions(): Promise<Session[]> {
    return readJSON<Session[]>(k(SCOPES.sessions), []);
  },
  async saveSessions(sessions: Session[]): Promise<void> {
    await writeJSON(k(SCOPES.sessions), sessions);
  },
  async getAttendances(): Promise<Attendance[]> {
    return readJSON<Attendance[]>(k(SCOPES.attendances), []);
  },
  async saveAttendances(attendances: Attendance[]): Promise<void> {
    await writeJSON(k(SCOPES.attendances), attendances);
  },
  async getMatchEvents(): Promise<MatchEvent[]> {
    return readJSON<MatchEvent[]>(k(SCOPES.matchEvents), []);
  },
  async saveMatchEvents(events: MatchEvent[]): Promise<void> {
    await writeJSON(k(SCOPES.matchEvents), events);
  },
  async getStints(): Promise<PlayerStint[]> {
    return readJSON<PlayerStint[]>(k(SCOPES.stints), []);
  },
  async saveStints(stints: PlayerStint[]): Promise<void> {
    await writeJSON(k(SCOPES.stints), stints);
  },
  async getSavedFormations(): Promise<SavedFormation[]> {
    return readJSON<SavedFormation[]>(k(SCOPES.savedFormations), []);
  },
  async saveSavedFormations(items: SavedFormation[]): Promise<void> {
    await writeJSON(k(SCOPES.savedFormations), items);
  },
  async getSavedTeams(): Promise<SavedTeam[]> {
    return readJSON<SavedTeam[]>(k(SCOPES.savedTeams), []);
  },
  async saveSavedTeams(items: SavedTeam[]): Promise<void> {
    await writeJSON(k(SCOPES.savedTeams), items);
  },
  async wasSeeded(): Promise<boolean> {
    const v = await kv.getItem(k(SCOPES.seeded));
    return v === '1';
  },
  async markSeeded(): Promise<void> {
    await kv.setItem(k(SCOPES.seeded), '1');
  },
  async resetAll(): Promise<void> {
    await kv.multiRemove([
      k(SCOPES.players),
      k(SCOPES.sessions),
      k(SCOPES.attendances),
      k(SCOPES.matchEvents),
      k(SCOPES.stints),
      k(SCOPES.savedFormations),
      k(SCOPES.savedTeams),
      k(SCOPES.seeded),
    ]);
  },
};
