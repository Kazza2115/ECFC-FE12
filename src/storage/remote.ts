import { PHOTO_BUCKET, getActiveTeamId, supabase } from './supabase';
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
    team_id: getActiveTeamId(),
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
    team_id: getActiveTeamId(),
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
    team_id: getActiveTeamId(),
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
    team_id: getActiveTeamId(),
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
    team_id: getActiveTeamId(),
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
    team_id: getActiveTeamId(),
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
      supabase.from('ecfc_players').select('*').eq('team_id', getActiveTeamId()),
      supabase.from('ecfc_sessions').select('*').eq('team_id', getActiveTeamId()),
      supabase.from('ecfc_attendances').select('*'),
      supabase.from('ecfc_match_events').select('*').eq('team_id', getActiveTeamId()),
      supabase.from('ecfc_player_stints').select('*').eq('team_id', getActiveTeamId()),
      supabase.from('ecfc_saved_formations').select('*').eq('team_id', getActiveTeamId()),
      supabase.from('ecfc_saved_teams').select('*').eq('team_id', getActiveTeamId()),
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
    const path = `${getActiveTeamId()}/players/${playerId}.jpg`;
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
      .remove([`${getActiveTeamId()}/players/${playerId}.jpg`]);
  },
};

// ===========================================================================
// Auth + multi-tenant identity
// ===========================================================================

export type CoachTeam = {
  id: string;
  name: string;
  logoUrl?: string | null;
};

export type CoachProfile = {
  userId: string;
  displayName: string;
  // Active team — what the dashboard currently displays. Same shape
  // as a CoachTeam entry from `teams` below, lifted to the top of
  // the profile so existing screens keep reading
  // `profile.teamId / teamName / teamLogoUrl` unchanged.
  teamId: string;
  teamName: string;
  teamLogoUrl?: string | null;
  // All teams the coach belongs to — used by the team picker in
  // the profile screen and dashboard header.
  teams: CoachTeam[];
  photoUrl?: string | null;
};

export type CoachProfilePatch = Partial<{
  displayName: string;
  photoUrl: string | null;
}>;

export type CoachNote = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

// Postgres error helpers — used to detect when the multi-team SQL
// migration hasn't been applied yet (legacy schema). The codes come
// from PostgREST: 42P01 = relation does not exist, 42703 = column
// does not exist, PGRST204 = column not found in cache.
function isMissingTable(err: any): boolean {
  if (!err) return false;
  if (err.code === '42P01') return true;
  const msg = String(err.message ?? '');
  return /relation .* does not exist|ecfc_coach_teams/i.test(msg) &&
    /does not exist|not found/i.test(msg);
}

function isMissingColumn(err: any): boolean {
  if (!err) return false;
  if (err.code === '42703' || err.code === 'PGRST204') return true;
  const msg = String(err.message ?? '');
  return /active_team_id/i.test(msg) && /does not exist|not found|column/i.test(msg);
}

