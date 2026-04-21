import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { db, SEED_PLAYERS } from '@/storage/database';
import { STATUS_META, DEFAULT_STATUS } from '@/constants/statuses';
import { uid } from '@/utils/id';
import { todayISO } from '@/utils/date';
import type {
  Attendance,
  AttendanceStatus,
  Player,
  PlayerStats,
  Session,
  SessionKind,
} from '@/types';

type DataContextValue = {
  loading: boolean;
  players: Player[];
  sessions: Session[];
  attendances: Attendance[];
  addPlayer: (name: string) => Promise<Player>;
  removePlayer: (id: string) => Promise<void>;
  renamePlayer: (id: string, name: string) => Promise<void>;
  createSession: (opts?: { kind?: SessionKind; label?: string; date?: string }) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  toggleCancelled: (sessionId: string) => Promise<void>;
  setAttendance: (sessionId: string, playerId: string, status: AttendanceStatus) => Promise<void>;
  bulkSetAttendance: (sessionId: string, status: AttendanceStatus) => Promise<void>;
  getStatus: (sessionId: string, playerId: string) => AttendanceStatus;
  getSessionAttendance: (sessionId: string) => Attendance[];
  playerStats: PlayerStats[];
  globalRatio: number;
  activeSessionsCount: number;
  resetAll: () => Promise<void>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);

  useEffect(() => {
    (async () => {
      const seeded = await db.wasSeeded();
      if (!seeded) {
        const seedPlayers: Player[] = SEED_PLAYERS.map((name) => ({
          id: uid(),
          name,
          createdAt: todayISO(),
        }));
        await db.savePlayers(seedPlayers);
        await db.markSeeded();
        setPlayers(seedPlayers);
        setSessions([]);
        setAttendances([]);
      } else {
        const [p, s, a] = await Promise.all([
          db.getPlayers(),
          db.getSessions(),
          db.getAttendances(),
        ]);
        setPlayers(p);
        setSessions(s);
        setAttendances(migrateAttendances(a));
      }
      setLoading(false);
    })();
  }, []);

  const addPlayer = useCallback(async (name: string) => {
    const player: Player = { id: uid(), name: name.trim(), createdAt: todayISO() };
    const next = [...players, player];
    setPlayers(next);
    await db.savePlayers(next);
    return player;
  }, [players]);

  const removePlayer = useCallback(async (id: string) => {
    const nextPlayers = players.filter((p) => p.id !== id);
    const nextAttendances = attendances.filter((a) => a.playerId !== id);
    setPlayers(nextPlayers);
    setAttendances(nextAttendances);
    await Promise.all([
      db.savePlayers(nextPlayers),
      db.saveAttendances(nextAttendances),
    ]);
  }, [players, attendances]);

  const renamePlayer = useCallback(async (id: string, name: string) => {
    const next = players.map((p) => (p.id === id ? { ...p, name: name.trim() } : p));
    setPlayers(next);
    await db.savePlayers(next);
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
    return session;
  }, [sessions]);

  const deleteSession = useCallback(async (id: string) => {
    const nextSessions = sessions.filter((s) => s.id !== id);
    const nextAttendances = attendances.filter((a) => a.sessionId !== id);
    setSessions(nextSessions);
    setAttendances(nextAttendances);
    await Promise.all([
      db.saveSessions(nextSessions),
      db.saveAttendances(nextAttendances),
    ]);
  }, [sessions, attendances]);

  const toggleCancelled = useCallback(async (sessionId: string) => {
    const next = sessions.map((s) =>
      s.id === sessionId ? { ...s, cancelled: !s.cancelled } : s,
    );
    setSessions(next);
    await db.saveSessions(next);
  }, [sessions]);

  const setAttendance = useCallback(async (sessionId: string, playerId: string, status: AttendanceStatus) => {
    const existingIndex = attendances.findIndex(
      (a) => a.sessionId === sessionId && a.playerId === playerId,
    );
    let next: Attendance[];
    if (existingIndex >= 0) {
      next = attendances.slice();
      next[existingIndex] = { sessionId, playerId, status };
    } else {
      next = [...attendances, { sessionId, playerId, status }];
    }
    setAttendances(next);
    await db.saveAttendances(next);
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
  }, [attendances, players]);

  const getStatus = useCallback((sessionId: string, playerId: string): AttendanceStatus => {
    const record = attendances.find((a) => a.sessionId === sessionId && a.playerId === playerId);
    return record ? record.status : DEFAULT_STATUS;
  }, [attendances]);

  const getSessionAttendance = useCallback((sessionId: string) => {
    return attendances.filter((a) => a.sessionId === sessionId);
  }, [attendances]);

  const activeSessions = useMemo(
    () => sessions.filter((s) => !s.cancelled),
    [sessions],
  );
  const activeSessionIds = useMemo(
    () => new Set(activeSessions.map((s) => s.id)),
    [activeSessions],
  );

  const playerStats = useMemo<PlayerStats[]>(() => {
    const totalSessions = activeSessions.length;
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
          if (!activeSessionIds.has(a.sessionId)) continue;
          counts[a.status] = (counts[a.status] ?? 0) + 1;
        }

        const totalPresent =
          counts.present + counts.sfc + counts.return;
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
  }, [players, activeSessions, activeSessionIds, attendances]);

  const globalRatio = useMemo(() => {
    if (activeSessions.length === 0 || players.length === 0) return 0;
    const possible = activeSessions.length * players.length;
    let present = 0;
    for (const a of attendances) {
      if (!activeSessionIds.has(a.sessionId)) continue;
      if (STATUS_META[a.status]?.countsPresent) present += 1;
    }
    return possible === 0 ? 0 : present / possible;
  }, [players, activeSessions, activeSessionIds, attendances]);

  const resetAll = useCallback(async () => {
    await db.resetAll();
    setPlayers([]);
    setSessions([]);
    setAttendances([]);
  }, []);

  const value: DataContextValue = {
    loading,
    players,
    sessions,
    attendances,
    addPlayer,
    removePlayer,
    renamePlayer,
    createSession,
    deleteSession,
    toggleCancelled,
    setAttendance,
    bulkSetAttendance,
    getStatus,
    getSessionAttendance,
    playerStats,
    globalRatio,
    activeSessionsCount: activeSessions.length,
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
