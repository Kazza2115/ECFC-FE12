import { EVENT_META } from '@/constants/events';
import { POSITION_META } from '@/constants/positions';
import { STATUS_META } from '@/constants/statuses';
import { isMatchKind } from '@/types';
import type {
  Attendance,
  MatchEvent,
  Player,
  PlayerStint,
  Session,
} from '@/types';
import { formatShortDate } from './date';

const SEP = ';';

const DAYS = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
];

function escape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[";\n,\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(values: Array<string | number | null | undefined>): string {
  return values.map(escape).join(SEP);
}

function formatTime(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0min';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}min`;
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}

function dayLabel(iso: string): string {
  return DAYS[new Date(iso).getDay()];
}

function trainingLabel(status: Attendance['status']): string {
  return STATUS_META[status]?.label ?? String(status);
}

function eventLabel(type: MatchEvent['type']): string {
  return EVENT_META[type]?.label ?? String(type);
}

function pauseMs(session: Session | undefined): number {
  if (!session?.pauseIntervals) return 0;
  let total = 0;
  for (const p of session.pauseIntervals) {
    const start = new Date(p.start).getTime();
    const end = p.end
      ? new Date(p.end).getTime()
      : session.endedAt
      ? new Date(session.endedAt).getTime()
      : start;
    if (end > start) total += end - start;
  }
  return total;
}

function sumStintMs(
  stints: PlayerStint[],
  sessionPauseMs: number,
  fallbackEnd: number,
): number {
  let total = 0;
  for (const st of stints) {
    const start = new Date(st.startAt).getTime();
    const end = st.endAt ? new Date(st.endAt).getTime() : fallbackEnd;
    if (end > start) total += end - start;
  }
  return Math.max(0, total - sessionPauseMs);
}

