import type { Attendance, Player, Session } from '@/types';
import { formatShortDate } from './date';

function escape(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildAttendanceCSV(
  players: Player[],
  sessions: Session[],
  attendances: Attendance[],
): string {
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const header = ['Joueur', ...sortedSessions.map((s) => formatShortDate(s.date)), 'Total', '%'];
  const rows: string[][] = [header];

  for (const player of players) {
    const row: string[] = [player.name];
    let present = 0;
    for (const session of sortedSessions) {
      const record = attendances.find(
        (a) => a.sessionId === session.id && a.playerId === player.id,
      );
      const isPresent = record?.status === 'present';
      if (isPresent) present += 1;
      row.push(isPresent ? 'P' : 'A');
    }
    const ratio = sortedSessions.length === 0 ? 0 : present / sortedSessions.length;
    row.push(String(present));
    row.push(`${Math.round(ratio * 100)}%`);
    rows.push(row);
  }

  return rows.map((r) => r.map(escape).join(',')).join('\n');
}
