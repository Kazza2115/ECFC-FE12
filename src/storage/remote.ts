import { PHOTO_BUCKET, TEAM_ID, supabase } from './supabase';
import type {
  Attendance,
  MatchEvent,
  MatchEventType,
  Player,
  PlayerPosition,
  PlayerStint,
  SavedFormation,
  SavedTeam,
  Session,
} from '@/types';

type DbPlayer = {
  id: string;
  name: string;
  photo_url: string | null;
  team_id: string;
  created_at: string;
  updated_at: string;
};

type DbSession = {
  id: string;
  date: string;
  label: string | null;
  kind: string | null;
  cancelled: boolean | null;
  confirmed: boolean | null;
  started_at: string | null;
  ended_at: string | null;
  starting_lineup: string[] | null;
  lineup_positions: Record<string, string> | null;
  formation: string | null;
  lineup_slots: Record<string, string> | null;
  pause_intervals: Array<{ start: string; end?: string }> | null;
  quarter_teams: Record<string, Record<string, string>> | null;
  current_quarter: number | null;
  team_id: string;
  created_at: string;
  updated_at: string;
};

type DbAttendance = {
  session_id: string;
  player_id: string;
  status: string;
  updated_at: string;
};

type DbMatchEvent = {
  id: string;
  session_id: string;
  player_id: string;
  type: string;
  minute: number | null;
  note: string | null;
  team_id: string;
  created_at: string;
};

type DbStint = {
  id: string;
  session_id: string;
  player_id: string;
  position: string | null;
  start_at: string;
  end_at: string | null;
  quarter: number | null;
  team_id: string;
};

type DbSavedFormation = {
  id: string;
  name: string;
  counts: number[];
  team_id: string;
  created_at: string;
};

type DbSavedTeam = {
  id: string;
  name: string;
  formation: string | null;
  slots: Record<string, string>;
  team_id: string;
  created_at: string;
};

function now(): string {
  return new Date().toISOString();
}

function toDbPlayer(p: Player): DbPlayer {
  return {
    id: p.id,
    name: p.name,
    photo_url: p.photoUri ?? null,
    team_id: TEAM_ID,
    created_at: p.createdAt,
    updated_at: now(),
  };
}

function fromDbPlayer(row: DbPlayer): Player {
  return {
    id: row.id,
    name: row.name,
    photoUri: row.photo_url ?? undefined,
    createdAt: row.created_at,
  };
}

function toDbSession(s: Session): DbSession {
  return {
    id: s.id,
    date: s.date,
    label: s.label ?? null,
    kind: s.kind ?? 'training',
    cancelled: !!s.cancelled,
    confirmed: !!s.confirmed,
    started_at: s.startedAt ?? null,
    ended_at: s.endedAt ?? null,
    starting_lineup: s.startingLineup ?? null,
    lineup_positions:
      (s.lineupPositions as Record<string, string>) ?? null,
    formation: s.formation ?? null,
    lineup_slots: s.lineupSlots ?? null,
    pause_intervals: s.pauseIntervals ?? null,
    quarter_teams: s.quarterTeams ?? null,
    current_quarter: s.currentQuarter ?? null,
    team_id: TEAM_ID,
    created_at: s.createdAt,
    updated_at: now(),
  };
}

function fromDbSession(row: DbSession): Session {
  return {
    id: row.id,
    date: row.date,
    label: row.label ?? undefined,
    kind: (row.kind as Session['kind']) ?? 'training',
    cancelled: !!row.cancelled,
    confirmed: !!row.confirmed,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    startingLineup: row.starting_lineup ?? undefined,
    lineupPositions:
      (row.lineup_positions as Session['lineupPositions']) ?? undefined,
    formation: row.formation ?? undefined,
    lineupSlots: row.lineup_slots ?? undefined,
    pauseIntervals: row.pause_intervals ?? undefined,
    quarterTeams: row.quarter_teams ?? undefined,
    currentQuarter: row.current_quarter ?? undefined,
    createdAt: row.created_at,
  };
}

