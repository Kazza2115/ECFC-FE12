export type Player = {
  id: string;
  name: string;
  createdAt: string;
};

export type SessionKind = 'training' | 'match';

export type Session = {
  id: string;
  date: string;
  label?: string;
  kind?: SessionKind;
  cancelled?: boolean;
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
