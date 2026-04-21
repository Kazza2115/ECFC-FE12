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
    ...sortedSessions.map((s) => {
      const prefix = s.kind === 'match' ? '⚽ ' : '';
      const label = s.label ? ` ${s.label}` : '';
      const date = formatShortDate(s.date);
      const suffix = s.cancelled ? ' (annulée)' : '';
      return `${prefix}${date}${label}${suffix}`;
    }),
    'Présent',
    'SFC',
    'RC',
    'Absent exc.',
    'Absent non exc.',
    'Vacances',
    'Non convoqué',
    'Entraînements',
    'Taux entr.',
    'Matchs',
    'Convocations',
    'Taux conv.',
  ];
  const rows: string[][] = [header];

  const activeTrainings = sortedSessions.filter(
    (s) => !s.cancelled && s.kind !== 'match',
  );
  const activeMatches = sortedSessions.filter(
    (s) => !s.cancelled && s.kind === 'match',
  );
  const activeTrainingIds = new Set(activeTrainings.map((s) => s.id));
  const activeMatchIds = new Set(activeMatches.map((s) => s.id));

  for (const player of players) {
    const row: string[] = [player.name];
    const trainingCounts: Record<string, number> = {
      present: 0,
      sfc: 0,
      return: 0,
      excused: 0,
      unexcused: 0,
      vacation: 0,
      not_called: 0,
    };
    let matchCallUps = 0;

    for (const session of sortedSessions) {
      if (session.cancelled) {
        row.push('—');
        continue;
      }
      const record = attendances.find(
        (a) => a.sessionId === session.id && a.playerId === player.id,
      );
      const status =
        record?.status ?? (session.kind === 'match' ? 'not_called' : 'present');
      if (activeTrainingIds.has(session.id)) {
        trainingCounts[status] = (trainingCounts[status] ?? 0) + 1;
      } else if (activeMatchIds.has(session.id)) {
        if (status === 'present' || status === 'sfc' || status === 'return') {
          matchCallUps += 1;
        }
      }
      row.push(CODE[status] ?? '');
    }

    const totalPresent =
      trainingCounts.present + trainingCounts.sfc + trainingCounts.return;
    const trainingRatio =
      activeTrainings.length === 0
        ? 0
        : totalPresent / activeTrainings.length;
    const matchRatio =
      activeMatches.length === 0 ? 0 : matchCallUps / activeMatches.length;

    row.push(String(trainingCounts.present));
    row.push(String(trainingCounts.sfc));
    row.push(String(trainingCounts.return));
    row.push(String(trainingCounts.excused));
    row.push(String(trainingCounts.unexcused));
    row.push(String(trainingCounts.vacation));
    row.push(String(trainingCounts.not_called));
    row.push(String(activeTrainings.length));
    row.push(`${Math.round(trainingRatio * 100)}%`);
    row.push(String(activeMatches.length));
    row.push(String(matchCallUps));
    row.push(`${Math.round(matchRatio * 100)}%`);
    rows.push(row);
  }

  return rows.map((r) => r.map(escape).join(',')).join('\n');
}