function toDbAttendance(a: Attendance): DbAttendance {
  return {
    session_id: a.sessionId,
    player_id: a.playerId,
    status: a.status,
    updated_at: now(),
  };
}

function fromDbAttendance(row: DbAttendance): Attendance {
  return {
    sessionId: row.session_id,
    playerId: row.player_id,
    status: row.status as Attendance['status'],
  };
}

function toDbMatchEvent(e: MatchEvent): DbMatchEvent {
  return {
    id: e.id,
    session_id: e.sessionId,
    player_id: e.playerId,
    type: e.type,
    minute: e.minute ?? null,
    note: e.note ?? null,
    team_id: TEAM_ID,
    created_at: e.createdAt,
  };
}

function fromDbMatchEvent(row: DbMatchEvent): MatchEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    playerId: row.player_id,
    type: row.type as MatchEventType,
    minute: row.minute ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

function toDbStint(st: PlayerStint): DbStint {
  return {
    id: st.id,
    session_id: st.sessionId,
    player_id: st.playerId,
    position: st.position ?? null,
    start_at: st.startAt,
    end_at: st.endAt ?? null,
    quarter: st.quarter ?? null,
    team_id: TEAM_ID,
  };
}

function fromDbStint(row: DbStint): PlayerStint {
  return {
    id: row.id,
    sessionId: row.session_id,
    playerId: row.player_id,
    position: (row.position as PlayerPosition) ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at ?? undefined,
    quarter: row.quarter ?? undefined,
  };
}

function toDbSavedFormation(f: SavedFormation): DbSavedFormation {
  return {
    id: f.id,
    name: f.name,
    counts: f.counts,
    team_id: TEAM_ID,
    created_at: f.createdAt,
  };
}

function fromDbSavedFormation(row: DbSavedFormation): SavedFormation {
  return {
    id: row.id,
    name: row.name,
    counts: Array.isArray(row.counts) ? row.counts : [],
    createdAt: row.created_at,
  };
}

function toDbSavedTeam(t: SavedTeam): DbSavedTeam {
  return {
    id: t.id,
    name: t.name,
    formation: t.formation ?? null,
    slots: t.slots,
    team_id: TEAM_ID,
    created_at: t.createdAt,
  };
}

function fromDbSavedTeam(row: DbSavedTeam): SavedTeam {
  return {
    id: row.id,
    name: row.name,
    formation: row.formation ?? undefined,
    slots: (row.slots as Record<string, string>) ?? {},
    createdAt: row.created_at,
  };
}

export type RemoteSnapshot = {
  players: Player[];
  sessions: Session[];
  attendances: Attendance[];
  matchEvents: MatchEvent[];
  stints: PlayerStint[];
  savedFormations: SavedFormation[];
  savedTeams: SavedTeam[];
};

