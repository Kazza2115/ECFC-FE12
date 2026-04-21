export type Player = {
  id: string;
  name: string;
  createdAt: string;
};

export type Session = {
  id: string;
  date: string;
  label?: string;
  createdAt: string;
};

export type AttendanceStatus = 'present' | 'absent';

export type Attendance = {
  playerId: string;
  sessionId: string;
  status: AttendanceStatus;
};

export type PlayerStats = {
  player: Player;
  present: number;
  total: number;
  ratio: number;
};
