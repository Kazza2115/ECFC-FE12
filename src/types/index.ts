export type Player = {
  id: string;
  name: string;
  photoUri?: string;
  createdAt: string;
};

export type SessionKind = 'training' | 'match';

export type Session = {
  id: string;
  date: string;
  label?: string;
  kind?: SessionKind;
  cancelled?: boolean;
  startedAt?: string;
  endedAt?: string;
  startingLineup?: string[];
  createdAt: string;
};

export type AttendanceStatus =
  | 'present'
  | 'sfc'
  | 'return'
  | 'excused'
  | 'unexcused'
  | 'vacation'
  | 'not_called';

export type Attendance = {
  playerId: string;
  sessionId: string;
  status: AttendanceStatus;
};

export type PlayerStats = {
  player: Player;
  present: number;
  sfc: number;
  ret: number;
  excused: number;
  unexcused: number;
  vacation: number;
  notCalled: number;
  totalPresent: number;
  totalSessions: number;
  ratio: number;
};

export type MatchEventType =
  | 'goal'
  | 'assist'
  | 'key'
  | 'yellow'
  | 'red';

export type MatchEvent = {
  id: string;
  sessionId: string;
  playerId: string;
  type: MatchEventType;
  minute?: number;
  note?: string;
  createdAt: string;
};

export type PlayerMatchTotals = {
  goals: number;
  assists: number;
  key: number;
  yellow: number;
  red: number;
};

export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'ATT';

export type PlayerStint = {
  id: string;
  sessionId: string;
  playerId: string;
  position?: PlayerPosition;
  startAt: string;
  endAt?: string;
};
