import { kv } from './kv';
import type {
  Attendance,
  MatchEvent,
  Player,
  PlayerStint,
  SavedFormation,
  Session,
} from '@/types';

const KEYS = {
  players: 'ecfc:players',
  sessions: 'ecfc:sessions',
  attendances: 'ecfc:attendances',
  matchEvents: 'ecfc:matchEvents',
  stints: 'ecfc:stints',
  savedFormations: 'ecfc:savedFormations',
  seeded: 'ecfc:seeded',
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
    return readJSON<Player[]>(KEYS.players, []);
  },
  async savePlayers(players: Player[]): Promise<void> {
    await writeJSON(KEYS.players, players);
  },
  async getSessions(): Promise<Session[]> {
    return readJSON<Session[]>(KEYS.sessions, []);
  },
  async saveSessions(sessions: Session[]): Promise<void> {
    await writeJSON(KEYS.sessions, sessions);
  },
  async getAttendances(): Promise<Attendance[]> {
    return readJSON<Attendance[]>(KEYS.attendances, []);
  },
  async saveAttendances(attendances: Attendance[]): Promise<void> {
    await writeJSON(KEYS.attendances, attendances);
  },
  async getMatchEvents(): Promise<MatchEvent[]> {
    return readJSON<MatchEvent[]>(KEYS.matchEvents, []);
  },
  async saveMatchEvents(events: MatchEvent[]): Promise<void> {
    await writeJSON(KEYS.matchEvents, events);
  },
  async getStints(): Promise<PlayerStint[]> {
    return readJSON<PlayerStint[]>(KEYS.stints, []);
  },
  async saveStints(stints: PlayerStint[]): Promise<void> {
    await writeJSON(KEYS.stints, stints);
  },
  async getSavedFormations(): Promise<SavedFormation[]> {
    return readJSON<SavedFormation[]>(KEYS.savedFormations, []);
  },
  async saveSavedFormations(items: SavedFormation[]): Promise<void> {
    await writeJSON(KEYS.savedFormations, items);
  },
  async wasSeeded(): Promise<boolean> {
    const v = await kv.getItem(KEYS.seeded);
    return v === '1';
  },
  async markSeeded(): Promise<void> {
    await kv.setItem(KEYS.seeded, '1');
  },
  async resetAll(): Promise<void> {
    await kv.multiRemove([
      KEYS.players,
      KEYS.sessions,
      KEYS.attendances,
      KEYS.matchEvents,
      KEYS.stints,
      KEYS.savedFormations,
      KEYS.seeded,
    ]);
  },
};

export const SEED_PLAYERS = [
  'Léo Martin',
  'Noah Dupont',
  'Hugo Fernandez',
  'Liam Rossi',
  'Ethan Müller',
  'Adam Benali',
  'Lucas Ribeiro',
  'Nolan Schmid',
  'Arthur Bonnard',
  'Gabriel Perez',
  'Mateo Silva',
  'Tom Favre',
];