function teamIdFromString(name: string): string {
  // Slug + short random suffix so two coaches can use the same team
  // name without colliding.
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug || 'team'}-${suffix}`;
}

export const auth = {
  async signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  },

  async signUp(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthChange(cb: (session: any) => void) {
    return supabase.auth.onAuthStateChange((_evt, session) => cb(session));
  },

  async fetchProfile(userId: string): Promise<CoachProfile | null> {
    // Read the profile row. Try the modern schema first
    // (with active_team_id) and fall back to the legacy one if the
    // column hasn't been added yet — this lets coaches keep using
    // the app before the multi-team SQL migration is applied.
    let profileRow: any = null;
    {
      const modern = await supabase
        .from('ecfc_coach_profiles')
        .select('user_id, display_name, team_id, active_team_id, photo_url')
        .eq('user_id', userId)
        .maybeSingle();
      if (modern.error && isMissingColumn(modern.error)) {
        const legacy = await supabase
          .from('ecfc_coach_profiles')
          .select('user_id, display_name, team_id, photo_url')
          .eq('user_id', userId)
          .maybeSingle();
        if (legacy.error) throw legacy.error;
        profileRow = legacy.data
          ? { ...legacy.data, active_team_id: null }
          : null;
      } else if (modern.error) {
        throw modern.error;
      } else {
        profileRow = modern.data;
      }
    }
    if (!profileRow) return null;

    // Read every membership for this coach. If the join table doesn't
    // exist yet (legacy schema), fall back to the single team_id
    // stored on the profile so the coach keeps access to their team.
    let teamIds: string[] = [];
    {
      const res = await supabase
        .from('ecfc_coach_teams')
        .select('team_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (res.error && isMissingTable(res.error)) {
        teamIds = profileRow.team_id ? [profileRow.team_id] : [];
      } else if (res.error) {
        throw res.error;
      } else {
        teamIds = (res.data ?? []).map((r) => r.team_id);
        if (teamIds.length === 0 && profileRow.team_id) {
          teamIds = [profileRow.team_id];
        }
      }
    }
    let teams: CoachTeam[] = [];
    if (teamIds.length > 0) {
      const { data: teamRows, error: teamsErr } = await supabase
        .from('ecfc_teams')
        .select('id, name, logo_url')
        .in('id', teamIds);
      if (teamsErr) throw teamsErr;
      // Preserve the membership order (oldest first).
      const byId = new Map<
        string,
        { id: string; name: string; logo_url: string | null }
      >();
      for (const t of teamRows ?? []) byId.set(t.id, t);
      teams = teamIds
        .map((id) => byId.get(id))
        .filter((t): t is { id: string; name: string; logo_url: string | null } => !!t)
        .map((t) => ({ id: t.id, name: t.name, logoUrl: t.logo_url ?? null }));
    }

    // Resolve the active team. Priority:
    //   1) profile.active_team_id if it points at a team the coach is
    //      still a member of
    //   2) the legacy profile.team_id if the coach has it
    //   3) the first team in their membership list
    let active: CoachTeam | undefined;
    const activeId = profileRow.active_team_id ?? profileRow.team_id ?? null;
    if (activeId) {
      active = teams.find((t) => t.id === activeId);
    }
    if (!active && teams.length > 0) {
      active = teams[0];
    }

    if (!active) {
      // Coach has a profile row but no team yet — let the caller
      // decide what to do (typically: route to the onboarding screen).
      return null;
    }

    return {
      userId: profileRow.user_id,
      displayName: profileRow.display_name,
      teamId: active.id,
      teamName: active.name,
      teamLogoUrl: active.logoUrl ?? null,
      teams,
      photoUrl: profileRow.photo_url ?? null,
    };
  },

  async claimTeamByCode(code: string): Promise<{ teamId: string; teamName: string } | null> {
    const trimmed = code.trim();
    if (!trimmed) return null;
    const { data, error } = await supabase
      .from('ecfc_teams')
      .select('id, name')
      .eq('claim_code', trimmed)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { teamId: data.id, teamName: data.name };
  },

  async createTeam(
    name: string,
    userId: string,
  ): Promise<{ teamId: string; teamName: string }> {
    const trimmed = name.trim();
    const teamId = teamIdFromString(trimmed);
    const { error } = await supabase
      .from('ecfc_teams')
      .insert({
        id: teamId,
        name: trimmed,
        created_by: userId,
      });
    if (error) {
      // 23505 = unique_violation (PostgreSQL). The unique index is
      // built on lower(name), so a duplicate name (case-insensitive)
      // surfaces here.
      const code = (error as any)?.code;
      const msg = (error as any)?.message ?? '';
      if (
        code === '23505' ||
        /duplicate key|unique constraint|already exists/i.test(msg)
      ) {
        throw new Error(
          `Une équipe nommée « ${trimmed} » existe déjà. Choisis un autre nom.`,
        );
      }
      throw error;
    }
    return { teamId, teamName: trimmed };
  },

  async createProfile(
    userId: string,
    displayName: string,
    teamId: string,
  ): Promise<void> {
    // Try the modern schema first (profile row + membership row +
    // active-team pointer). Each step is idempotent. If the
    // multi-team migration hasn't been applied yet, retry without
    // the new column / skip the join table so the legacy onboarding
    // still works.
    const modernPayload = {
      user_id: userId,
      display_name: displayName.trim(),
      team_id: teamId,
      active_team_id: teamId,
    };
    let res = await supabase
      .from('ecfc_coach_profiles')
      .upsert(modernPayload, { onConflict: 'user_id' });
    if (res.error && isMissingColumn(res.error)) {
      const legacyPayload = {
        user_id: userId,
        display_name: displayName.trim(),
        team_id: teamId,
      };
      res = await supabase
        .from('ecfc_coach_profiles')
        .upsert(legacyPayload, { onConflict: 'user_id' });
    }
    if (res.error) throw res.error;

    const memRes = await supabase
      .from('ecfc_coach_teams')
      .upsert(
        { user_id: userId, team_id: teamId, role: 'coach' },
        { onConflict: 'user_id,team_id' },
      );
    if (memRes.error && !isMissingTable(memRes.error)) throw memRes.error;
  },

  async joinTeam(userId: string, teamId: string): Promise<void> {
    // Idempotent insert into the membership table — used when an
    // existing coach claims a 2nd / 3rd team. Falls back to writing
    // team_id on the profile if the membership table doesn't exist.
    const res = await supabase
      .from('ecfc_coach_teams')
      .upsert(
        { user_id: userId, team_id: teamId, role: 'coach' },
        { onConflict: 'user_id,team_id' },
      );
    if (res.error && isMissingTable(res.error)) {
      const fallback = await supabase
        .from('ecfc_coach_profiles')
        .update({ team_id: teamId })
        .eq('user_id', userId);
      if (fallback.error) throw fallback.error;
      return;
    }
    if (res.error) throw res.error;
  },

  async setActiveTeam(userId: string, teamId: string): Promise<void> {
    const res = await supabase
      .from('ecfc_coach_profiles')
      .update({ active_team_id: teamId, updated_at: now() })
      .eq('user_id', userId);
    if (res.error && isMissingColumn(res.error)) {
      const fallback = await supabase
        .from('ecfc_coach_profiles')
        .update({ team_id: teamId, updated_at: now() })
        .eq('user_id', userId);
      if (fallback.error) throw fallback.error;
      return;
    }
    if (res.error) throw res.error;
  },

  async leaveTeam(userId: string, teamId: string): Promise<void> {
    const res = await supabase
      .from('ecfc_coach_teams')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);
    if (res.error && !isMissingTable(res.error)) throw res.error;
  },

  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_coach_profiles')
      .update({ display_name: displayName.trim() })
      .eq('user_id', userId);
    if (error) throw error;
  },

  async updateCoach(userId: string, patch: CoachProfilePatch): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.displayName !== undefined) {
      const v = patch.displayName.trim();
      if (!v) throw new Error('Le nom est requis.');
      update.display_name = v;
    }
    if (patch.photoUrl !== undefined) update.photo_url = patch.photoUrl;
    if (Object.keys(update).length === 0) return;
    update.updated_at = now();

    const { error } = await supabase
      .from('ecfc_coach_profiles')
      .update(update)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async fetchNotes(userId: string): Promise<CoachNote[]> {
    const { data, error } = await supabase
      .from('ecfc_coach_notes')
      .select('id, content, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async createNote(userId: string, content: string): Promise<CoachNote> {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Une note ne peut pas être vide.');
    const { data, error } = await supabase
      .from('ecfc_coach_notes')
      .insert({ user_id: userId, content: trimmed })
      .select('id, content, created_at, updated_at')
      .single();
    if (error) throw error;
    return {
      id: data.id,
      content: data.content,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateNote(noteId: string, content: string): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed) throw new Error('Une note ne peut pas être vide.');
    const { error } = await supabase
      .from('ecfc_coach_notes')
      .update({ content: trimmed, updated_at: now() })
      .eq('id', noteId);
    if (error) throw error;
  },

  async deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('ecfc_coach_notes')
      .delete()
      .eq('id', noteId);
    if (error) throw error;
  },

  async updateTeamLogoUrl(teamId: string, logoUrl: string | null): Promise<void> {
    const { error } = await supabase
      .from('ecfc_teams')
      .update({ logo_url: logoUrl, updated_at: now() })
      .eq('id', teamId);
    if (error) throw error;
  },

  async uploadTeamLogo(
    teamId: string,
    dataUriOrLocalUri: string,
  ): Promise<string> {
    const response = await fetch(dataUriOrLocalUri);
    const blob = await response.blob();
    const path = `${teamId}/team-logo.jpg`;
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

  async deleteTeamLogo(teamId: string): Promise<void> {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([`${teamId}/team-logo.jpg`]);
  },

  async uploadCoachPhoto(
    userId: string,
    dataUriOrLocalUri: string,
  ): Promise<string> {
    const response = await fetch(dataUriOrLocalUri);
    const blob = await response.blob();
    const path = `${getActiveTeamId()}/coaches/${userId}.jpg`;
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

  async deleteCoachPhoto(userId: string): Promise<void> {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([`${getActiveTeamId()}/coaches/${userId}.jpg`]);
  },
};
