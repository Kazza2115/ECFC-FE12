import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { db, SEED_PLAYERS } from '@/storage/database';
import { remote } from '@/storage/remote';
import { supabase } from '@/storage/supabase';
import {
  STATUS_META,
  defaultStatusFor,
} from '@/constants/statuses';
import { findFormation } from '@/constants/formations';
import { uid } from '@/utils/id';
import { todayISO } from '@/utils/date';
import { isMatchKind } from '@/types';
import type {
  Attendance,
  AttendanceStatus,
  MatchEvent,
  MatchEventType,
  Player,
  PlayerMatchTotals,
  PlayerPosition,
  PlayerStats,
  PlayerStint,
  SavedFormation,
  Session,
  SessionKind,
} from '@/types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline';

export type MatchCallUp = {
  player: Player;
  called: number;
  notCalled: number;
  absent: number;
  total: number;
  ratio: number;
};

type DataContextValue = {
  loading: boolean;
  players: Player[];
  sessions: Session[];
  attendances: Attendance[];
  matchEvents: MatchEvent[];
  stints: PlayerStint[];
  addPlayer: (name: string) => Promise<Player>;
  removePlayer: (id: string) => Promise<void>;
  renamePlayer: (id: string, name: string) => Promise<void>;
  setPlayerPhoto: (id: string, photoUri: string | undefined) => Promise<void>;
  createSession: (opts?: { kind?: SessionKind; label?: string; date?: string }) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  toggleCancelled: (sessionId: string) => Promise<void>;
  setSessionConfirmed: (sessionId: string, value: boolean) => Promise<void>;
  setAttendance: (sessionId: string, playerId: string, status: AttendanceStatus) => Promise<void>;
  bulkSetAttendance: (sessionId: string, status: AttendanceStatus) => Promise<void>;
  getStatus: (sessionId: string, playerId: string) => AttendanceStatus;
  getSessionAttendance: (sessionId: string) => Attendance[];
  addMatchEvent: (sessionId: string, playerId: string, type: MatchEventType) => Promise<MatchEvent>;
  removeMatchEvent: (id: string) => Promise<void>;
  getSessionEvents: (sessionId: string) => MatchEvent[];
  getPlayerMatchTotals: (playerId: string, sessionId?: string) => PlayerMatchTotals;
  setStartingLineup: (sessionId: string, playerIds: string[]) => Promise<void>;
  toggleLineup: (sessionId: string, playerId: string) => Promise<void>;
  setLineupPosition: (sessionId: string, playerId: string, position: PlayerPosition | undefined) => Promise<void>;
  removeFromLineup: (sessionId: string, playerId: string) => Promise<void>;
  setFormation: (sessionId: string, formationId: string | undefined) => Promise<void>;
  assignToSlot: (sessionId: string, slotId: string, playerId: string | null) => Promise<void>;
  savedFormations: SavedFormation[];
  saveFormation: (name: string, counts: number[]) => Promise<SavedFormation>;
  deleteSavedFormation: (id: string) => Promise<void>;
  startMatch: (sessionId: string) => Promise<void>;
  pauseMatch: (sessionId: string) => Promise<void>;
  resumeMatch: (sessionId: string) => Promise<void>;
  resetTeam: (sessionId: string) => Promise<void>;
  endMatch: (sessionId: string) => Promise<void>;
  putOnPitch: (sessionId: string, playerId: string, position?: PlayerPosition) => Promise<void>;
  takeOffPitch: (sessionId: string, playerId: string) => Promise<void>;
  setStintPosition: (stintId: string, position: PlayerPosition) => Promise<void>;
  getSessionStints: (sessionId: string) => PlayerStint[];
  getPlayerPlayMs: (playerId: string, sessionId?: string, now?: number) => number;
  playerStats: PlayerStats[];
  matchCallUps: MatchCallUp[];
  globalRatio: number;
  activeTrainingsCount: number;
  activeMatchesCount: number;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  refreshFromCloud: () => Promise<void>;
  resetAll: () => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

function isMatch(s: Session): boolean {
  return isMatchKind(s.kind);
}

function isTraining(s: Session): boolean {
  return !isMatchKind(s.kind);
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [stints, setStints] = useState<PlayerStint[]>([]);
  const [savedFormations, setSavedFormations] = useState<SavedFormation[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const warn = (context: string, err: unknown) => {
    if (typeof console !== 'undefined') {
      console.warn(`[sync:${context}]`, err);
    }
  };

  const markSynced = () => {
    setSyncStatus('synced');
    setLastSyncedAt(new Date().toISOString());
    setLastSyncError(null);
  };

  const markOffline = (label: string, err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    setLastSyncError(`${label} → ${msg}`);
    setSyncStatus('offline');
  };

  useEffect(() => {
    (async () => {
      const [
        cachedPlayers,
        cachedSessions,
        cachedAttendances,
        cachedEvents,
        cachedStints,
        cachedSavedFormations,
        seeded,
      ] = await Promise.all([
        db.getPlayers(),
        db.getSessions(),
        db.getAttendances(),
        db.getMatchEvents(),
        db.getStints(),
        db.getSavedFormations(),
        db.wasSeeded(),
      ]);

      setPlayers(cachedPlayers);
      setSessions(cachedSessions);
      setAttendances(migrateAttendances(cachedAttendances));
      setMatchEvents(cachedEvents);
      setStints(cachedStints);
      setSavedFormations(cachedSavedFormations);
      setLoading(false);

      setSyncStatus('syncing');
      try {
        const snap = await remote.fetchAll();

        if (snap.players.length > 0 || snap.sessions.length > 0) {
          setPlayers(snap.players);
          setSessions(
            snap.sessions.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            ),
          );
          setAttendances(snap.attendances);
          setMatchEvents(snap.matchEvents);
          setStints(snap.stints);
          setSavedFormations(snap.savedFormations);
          await Promise.all([
            db.savePlayers(snap.players),
            db.saveSessions(snap.sessions),
            db.saveAttendances(snap.attendances),
            db.saveMatchEvents(snap.matchEvents),
            db.saveStints(snap.stints),
            db.saveSavedFormations(snap.savedFormations),
            db.markSeeded(),
          ]);
        } else if (cachedPlayers.length === 0 && !seeded) {
          const seedPlayers: Player[] = SEED_PLAYERS.map((name) => ({
            id: uid(),
            name,
            createdAt: todayISO(),
          }));
          setPlayers(seedPlayers);
          await Promise.all([
            db.savePlayers(seedPlayers),
            db.markSeeded(),
          ]);
          try {
            for (const p of seedPlayers) await remote.upsertPlayer(p);
          } catch (err) {
            warn('seed-push', err);
          }
        } else if (cachedPlayers.length > 0) {
          try {
            for (const p of cachedPlayers) await remote.upsertPlayer(p);
            for (const s of cachedSessions) await remote.upsertSession(s);
            if (cachedAttendances.length > 0) {
              await remote.upsertAttendances(cachedAttendances);
            }
          } catch (err) {
            warn('initial-push', err);
          }
        }

        markSynced();
      } catch (err) {
        warn('initial-fetch', err);
        markOffline('initial-fetch', err);
      }
    })();
  }, []);

  const refreshFromCloud = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const snap = await remote.fetchAll();
      setPlayers(snap.players);
      setSessions(
        snap.sessions.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      );
      setAttendances(snap.attendances);
      setMatchEvents(snap.matchEvents);
      setStints(snap.stints);
      setSavedFormations(snap.savedFormations);
      await Promise.all([
        db.savePlayers(snap.players),
        db.saveSessions(snap.sessions),
        db.saveAttendances(snap.attendances),
        db.saveMatchEvents(snap.matchEvents),
        db.saveStints(snap.stints),
        db.saveSavedFormations(snap.savedFormations),
      ]);
      markSynced();
    } catch (err) {
      warn('refresh', err);
      markOffline('refresh', err);
    }
  }, []);

  // Stable ref so listeners installed once below always call the latest fn.
  const refreshRef = useRef(refreshFromCloud);
  useEffect(() => {
    refreshRef.current = refreshFromCloud;
  }, [refreshFromCloud]);

  // Realtime: any postgres change in our team triggers a debounced refresh
  // so every coach's phone shows the same data within a second or two.
  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        pending = null;
        refreshRef.current();
      }, 600);
    };

    const channel = supabase
      .channel('ecfc-team-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ecfc_players' },
        schedule,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ecfc_sessions' },
        schedule,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ecfc_attendances' },
        schedule,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ecfc_match_events' },
        schedule,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ecfc_player_stints' },
        schedule,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ecfc_saved_formations' },
        schedule,
      )
      .subscribe();

    return () => {
      if (pending) clearTimeout(pending);
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-refresh when the tab becomes visible (web) or the app is brought
  // back to foreground (iOS / Android), plus a 30s heartbeat as a safety
  // net in case realtime drops.
  useEffect(() => {
    const heartbeat = setInterval(() => {
      const visible =
        Platform.OS !== 'web' ||
        typeof document === 'undefined' ||
        document.visibilityState === 'visible';
      if (visible) refreshRef.current();
    }, 30_000);

    if (Platform.OS === 'web') {
      const onVisible = () => {
        if (
          typeof document !== 'undefined' &&
          document.visibilityState === 'visible'
        ) {
          refreshRef.current();
        }
      };
      const onFocus = () => refreshRef.current();
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisible);
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('focus', onFocus);
      }
      return () => {
        clearInterval(heartbeat);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', onVisible);
        }
        if (typeof window !== 'undefined') {
          window.removeEventListener('focus', onFocus);
        }
      };
    }

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshRef.current();
    });
    return () => {
      clearInterval(heartbeat);
      sub.remove();
    };
  }, []);

  const pushSafe = async (
    label: string,
    fn: () => Promise<void>,
  ): Promise<void> => {
    setSyncStatus('syncing');
    try {
      await fn();
      markSynced();
    } catch (err) {
      warn(label, err);
      markOffline(label, err);
    }
  };

  const addPlayer = useCallback(async (name: string) => {
    const player: Player = {
      id: uid(),
      name: name.trim(),
      createdAt: todayISO(),
    };
    const next = [...players, player];
    setPlayers(next);
    await db.savePlayers(next);
    await pushSafe('upsertPlayer', () => remote.upsertPlayer(player));
    return player;
  }, [players]);

  const removePlayer = useCallback(async (id: string) => {
    const nextPlayers = players.filter((p) => p.id !== id);
    const nextAttendances = attendances.filter((a) => a.playerId !== id);
    const nextEvents = matchEvents.filter((e) => e.playerId !== id);
    const nextStints = stints.filter((s) => s.playerId !== id);
    setPlayers(nextPlayers);
    setAttendances(nextAttendances);
    setMatchEvents(nextEvents);
    setStints(nextStints);
    await Promise.all([
      db.savePlayers(nextPlayers),
      db.saveAttendances(nextAttendances),
      db.saveMatchEvents(nextEvents),
      db.saveStints(nextStints),
    ]);
    await pushSafe('deletePlayer', async () => {
      await remote.deleteAttendancesForPlayer(id);
      try {
        await remote.deleteMatchEventsForPlayer(id);
      } catch (err) {
        warn('deleteMatchEventsForPlayer', err);
      }
      try {
        await remote.deleteStintsForPlayer(id);
      } catch (err) {
        warn('deleteStintsForPlayer', err);
      }
      await remote.deletePlayer(id);
      try {
        await remote.deletePhoto(id);
      } catch {}
    });
  }, [players, attendances, matchEvents, stints]);

  const renamePlayer = useCallback(async (id: string, name: string) => {
    const next = players.map((p) =>
      p.id === id ? { ...p, name: name.trim() } : p,
    );
    setPlayers(next);
    await db.savePlayers(next);
    const changed = next.find((p) => p.id === id);
    if (changed) {
      await pushSafe('renamePlayer', () => remote.upsertPlayer(changed));
    }
  }, [players]);

  const setPlayerPhoto = useCallback(async (id: string, photoUri: string | undefined) => {
    let finalUri = photoUri;
    if (photoUri && photoUri.startsWith('data:')) {
      try {
        setSyncStatus('syncing');
        finalUri = await remote.uploadPhoto(id, photoUri);
      } catch (err) {
        warn('uploadPhoto', err);
        finalUri = photoUri;
        markOffline('uploadPhoto', err);
      }
    } else if (!photoUri) {
      try {
        await remote.deletePhoto(id);
      } catch (err) {
        warn('deletePhoto', err);
      }
    }

    const next = players.map((p) =>
      p.id === id ? { ...p, photoUri: finalUri } : p,
    );
    setPlayers(next);
    await db.savePlayers(next);
    const changed = next.find((p) => p.id === id);
    if (changed) {
      await pushSafe('upsertPlayerPhoto', () =>
        remote.upsertPlayer(changed),
      );
    }
  }, [players]);

  const createSession = useCallback(async (opts?: { kind?: SessionKind; label?: string; date?: string }) => {
    const session: Session = {
      id: uid(),
      date: opts?.date ?? todayISO(),
      label: opts?.label,
      kind: opts?.kind ?? 'training',
      cancelled: false,
      createdAt: todayISO(),
    };
    const next = [session, ...sessions];
    setSessions(next);
    await db.saveSessions(next);
    await pushSafe('upsertSession', () => remote.upsertSession(session));
    return session;
  }, [sessions]);

  const deleteSession = useCallback(async (id: string) => {
    const nextSessions = sessions.filter((s) => s.id !== id);
    const nextAttendances = attendances.filter((a) => a.sessionId !== id);
    const nextEvents = matchEvents.filter((e) => e.sessionId !== id);
    const nextStints = stints.filter((st) => st.sessionId !== id);
    setSessions(nextSessions);
    setAttendances(nextAttendances);
    setMatchEvents(nextEvents);
    setStints(nextStints);
    await Promise.all([
      db.saveSessions(nextSessions),
      db.saveAttendances(nextAttendances),
      db.saveMatchEvents(nextEvents),
      db.saveStints(nextStints),
    ]);
    await pushSafe('deleteSession', async () => {
      await remote.deleteAttendancesForSession(id);
      try {
        await remote.deleteMatchEventsForSession(id);
      } catch (err) {
        warn('deleteMatchEventsForSession', err);
      }
      try {
        await remote.deleteStintsForSession(id);
      } catch (err) {
        warn('deleteStintsForSession', err);
      }
      await remote.deleteSession(id);
    });
  }, [sessions, attendances, matchEvents, stints]);

  const toggleCancelled = useCallback(async (sessionId: string) => {
    const next = sessions.map((s) =>
      s.id === sessionId ? { ...s, cancelled: !s.cancelled } : s,
    );
    setSessions(next);
    await db.saveSessions(next);
    const changed = next.find((s) => s.id === sessionId);
    if (changed) {
      await pushSafe('toggleCancelled', () => remote.upsertSession(changed));
    }
  }, [sessions]);

  const setSessionConfirmed = useCallback(
    async (sessionId: string, value: boolean) => {
      const next = sessions.map((s) =>
        s.id === sessionId ? { ...s, confirmed: value } : s,
      );
      setSessions(next);
      await db.saveSessions(next);
      const changed = next.find((s) => s.id === sessionId);
      if (changed) {
        await pushSafe('setSessionConfirmed', () =>
          remote.upsertSession(changed),
        );
      }
    },
    [sessions],
  );

  const setAttendance = useCallback(async (sessionId: string, playerId: string, status: AttendanceStatus) => {
    const record: Attendance = { sessionId, playerId, status };
    const existingIndex = attendances.findIndex(
      (a) => a.sessionId === sessionId && a.playerId === playerId,
    );
    let next: Attendance[];
    if (existingIndex >= 0) {
      next = attendances.slice();
      next[existingIndex] = record;
    } else {
      next = [...attendances, record];
    }
    setAttendances(next);
    await db.saveAttendances(next);
    await pushSafe('upsertAttendance', () => remote.upsertAttendance(record));
  }, [attendances]);

  const bulkSetAttendance = useCallback(async (sessionId: string, status: AttendanceStatus) => {
    const others = attendances.filter((a) => a.sessionId !== sessionId);
    const fresh: Attendance[] = players.map((p) => ({
      sessionId,
      playerId: p.id,
      status,
    }));
    const next = [...others, ...fresh];
    setAttendances(next);
    await db.saveAttendances(next);
    await pushSafe('upsertAttendances', () => remote.upsertAttendances(fresh));
  }, [attendances, players]);

  const getStatus = useCallback((sessionId: string, playerId: string): AttendanceStatus => {
    const record = attendances.find(
      (a) => a.sessionId === sessionId && a.playerId === playerId,
    );
    if (record) return record.status;
    const session = sessions.find((s) => s.id === sessionId);
    return defaultStatusFor(session?.kind);
  }, [attendances, sessions]);

  const getSessionAttendance = useCallback((sessionId: string) => {
    return attendances.filter((a) => a.sessionId === sessionId);
  }, [attendances]);

  const addMatchEvent = useCallback(async (sessionId: string, playerId: string, type: MatchEventType) => {
    const event: MatchEvent = {
      id: uid(),
      sessionId,
      playerId,
      type,
      createdAt: todayISO(),
    };
    const next = [...matchEvents, event];
    setMatchEvents(next);
    await db.saveMatchEvents(next);
    await pushSafe('insertMatchEvent', () => remote.insertMatchEvent(event));
    return event;
  }, [matchEvents]);

  const removeMatchEvent = useCallback(async (id: string) => {
    const next = matchEvents.filter((e) => e.id !== id);
    setMatchEvents(next);
    await db.saveMatchEvents(next);
    await pushSafe('deleteMatchEvent', () => remote.deleteMatchEvent(id));
  }, [matchEvents]);

  const getSessionEvents = useCallback((sessionId: string) => {
    return matchEvents
      .filter((e) => e.sessionId === sessionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [matchEvents]);

  const activeTrainings = useMemo(
    () => sessions.filter((s) => isTraining(s) && !s.cancelled),
    [sessions],
  );
  const activeMatches = useMemo(
    () => sessions.filter((s) => isMatch(s) && !s.cancelled),
    [sessions],
  );
  const activeTrainingIds = useMemo(
    () => new Set(activeTrainings.map((s) => s.id)),
    [activeTrainings],
  );
  const activeMatchIds = useMemo(
    () => new Set(activeMatches.map((s) => s.id)),
    [activeMatches],
  );

  const getPlayerMatchTotals = useCallback(
    (playerId: string, sessionId?: string): PlayerMatchTotals => {
      const totals: PlayerMatchTotals = {
        goals: 0,
        assists: 0,
        key: 0,
        yellow: 0,
        red: 0,
      };
      for (const e of matchEvents) {
        if (e.playerId !== playerId) continue;
        if (sessionId && e.sessionId !== sessionId) continue;
        if (!sessionId && !activeMatchIds.has(e.sessionId)) continue;
        if (e.type === 'goal') totals.goals += 1;
        else if (e.type === 'assist') totals.assists += 1;
        else if (e.type === 'key') totals.key += 1;
        else if (e.type === 'yellow') totals.yellow += 1;
        else if (e.type === 'red') totals.red += 1;
      }
      return totals;
    },
    [matchEvents, activeMatchIds],
  );

  // --- Lineup & stints ---

  const setStartingLineup = useCallback(
    async (sessionId: string, playerIds: string[]) => {
      const next = sessions.map((s) =>
        s.id === sessionId ? { ...s, startingLineup: playerIds } : s,
      );
      setSessions(next);
      await db.saveSessions(next);
      const changed = next.find((s) => s.id === sessionId);
      if (changed) {
        await pushSafe('setStartingLineup', () =>
          remote.upsertSession(changed),
        );
      }
    },
    [sessions],
  );

  const toggleLineup = useCallback(
    async (sessionId: string, playerId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      const current = session?.startingLineup ?? [];
      const nextLineup = current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId];
      await setStartingLineup(sessionId, nextLineup);
    },
    [sessions, setStartingLineup],
  );

  const setLineupPosition = useCallback(
    async (
      sessionId: string,
      playerId: string,
      position: PlayerPosition | undefined,
    ) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const nextLineup = (session.startingLineup ?? []).includes(playerId)
        ? (session.startingLineup ?? [])
        : [...(session.startingLineup ?? []), playerId];
      const nextPositions: Record<string, PlayerPosition> = {
        ...(session.lineupPositions ?? {}),
      };
      if (position) {
        nextPositions[playerId] = position;
      } else {
        delete nextPositions[playerId];
      }
      const nextSessions = sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              startingLineup: nextLineup,
              lineupPositions: nextPositions,
            }
          : s,
      );
      setSessions(nextSessions);
      await db.saveSessions(nextSessions);
      const changed = nextSessions.find((s) => s.id === sessionId);
      if (changed) {
        await pushSafe('setLineupPosition', () => remote.upsertSession(changed));
      }
    },
    [sessions],
  );

  const removeFromLineup = useCallback(
    async (sessionId: string, playerId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const nextLineup = (session.startingLineup ?? []).filter(
        (id) => id !== playerId,
      );
      const nextPositions: Record<string, PlayerPosition> = {
        ...(session.lineupPositions ?? {}),
      };
      delete nextPositions[playerId];
      const nextSessions = sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              startingLineup: nextLineup,
              lineupPositions: nextPositions,
            }
          : s,
      );
      setSessions(nextSessions);
      await db.saveSessions(nextSessions);
      const changed = nextSessions.find((s) => s.id === sessionId);
      if (changed) {
        await pushSafe('removeFromLineup', () =>
          remote.upsertSession(changed),
        );
      }
    },
    [sessions],
  );

  const setFormation = useCallback(
    async (sessionId: string, formationId: string | undefined) => {
      const nextSessions = sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              formation: formationId,
              lineupSlots: formationId ? (s.lineupSlots ?? {}) : undefined,
            }
          : s,
      );
      setSessions(nextSessions);
      await db.saveSessions(nextSessions);
      const changed = nextSessions.find((s) => s.id === sessionId);
      if (changed) {
        await pushSafe('setFormation', () => remote.upsertSession(changed));
      }
    },
    [sessions],
  );

  const assignToSlot = useCallback(
    async (
      sessionId: string,
      slotId: string,
      playerId: string | null,
    ) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const formation = findFormation(session.formation);
      if (!formation) return;
      const slot = formation.slots.find((s) => s.id === slotId);
      if (!slot) return;

      const currentSlots: Record<string, string> = {
        ...(session.lineupSlots ?? {}),
      };

      if (playerId) {
        // If this player is already assigned elsewhere, remove from that slot
        for (const [sid, pid] of Object.entries(currentSlots)) {
          if (pid === playerId && sid !== slotId) {
            delete currentSlots[sid];
          }
        }
        currentSlots[slotId] = playerId;
      } else {
        delete currentSlots[slotId];
      }

      // Derive startingLineup + lineupPositions from the slots map.
      const nextLineup = Array.from(new Set(Object.values(currentSlots)));
      const nextPositions: Record<string, PlayerPosition> = {};
      for (const [sid, pid] of Object.entries(currentSlots)) {
        const s = formation.slots.find((x) => x.id === sid);
        if (s) nextPositions[pid] = s.position;
      }

      const nextSessions = sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              lineupSlots: currentSlots,
              startingLineup: nextLineup,
              lineupPositions: nextPositions,
            }
          : s,
      );
      setSessions(nextSessions);
      await db.saveSessions(nextSessions);
      const changed = nextSessions.find((s) => s.id === sessionId);
      if (changed) {
        await pushSafe('assignToSlot', () => remote.upsertSession(changed));
      }
    },
    [sessions],
  );

  const startMatch = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const startedAt = todayISO();
      const nextSessions = sessions.map((s) =>
        s.id === sessionId
          ? { ...s, startedAt, endedAt: undefined }
          : s,
      );
      setSessions(nextSessions);
      await db.saveSessions(nextSessions);

      // If the coach picked a formation + filled slots, prefer that as
      // the source of truth for the starting stints.
      const formation = findFormation(session.formation);
      const slots = session.lineupSlots ?? {};
      const usingFormation =
        formation && Object.keys(slots).length > 0;

      let newStints: PlayerStint[] = [];
      if (usingFormation) {
        newStints = Object.entries(slots).map(([slotId, playerId]) => {
          const slot = formation!.slots.find((s) => s.id === slotId);
          return {
            id: uid(),
            sessionId,
            playerId,
            position: slot?.position,
            startAt: startedAt,
          };
        });
      } else {
        const lineupIds = session.startingLineup ?? [];
        const positions = session.lineupPositions ?? {};
        newStints = lineupIds.map((playerId) => ({
          id: uid(),
          sessionId,
          playerId,
          position: positions[playerId],
          startAt: startedAt,
        }));
      }

      if (newStints.length > 0) {
        const nextStints = [...stints, ...newStints];
        setStints(nextStints);
        await db.saveStints(nextStints);
      }

      const changed = nextSessions.find((s) => s.id === sessionId);
      await pushSafe('startMatch', async () => {
        if (changed) await remote.upsertSession(changed);
        if (newStints.length > 0) await remote.upsertStints(newStints);
      });
    },
    [sessions, stints],
  );

  const pauseMatch = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const intervals = session.pauseIntervals ?? [];
      // Already paused
      if (intervals.length > 0 && !intervals[intervals.length - 1].end) return;
      const nextIntervals = [...intervals, { start: todayISO() }];
      const nextSessions = sessions.map((s) =>
        s.id === sessionId ? { ...s, pauseIntervals: nextIntervals } : s,
      );
      setSessions(nextSessions);
      await db.saveSessions(nextSessions);
      const changed = nextSessions.find((s) => s.id === sessionId);
      if (changed) {
        await pushSafe('pauseMatch', () => remote.upsertSession(changed));
      }
    },
    [sessions],
  );

  const resumeMatch = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const intervals = session.pauseIntervals ?? [];
      if (intervals.length === 0) return;
      const last = intervals[intervals.length - 1];
      if (last.end) return; // not currently paused
      const resumeAt = todayISO();
      const closedIntervals = [
        ...intervals.slice(0, -1),
        { ...last, end: resumeAt },
      ];
      const nextSessions = sessions.map((s) =>
        s.id === sessionId ? { ...s, pauseIntervals: closedIntervals } : s,
      );

      // Open stints for any slot occupant that doesn't already have
      // an open stint for this session. Happens after a team reset
      // (where we closed everything) or after a regular pause where
      // the coach changed a few slots while stopped.
      const occupantIds = new Set(
        Object.values(session.lineupSlots ?? {}).filter(Boolean),
      );
      const openStintPlayerIds = new Set(
        stints
          .filter((st) => st.sessionId === sessionId && !st.endAt)
          .map((st) => st.playerId),
      );
      const formation = findFormation(session.formation);
      const newStints: PlayerStint[] = [];
      for (const pid of occupantIds) {
        if (openStintPlayerIds.has(pid)) continue;
        const slotId = Object.entries(session.lineupSlots ?? {}).find(
          ([, p]) => p === pid,
        )?.[0];
        const slot = formation?.slots.find((s) => s.id === slotId);
        newStints.push({
          id: uid(),
          sessionId,
          playerId: pid,
          position: slot?.position,
          startAt: resumeAt,
        });
      }

      const nextStints = newStints.length > 0 ? [...stints, ...newStints] : stints;

      setSessions(nextSessions);
      setStints(nextStints);
      await Promise.all([
        db.saveSessions(nextSessions),
        db.saveStints(nextStints),
      ]);

      const changed = nextSessions.find((s) => s.id === sessionId);
      await pushSafe('resumeMatch', async () => {
        if (changed) await remote.upsertSession(changed);
        if (newStints.length > 0) await remote.upsertStints(newStints);
      });
    },
    [sessions, stints],
  );

  const resetTeam = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      // Prefer to end stints at the pause start so the paused window
      // is clean, otherwise close right now.
      const lastPause = (session.pauseIntervals ?? [])[
        (session.pauseIntervals ?? []).length - 1
      ];
      const endAt =
        lastPause && !lastPause.end ? lastPause.start : todayISO();

      const openStints = stints.filter(
        (st) => st.sessionId === sessionId && !st.endAt,
      );
      const closedStints = openStints.map((st) => ({ ...st, endAt }));
      const closedMap = new Map(closedStints.map((s) => [s.id, s]));
      const nextStints = stints.map((st) => closedMap.get(st.id) ?? st);

      const nextSessions = sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              lineupSlots: {},
              startingLineup: [],
              lineupPositions: {},
            }
          : s,
      );

      setStints(nextStints);
      setSessions(nextSessions);
      await Promise.all([
        db.saveStints(nextStints),
        db.saveSessions(nextSessions),
      ]);

      const changed = nextSessions.find((s) => s.id === sessionId);
      await pushSafe('resetTeam', async () => {
        if (closedStints.length > 0) {
          await remote.upsertStints(closedStints);
        }
        if (changed) await remote.upsertSession(changed);
      });
    },
    [sessions, stints],
  );

  const endMatch = useCallback(
    async (sessionId: string) => {
      const endedAt = todayISO();
      const nextSessions = sessions.map((s) =>
        s.id === sessionId ? { ...s, endedAt } : s,
      );
      setSessions(nextSessions);
      await db.saveSessions(nextSessions);

      const openStints = stints.filter(
        (st) => st.sessionId === sessionId && !st.endAt,
      );
      const closedStints = openStints.map((st) => ({ ...st, endAt: endedAt }));
      const stintMap = new Map(closedStints.map((s) => [s.id, s]));
      const nextStints = stints.map((st) => stintMap.get(st.id) ?? st);
      setStints(nextStints);
      await db.saveStints(nextStints);

      const changed = nextSessions.find((s) => s.id === sessionId);
      await pushSafe('endMatch', async () => {
        if (changed) await remote.upsertSession(changed);
        if (closedStints.length > 0) await remote.upsertStints(closedStints);
      });
    },
    [sessions, stints],
  );

  const putOnPitch = useCallback(
    async (sessionId: string, playerId: string, position?: PlayerPosition) => {
      // If there's already an open stint, no-op
      if (
        stints.some(
          (st) =>
            st.sessionId === sessionId &&
            st.playerId === playerId &&
            !st.endAt,
        )
      ) {
        return;
      }
      const session = sessions.find((s) => s.id === sessionId);
      // Before match start, only update the lineup
      if (session && !session.startedAt) {
        if (!(session.startingLineup ?? []).includes(playerId)) {
          await toggleLineup(sessionId, playerId);
        }
        return;
      }
      const st: PlayerStint = {
        id: uid(),
        sessionId,
        playerId,
        position,
        startAt: todayISO(),
      };
      const next = [...stints, st];
      setStints(next);
      await db.saveStints(next);
      await pushSafe('upsertStint', () => remote.upsertStint(st));
    },
    [stints, sessions, toggleLineup],
  );

  const takeOffPitch = useCallback(
    async (sessionId: string, playerId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      // Before match start, just remove from lineup
      if (session && !session.startedAt) {
        if ((session.startingLineup ?? []).includes(playerId)) {
          await toggleLineup(sessionId, playerId);
        }
        return;
      }
      const endAt = todayISO();
      const openStints = stints.filter(
        (st) =>
          st.sessionId === sessionId &&
          st.playerId === playerId &&
          !st.endAt,
      );
      if (openStints.length === 0) return;
      const closed = openStints.map((st) => ({ ...st, endAt }));
      const map = new Map(closed.map((s) => [s.id, s]));
      const next = stints.map((st) => map.get(st.id) ?? st);
      setStints(next);
      await db.saveStints(next);
      await pushSafe('closeStint', () => remote.upsertStints(closed));
    },
    [stints, sessions, toggleLineup],
  );

  const setStintPosition = useCallback(
    async (stintId: string, position: PlayerPosition) => {
      const target = stints.find((st) => st.id === stintId);
      if (!target) return;
      const updated = { ...target, position };
      const next = stints.map((st) => (st.id === stintId ? updated : st));
      setStints(next);
      await db.saveStints(next);
      await pushSafe('setStintPosition', () =>
        remote.upsertStint(updated),
      );
    },
    [stints],
  );

  const getSessionStints = useCallback(
    (sessionId: string) => {
      return stints
        .filter((st) => st.sessionId === sessionId)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    },
    [stints],
  );

  const getPlayerPlayMs = useCallback(
    (playerId: string, sessionId?: string, nowMs?: number): number => {
      const reference = nowMs ?? Date.now();
      let total = 0;
      for (const st of stints) {
        if (st.playerId !== playerId) continue;
        if (sessionId && st.sessionId !== sessionId) continue;
        if (!sessionId && !activeMatchIds.has(st.sessionId)) continue;
        const start = new Date(st.startAt).getTime();
        const end = st.endAt ? new Date(st.endAt).getTime() : reference;
        if (end <= start) continue;
        let duration = end - start;
        const session = sessions.find((s) => s.id === st.sessionId);
        const pauses = session?.pauseIntervals ?? [];
        for (const p of pauses) {
          const pStart = new Date(p.start).getTime();
          const pEnd = p.end ? new Date(p.end).getTime() : reference;
          if (pEnd <= pStart) continue;
          const overlap =
            Math.min(pEnd, end) - Math.max(pStart, start);
          if (overlap > 0) duration -= overlap;
        }
        if (duration > 0) total += duration;
      }
      return total;
    },
    [stints, sessions, activeMatchIds],
  );

  const playerStats = useMemo<PlayerStats[]>(() => {
    const totalSessions = activeTrainings.length;
    return players
      .map((player) => {
        const counts = {
          present: 0,
          sfc: 0,
          return: 0,
          excused: 0,
          unexcused: 0,
          vacation: 0,
          not_called: 0,
        } as Record<AttendanceStatus, number>;

        for (const a of attendances) {
          if (a.playerId !== player.id) continue;
          if (!activeTrainingIds.has(a.sessionId)) continue;
          counts[a.status] = (counts[a.status] ?? 0) + 1;
        }

        const totalPresent = counts.present + counts.sfc + counts.return;
        const ratio = totalSessions === 0 ? 0 : totalPresent / totalSessions;

        return {
          player,
          present: counts.present,
          sfc: counts.sfc,
          ret: counts.return,
          excused: counts.excused,
          unexcused: counts.unexcused,
          vacation: counts.vacation,
          notCalled: counts.not_called,
          totalPresent,
          totalSessions,
          ratio,
        };
      })
      .sort((a, b) => b.ratio - a.ratio);
  }, [players, activeTrainings, activeTrainingIds, attendances]);

  const matchCallUps = useMemo<MatchCallUp[]>(() => {
    const totalMatches = activeMatches.length;
    return players
      .map((player) => {
        let called = 0;
        let notCalled = 0;
        let absent = 0;
        const seenSessions = new Set<string>();
        for (const a of attendances) {
          if (a.playerId !== player.id) continue;
          if (!activeMatchIds.has(a.sessionId)) continue;
          seenSessions.add(a.sessionId);
          if (a.status === 'present' || a.status === 'sfc' || a.status === 'return') called += 1;
          else if (a.status === 'not_called' || a.status === 'vacation') notCalled += 1;
          else if (a.status === 'excused' || a.status === 'unexcused') absent += 1;
        }
        const untouched = totalMatches - seenSessions.size;
        notCalled += untouched;

        const ratio = totalMatches === 0 ? 0 : called / totalMatches;
        return {
          player,
          called,
          notCalled,
          absent,
          total: totalMatches,
          ratio,
        };
      })
      .sort((a, b) => b.called - a.called);
  }, [players, activeMatches, activeMatchIds, attendances]);

  const globalRatio = useMemo(() => {
    if (activeTrainings.length === 0 || players.length === 0) return 0;
    const possible = activeTrainings.length * players.length;
    let present = 0;
    for (const a of attendances) {
      if (!activeTrainingIds.has(a.sessionId)) continue;
      if (STATUS_META[a.status]?.countsPresent) present += 1;
    }
    return possible === 0 ? 0 : present / possible;
  }, [players, activeTrainings, activeTrainingIds, attendances]);

  const saveFormation = useCallback(
    async (name: string, counts: number[]) => {
      const trimmed = name.trim();
      const item: SavedFormation = {
        id: uid(),
        name: trimmed.length > 0 ? trimmed : counts.join('-'),
        counts,
        createdAt: todayISO(),
      };
      const next = [...savedFormations, item];
      setSavedFormations(next);
      await db.saveSavedFormations(next);
      await pushSafe('saveFormation', () => remote.upsertSavedFormation(item));
      return item;
    },
    [savedFormations],
  );

  const deleteSavedFormation = useCallback(
    async (id: string) => {
      const next = savedFormations.filter((f) => f.id !== id);
      setSavedFormations(next);
      await db.saveSavedFormations(next);
      await pushSafe('deleteSavedFormation', () =>
        remote.deleteSavedFormation(id),
      );
    },
    [savedFormations],
  );

  const resetAll = useCallback(async () => {
    await db.resetAll();
    setPlayers([]);
    setSessions([]);
    setAttendances([]);
    setMatchEvents([]);
    setStints([]);
    setSavedFormations([]);
  }, []);

  const value: DataContextValue = {
    loading,
    players,
    sessions,
    attendances,
    matchEvents,
    stints,
    addPlayer,
    removePlayer,
    renamePlayer,
    setPlayerPhoto,
    createSession,
    deleteSession,
    toggleCancelled,
    setSessionConfirmed,
    setAttendance,
    bulkSetAttendance,
    getStatus,
    getSessionAttendance,
    addMatchEvent,
    removeMatchEvent,
    getSessionEvents,
    getPlayerMatchTotals,
    setStartingLineup,
    toggleLineup,
    setLineupPosition,
    removeFromLineup,
    setFormation,
    assignToSlot,
    savedFormations,
    saveFormation,
    deleteSavedFormation,
    startMatch,
    pauseMatch,
    resumeMatch,
    resetTeam,
    endMatch,
    putOnPitch,
    takeOffPitch,
    setStintPosition,
    getSessionStints,
    getPlayerPlayMs,
    playerStats,
    matchCallUps,
    globalRatio,
    activeTrainingsCount: activeTrainings.length,
    activeMatchesCount: activeMatches.length,
    syncStatus,
    lastSyncedAt,
    lastSyncError,
    refreshFromCloud,
    resetAll,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function migrateAttendances(list: Attendance[]): Attendance[] {
  return list.map((a) => {
    const status = a.status as string;
    if (status === 'absent') return { ...a, status: 'unexcused' };
    return a;
  });
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