export const remote = {
  async fetchAll(): Promise<RemoteSnapshot> {
    const [pRes, sRes, aRes, eRes, stRes, sfRes, stmRes] = await Promise.all([
      supabase.from('ecfc_players').select('*').eq('team_id', TEAM_ID),
      supabase.from('ecfc_sessions').select('*').eq('team_id', TEAM_ID),
      supabase.from('ecfc_attendances').select('*'),
      supabase.from('ecfc_match_events').select('*').eq('team_id', TEAM_ID),
      supabase.from('ecfc_player_stints').select('*').eq('team_id', TEAM_ID),
      supabase.from('ecfc_saved_formations').select('*').eq('team_id', TEAM_ID),
      supabase.from('ecfc_saved_teams').select('*').eq('team_id', TEAM_ID),
    ]);
    if (pRes.error) throw pRes.error;
    if (sRes.error) throw sRes.error;
    if (aRes.error) throw aRes.error;
    if (eRes.error && eRes.error.code !== 'PGRST205') throw eRes.error;
    if (stRes.error && stRes.error.code !== 'PGRST205') throw stRes.error;
    if (sfRes.error && sfRes.error.code !== 'PGRST205') throw sfRes.error;
    if (stmRes.error && stmRes.error.code !== 'PGRST205') throw stmRes.error;
    return {
      players: (pRes.data ?? []).map(fromDbPlayer),
      sessions: (sRes.data ?? []).map(fromDbSession),
      attendances: (aRes.data ?? []).map(fromDbAttendance),
      matchEvents: (eRes.data ?? []).map(fromDbMatchEvent),
      stints: (stRes.data ?? []).map(fromDbStint),
      savedFormations: (sfRes.data ?? []).map(fromDbSavedFormation),
      savedTeams: (stmRes.data ?? []).map(fromDbSavedTeam),
    };
  },
  async upsertPlayer(p: Player): Promise<void> {
    const { error } = await supabase
      .from('ecfc_players')
      .upsert(toDbPlayer(p));
    if (error) throw error;
  },
  async deletePlayer(id: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_players')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  async upsertSession(s: Session): Promise<void> {
    const { error } = await supabase
      .from('ecfc_sessions')
      .upsert(toDbSession(s));
    if (error) throw error;
  },
  async deleteSession(id: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_sessions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  async upsertAttendance(a: Attendance): Promise<void> {
    const { error } = await supabase
      .from('ecfc_attendances')
      .upsert(toDbAttendance(a));
    if (error) throw error;
  },
  async upsertAttendances(list: Attendance[]): Promise<void> {
    if (list.length === 0) return;
    const { error } = await supabase
      .from('ecfc_attendances')
      .upsert(list.map(toDbAttendance));
    if (error) throw error;
  },
  async deleteAttendancesForSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_attendances')
      .delete()
      .eq('session_id', sessionId);
    if (error) throw error;
  },
  async deleteAttendancesForPlayer(playerId: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_attendances')
      .delete()
      .eq('player_id', playerId);
    if (error) throw error;
  },
  async insertMatchEvent(event: MatchEvent): Promise<void> {
    const { error } = await supabase
      .from('ecfc_match_events')
      .insert(toDbMatchEvent(event));
    if (error) throw error;
  },
  async deleteMatchEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_match_events')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  async deleteMatchEventsForSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_match_events')
      .delete()
      .eq('session_id', sessionId);
    if (error) throw error;
  },
  async deleteMatchEventsForPlayer(playerId: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_match_events')
      .delete()
      .eq('player_id', playerId);
    if (error) throw error;
  },
  async upsertStint(st: PlayerStint): Promise<void> {
    const { error } = await supabase
      .from('ecfc_player_stints')
      .upsert(toDbStint(st));
    if (error) throw error;
  },
  async upsertStints(list: PlayerStint[]): Promise<void> {
    if (list.length === 0) return;
    const { error } = await supabase
      .from('ecfc_player_stints')
      .upsert(list.map(toDbStint));
    if (error) throw error;
  },
  async deleteStint(id: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_player_stints')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  async deleteStintsForSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_player_stints')
      .delete()
      .eq('session_id', sessionId);
    if (error) throw error;
  },
  async deleteStintsForPlayer(playerId: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_player_stints')
      .delete()
      .eq('player_id', playerId);
    if (error) throw error;
  },
  async upsertSavedFormation(f: SavedFormation): Promise<void> {
    const { error } = await supabase
      .from('ecfc_saved_formations')
      .upsert(toDbSavedFormation(f));
    if (error) throw error;
  },
  async deleteSavedFormation(id: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_saved_formations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  async upsertSavedTeam(t: SavedTeam): Promise<void> {
    const { error } = await supabase
      .from('ecfc_saved_teams')
      .upsert(toDbSavedTeam(t));
    if (error) throw error;
  },
  async deleteSavedTeam(id: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_saved_teams')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
  async uploadPhoto(playerId: string, dataUriOrLocalUri: string): Promise<string> {
    const response = await fetch(dataUriOrLocalUri);
    const blob = await response.blob();
    const path = `players/${playerId}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600',
      });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  },
  async deletePhoto(playerId: string): Promise<void> {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([`players/${playerId}.jpg`]);
  },
};