export function buildAttendanceCSV(
  players: Player[],
  sessions: Session[],
  attendances: Attendance[],
  matchEvents: MatchEvent[] = [],
  stints: PlayerStint[] = [],
): string {
  const chunks: string[] = [];

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const trainingSessions = sortedSessions.filter(
    (s) => !s.cancelled && !isMatchKind(s.kind),
  );
  const matchSessions = sortedSessions.filter(
    (s) => !s.cancelled && isMatchKind(s.kind),
  );
  const sortedPlayers = [...players].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  // =======================================================================
  // Section 1 — Synthèse par joueur (saison)
  // =======================================================================
  chunks.push('# Export ECFC — ' + formatShortDate(new Date().toISOString()));
  chunks.push('');
  chunks.push('## Synthèse par joueur (saison)');
  chunks.push(
    row([
      'Joueur',
      'Présents',
      'SFC',
      'Retour club',
      'Absents excusés',
      'Absents non excusés',
      'Vacances',
      'Non convoqué',
      'Entraînements joués',
      'Entraînements total',
      'Taux présence',
      'Matchs convoqués',
      'Matchs total',
      'Taux convocation',
      'Temps total match',
      'Buts',
      'Passes décisives',
      'Moments clés',
      'Cartons jaunes',
      'Cartons rouges',
    ]),
  );

  for (const player of sortedPlayers) {
    const counts: Record<Attendance['status'], number> = {
      present: 0,
      sfc: 0,
      return: 0,
      excused: 0,
      unexcused: 0,
      vacation: 0,
      not_called: 0,
    };
    for (const a of attendances) {
      if (a.playerId !== player.id) continue;
      const isTraining = trainingSessions.some((s) => s.id === a.sessionId);
      if (!isTraining) continue;
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    const trainingPresent = counts.present + counts.sfc + counts.return;
    const trainingRatio =
      trainingSessions.length === 0
        ? 0
        : trainingPresent / trainingSessions.length;

    // Match call-ups
    let matchCalled = 0;
    for (const s of matchSessions) {
      const att = attendances.find(
        (a) => a.sessionId === s.id && a.playerId === player.id,
      );
      if (
        att &&
        (att.status === 'present' ||
          att.status === 'sfc' ||
          att.status === 'return')
      ) {
        matchCalled += 1;
      }
    }
    const matchRatio =
      matchSessions.length === 0 ? 0 : matchCalled / matchSessions.length;

    // Match time + events
    let totalMatchMs = 0;
    const evCounts = { goal: 0, assist: 0, key: 0, yellow: 0, red: 0 };
    for (const s of matchSessions) {
      const sStints = stints.filter(
        (st) => st.sessionId === s.id && st.playerId === player.id,
      );
      const endRef = s.endedAt
        ? new Date(s.endedAt).getTime()
        : s.startedAt
        ? new Date(s.startedAt).getTime()
        : 0;
      totalMatchMs += sumStintMs(sStints, pauseMs(s), endRef);
    }
    for (const e of matchEvents) {
      if (e.playerId !== player.id) continue;
      const isMatch = matchSessions.some((s) => s.id === e.sessionId);
      if (!isMatch) continue;
      evCounts[e.type] = (evCounts[e.type] ?? 0) + 1;
    }

    chunks.push(
      row([
        player.name,
        counts.present,
        counts.sfc,
        counts.return,
        counts.excused,
        counts.unexcused,
        counts.vacation,
        counts.not_called,
        trainingPresent,
        trainingSessions.length,
        `${Math.round(trainingRatio * 100)}%`,
        matchCalled,
        matchSessions.length,
        `${Math.round(matchRatio * 100)}%`,
        formatDuration(totalMatchMs),
        evCounts.goal,
        evCounts.assist,
        evCounts.key,
        evCounts.yellow,
        evCounts.red,
      ]),
    );
  }

  // =======================================================================
  // Section 2 — Entraînements (présences par joueur × séance)
  // =======================================================================
  chunks.push('');
  chunks.push('');
  chunks.push('## Entraînements — Présences détaillées');
  chunks.push(row(['Date', 'Jour', 'Joueur', 'Statut']));
  for (const s of trainingSessions) {
    for (const player of sortedPlayers) {
      const att = attendances.find(
        (a) => a.sessionId === s.id && a.playerId === player.id,
      );
      chunks.push(
        row([
          formatShortDate(s.date),
          dayLabel(s.date),
          player.name,
          att ? trainingLabel(att.status) : 'Présent (défaut)',
        ]),
      );
    }
  }

  // =======================================================================
  // Section 3 — Matchs résumés
  // =======================================================================
  chunks.push('');
  chunks.push('');
  chunks.push('## Matchs — Résumés');
  chunks.push(
    row([
      'Date',
      'Adversaire',
      'Formation',
      'Début',
      'Fin',
      'Durée effective',
      'Convoqués',
      'Buts',
      'Passes',
      'Moments clés',
      'Cartons jaunes',
      'Cartons rouges',
    ]),
  );
  for (const s of matchSessions) {
    const called = attendances.filter(
      (a) =>
        a.sessionId === s.id &&
        (a.status === 'present' ||
          a.status === 'sfc' ||
          a.status === 'return'),
    ).length;
    const evCounts = { goal: 0, assist: 0, key: 0, yellow: 0, red: 0 };
    for (const e of matchEvents) {
      if (e.sessionId !== s.id) continue;
      evCounts[e.type] = (evCounts[e.type] ?? 0) + 1;
    }
    const start = s.startedAt ? new Date(s.startedAt).getTime() : 0;
    const end = s.endedAt
      ? new Date(s.endedAt).getTime()
      : s.startedAt
      ? Date.now()
      : 0;
    const effectiveMs =
      start && end > start ? Math.max(0, end - start - pauseMs(s)) : 0;
    chunks.push(
      row([
        formatShortDate(s.date),
        s.label ?? '',
        s.formation ?? '',
        formatTime(s.startedAt),
        formatTime(s.endedAt),
        formatDuration(effectiveMs),
        called,
        evCounts.goal,
        evCounts.assist,
        evCounts.key,
        evCounts.yellow,
        evCounts.red,
      ]),
    );
  }

  // =======================================================================
  // Section 4 — Matchs performances (joueur × match)
  // =======================================================================
  chunks.push('');
  chunks.push('');
  chunks.push('## Matchs — Performances par joueur');
  chunks.push(
    row([
      'Date',
      'Adversaire',
      'Joueur',
      'Convoqué',
      'Titulaire',
      'Postes',
      'Temps joué',
      'Buts',
      'Passes',
      'Moments',
      'Jaunes',
      'Rouges',
    ]),
  );
  for (const s of matchSessions) {
    const endRef = s.endedAt
      ? new Date(s.endedAt).getTime()
      : s.startedAt
      ? Date.now()
      : 0;
    const sPauseMs = pauseMs(s);

    for (const player of sortedPlayers) {
      const att = attendances.find(
        (a) => a.sessionId === s.id && a.playerId === player.id,
      );
      const convoqué =
        att?.status === 'present' ||
        att?.status === 'sfc' ||
        att?.status === 'return';
      if (!convoqué && !stints.some(
        (st) => st.sessionId === s.id && st.playerId === player.id,
      )) {
        // Skip players who have no involvement in this match.
        continue;
      }

      const pStints = stints.filter(
        (st) => st.sessionId === s.id && st.playerId === player.id,
      );
      const titulaire = (s.startingLineup ?? []).includes(player.id);
      const positions = Array.from(
        new Set(
          pStints
            .map((st) => st.position)
            .filter((p): p is NonNullable<typeof p> => !!p)
            .map((p) => POSITION_META[p].short),
        ),
      ).join(' + ');
      const timeMs = sumStintMs(pStints, sPauseMs, endRef);

      const evCounts = { goal: 0, assist: 0, key: 0, yellow: 0, red: 0 };
      for (const e of matchEvents) {
        if (e.sessionId !== s.id || e.playerId !== player.id) continue;
        evCounts[e.type] = (evCounts[e.type] ?? 0) + 1;
      }

      chunks.push(
        row([
          formatShortDate(s.date),
          s.label ?? '',
          player.name,
          convoqué ? 'Oui' : 'Non',
          titulaire ? 'Oui' : 'Non',
          positions,
          timeMs > 0 ? formatDuration(timeMs) : '0min',
          evCounts.goal,
          evCounts.assist,
          evCounts.key,
          evCounts.yellow,
          evCounts.red,
        ]),
      );
    }
  }

  // =======================================================================
  // Section 5 — Événements (chronologie)
  // =======================================================================
  chunks.push('');
  chunks.push('');
  chunks.push('## Matchs — Chronologie des évènements');
  chunks.push(
    row(['Date', 'Adversaire', 'Minute', 'Joueur', 'Type']),
  );
  const sortedEvents = [...matchEvents].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  for (const e of sortedEvents) {
    const s = matchSessions.find((x) => x.id === e.sessionId);
    if (!s) continue;
    const player = players.find((p) => p.id === e.playerId);
    const minute =
      s.startedAt && e.createdAt
        ? Math.max(
            0,
            Math.floor(
              (new Date(e.createdAt).getTime() -
                new Date(s.startedAt).getTime()) /
                60000,
            ),
          )
        : '';
    chunks.push(
      row([
        formatShortDate(s.date),
        s.label ?? '',
        minute === '' ? '' : `${minute}'`,
        player?.name ?? '',
        eventLabel(e.type),
      ]),
    );
  }

  // =======================================================================
  // Section 6 — Stints (temps de jeu détaillé)
  // =======================================================================
  chunks.push('');
  chunks.push('');
  chunks.push('## Matchs — Temps de jeu par intervalle');
  chunks.push(
    row([
      'Date',
      'Adversaire',
      'Joueur',
      'Poste',
      'Entrée',
      'Sortie',
      'Durée',
    ]),
  );
  const sortedStints = [...stints].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  for (const st of sortedStints) {
    const s = matchSessions.find((x) => x.id === st.sessionId);
    if (!s) continue;
    const player = players.find((p) => p.id === st.playerId);
    const endRef = st.endAt
      ? new Date(st.endAt).getTime()
      : s.endedAt
      ? new Date(s.endedAt).getTime()
      : Date.now();
    const durMs =
      endRef - new Date(st.startAt).getTime() - pauseMs(s);
    chunks.push(
      row([
        formatShortDate(s.date),
        s.label ?? '',
        player?.name ?? '',
        st.position ? POSITION_META[st.position].short : '',
        formatTime(st.startAt),
        formatTime(st.endAt),
        formatDuration(durMs),
      ]),
    );
  }

  return chunks.join('\n');
}
