import { PHOTO_BUCKET, TEAM_ID, supabase } from './supabase';
import type { Attendance, Player, Session } from '@/types';

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

export type RemoteSnapshot = {
  players: Player[];
  sessions: Session[];
  attendances: Attendance[];
};

export const remote = {
  async fetchAll(): Promise<RemoteSnapshot> {
    const [pRes, sRes, aRes] = await Promise.all([
      supabase.from('ecfc_players').select('*').eq('team_id', TEAM_ID),
      supabase.from('ecfc_sessions').select('*').eq('team_id', TEAM_ID),
      supabase.from('ecfc_attendances').select('*'),
    ]);
    if (pRes.error) throw pRes.error;
    if (sRes.error) throw sRes.error;
    if (aRes.error) throw aRes.error;
    return {
      players: (pRes.data ?? []).map(fromDbPlayer),
      sessions: (sRes.data ?? []).map(fromDbSession),
      attendances: (aRes.data ?? []).map(fromDbAttendance),
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
