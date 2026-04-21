import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { db, SEED_PLAYERS } from '@/storage/database';
import { uid } from '@/utils/id';
import { todayISO } from '@/utils/date';
import type {
  Attendance,
  AttendanceStatus,
  Player,
  PlayerStats,
  Session,
} from '@/types';

type DataContextValue = {
  loading: boolean;
  players: Player[];
  sessions: Session[];
  attendances: Attendance[];
  addPlayer: (name: string) => Promise<Player>;
  removePlayer: (id: string) => Promise<void>;
  renamePlayer: (id: string, name: string) => Promise<void>;
  createSession: (label?: string) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  setAttendance: (sessionId: string, playerId: string, status: AttendanceStatus) => Promise<void>;
  bulkSetAttendance: (sessionId: string, status: AttendanceStatus) => Promise<void>;
  getStatus: (sessionId: string, playerId: string) => AttendanceStatus;
  getSessionAttendance: (sessionId: string) => Attendance[];
  playerStats: PlayerStats[];
  globalRatio: number;
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
        setAttendances(a);
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

  const createSession = useCallback(async (label?: string) => {
    const session: Session = {
      id: uid(),
      date: todayISO(),
      label,
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
    return record ? record.status : 'absent';
  }, [attendances]);

  const getSessionAttendance = useCallback((sessionId: string) => {
    return attendances.filter((a) => a.sessionId === sessionId);
  }, [attendances]);

  const playerStats = useMemo<PlayerStats[]>(() => {
    const total = sessions.length;
    return players
      .map((player) => {
        const present = attendances.filter(
          (a) => a.playerId === player.id && a.status === 'present',
        ).length;
        const ratio = total === 0 ? 0 : present / total;
        return { player, present, total, ratio };
      })
      .sort((a, b) => b.ratio - a.ratio);
  }, [players, sessions, attendances]);

  const globalRatio = useMemo(() => {
    if (sessions.length === 0 || players.length === 0) return 0;
    const possible = sessions.length * players.length;
    const present = attendances.filter((a) => a.status === 'present').length;
    return possible === 0 ? 0 : present / possible;
  }, [players, sessions, attendances]);

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
    setAttendance,
    bulkSetAttendance,
    getStatus,
    getSessionAttendance,
    playerStats,
    globalRatio,
    resetAll,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
