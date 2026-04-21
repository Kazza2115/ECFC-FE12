import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { db, SEED_PLAYERS } from '@/storage/database';
import { remote } from '@/storage/remote';
import {
  STATUS_META,
  defaultStatusFor,
} from '@/constants/statuses';
import { uid } from '@/utils/id';
import { todayISO } from '@/utils/date';
import type {
  Attendance,
  AttendanceStatus,
  MatchEvent,
  MatchEventType,
  Player,
  PlayerMatchTotals,
  PlayerStats,
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
  addPlayer: (name: string) => Promise<Player>;
  removePlayer: (id: string) => Promise<void>;
  renamePlayer: (id: string, name: string) => Promise<void>;
  setPlayerPhoto: (id: string, photoUri: string | undefined) => Promise<void>;
  createSession: (opts?: { kind?: SessionKind; label?: string; date?: string }) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  toggleCancelled: (sessionId: string) => Promise<void>;
  setAttendance: (sessionId: string, playerId: string, status: AttendanceStatus) => Promise<void>;
  bulkSetAttendance: (sessionId: string, status: AttendanceStatus) => Promise<void>;
  getStatus: (sessionId: string, playerId: string) => AttendanceStatus;
  getSessionAttendance: (sessionId: string) => Attendance[];
  addMatchEvent: (sessionId: string, playerId: string, type: MatchEventType) => Promise<MatchEvent>;
  removeMatchEvent: (id: string) => Promise<void>;
  getSessionEvents: (sessionId: string) => MatchEvent[];
  getPlayerMatchTotals: (playerId: string, sessionId?: string) => PlayerMatchTotals;
  playerStats: PlayerStats[];
  matchCallUps: MatchCallUp[];
  globalRatio: number;
  activeTrainingsCount: number;
  activeMatchesCount: number;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  refreshFromCloud: () => Promise<void>;
  resetAll: () => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

function isMatch(s: Session): boolean {
  return s.kind === 'match';
}

function isTraining(s: Session): boolean {
  return s.kind !== 'match';
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const warn = (context: string, err: unknown) => {
    if (typeof console !== 'undefined') {
      console.warn(`[sync:${context}]`, err);
    }
  };

  const markSynced = () => {
    setSyncStatus('synced');
    setLastSyncedAt(new Date().toISOString());
  };

  useEffect(() => {
    (async () => {
      const [
        cachedPlayers,
        cachedSessions,
        cachedAttendances,
        cachedEvents,
        seeded,
      ] = await Promise.all([
        db.getPlayers(),
        db.getSessions(),
        db.getAttendances(),
        db.getMatchEvents(),
        db.wasSeeded(),
      ]);

      setPlayers(cachedPlayers);
      setSessions(cachedSessions);
      setAttendances(migrateAttendances(cachedAttendances));
      setMatchEvents(cachedEvents);
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
          await Promise.all([
            db.savePlayers(snap.players),
            db.saveSessions(snap.sessions),
            db.saveAttendances(snap.attendances),
            db.saveMatchEvents(snap.matchEvents),
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
        setSyncStatus('offline');
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
      await Promise.all([
        db.savePlayers(snap.players),
        db.saveSessions(snap.sessions),
        db.saveAttendances(snap.attendances),
        db.saveMatchEvents(snap.matchEvents),
      ]);
      markSynced();
    } catch (err) {
      warn('refresh', err);
      setSyncStatus('offline');
    }
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
      setSyncStatus('offline');
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
    setPlayers(nextPlayers);
    setAttendances(nextAttendances);
    setMatchEvents(nextEvents);
    await Promise.all([
      db.savePlayers(nextPlayers),
      db.saveAttendances(nextAttendances),
      db.saveMatchEvents(nextEvents),
    ]);
    await pushSafe('deletePlayer', async () => {
      await remote.deleteAttendancesForPlayer(id);
      try {
        await remote.deleteMatchEventsForPlayer(id);
      } catch (err) {
        warn('deleteMatchEventsForPlayer', err);
      }
      await remote.deletePlayer(id);
      try {
        await remote.deletePhoto(id);
      } catch {}
    });
  }, [players, attendances, matchEvents]);

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
        setSyncStatus('offline');
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
    setSessions(nextSessions);
    setAttendances(nextAttendances);
    setMatchEvents(nextEvents);
    await Promise.all([
      db.saveSessions(nextSessions),
      db.saveAttendances(nextAttendances),
      db.saveMatchEvents(nextEvents),
    ]);
    await pushSafe('deleteSession', async () => {
      await remote.deleteAttendancesForSession(id);
      try {
        await remote.deleteMatchEventsForSession(id);
      } catch (err) {
        warn('deleteMatchEventsForSession', err);
      }
      await remote.deleteSession(id);
    });
  }, [sessions, attendances, matchEvents]);

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

  const resetAll = useCallback(async () => {
    await db.resetAll();
    setPlayers([]);
    setSessions([]);
    setAttendances([]);
    setMatchEvents([]);
  }, []);

  const value: DataContextValue = {
    loading,
    players,
    sessions,
    attendances,
    matchEvents,
    addPlayer,
    removePlayer,
    renamePlayer,
    setPlayerPhoto,
    createSession,
    deleteSession,
    toggleCancelled,
    setAttendance,
    bulkSetAttendance,
    getStatus,
    getSessionAttendance,
    addMatchEvent,
    removeMatchEvent,
    getSessionEvents,
    getPlayerMatchTotals,
    playerStats,
    matchCallUps,
    globalRatio,
    activeTrainingsCount: activeTrainings.length,
    activeMatchesCount: activeMatches.length,
    syncStatus,
    lastSyncedAt,
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
