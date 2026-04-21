import type { Attendance, Player, Session } from '@/types';
import { formatShortDate } from './date';

const CODE: Record<string, string> = {
  present: 'P',
  sfc: 'SFC',
  return: 'RC',
  excused: 'AE',
  unexcused: 'AN',
  vacation: 'VAC',
  not_called: 'NC',
};

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

  const header = [
    'Joueur',
    ...sortedSessions.map((s) =>
      s.cancelled
        ? `${formatShortDate(s.date)} (annulée)`
        : formatShortDate(s.date),
    ),
    'Présent',
    'SFC',
    'RC',
    'Absent exc.',
    'Absent non exc.',
    'Vacances',
    'Non convoqué',
    'Activités',
    'Taux',
  ];
  const rows: string[][] = [header];

  const activeSessions = sortedSessions.filter((s) => !s.cancelled);

  for (const player of players) {
    const row: string[] = [player.name];
    const counts: Record<string, number> = {
      present: 0,
      sfc: 0,
      return: 0,
      excused: 0,
      unexcused: 0,
      vacation: 0,
      not_called: 0,
    };

    for (const session of sortedSessions) {
      if (session.cancelled) {
        row.push('—');
        continue;
      }
      const record = attendances.find(
        (a) => a.sessionId === session.id && a.playerId === player.id,
      );
      const status = record?.status ?? 'present';
      counts[status] = (counts[status] ?? 0) + 1;
      row.push(CODE[status] ?? '');
    }

    const totalPresent = counts.present + counts.sfc + counts.return;
    const ratio =
      activeSessions.length === 0 ? 0 : totalPresent / activeSessions.length;

    row.push(String(counts.present));
    row.push(String(counts.sfc));
    row.push(String(counts.return));
    row.push(String(counts.excused));
    row.push(String(counts.unexcused));
    row.push(String(counts.vacation));
    row.push(String(counts.not_called));
    row.push(String(activeSessions.length));
    row.push(`${Math.round(ratio * 100)}%`);
    rows.push(row);
  }

  return rows.map((r) => r.map(escape).join(',')).join('\n');
}
