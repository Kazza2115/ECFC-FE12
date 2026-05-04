import { EVENT_META } from '@/constants/events';
import { POSITION_META } from '@/constants/positions';
import { STATUS_META } from '@/constants/statuses';
import { isMatchKind } from '@/types';
import type {
  Attendance,
  AttendanceStatus,
  MatchEvent,
  Player,
  PlayerStint,
  Session,
} from '@/types';
import { formatShortDate } from './date';

// Excel-friendly: semicolon delimiter so that French Excel opens the
// file with proper columns and the BOM (added by the caller) keeps
// accents intact.
const SEP = ';';
const NL = '\r\n';

const DAYS_LONG = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
];
const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

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

function blank(): string {
  return '';
}

function sectionHeader(label: string): string[] {
  // Two blank rows before, one bold-looking band of '#' to draw the
  // eye when scrolling in Excel.
  return ['', '', `## ${label.toUpperCase()}`];
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

function decimalMinutes(ms: number): string {
  // Locale-friendly decimal minutes for charts / sorting (comma decimal).
  if (ms <= 0) return '0';
  return (ms / 60000).toFixed(1).replace('.', ',');
}

function dayLabelLong(iso: string): string {
  return DAYS_LONG[new Date(iso).getDay()];
}

function dayLabelShort(iso: string): string {
  return DAYS_SHORT[new Date(iso).getDay()];
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

const QUARTER_DURATION_MS = 15 * 60 * 1000;

// Total play time for a player on a session, with the 7v7 quarter
// cap (each quarter capped at 15 min, anticipated for live stints).
function sumStintMs(
  stints: PlayerStint[],
  session: Session | undefined,
  fallbackEnd: number,
): number {
  const is7x7 = session?.kind === 'match_7x7';

  if (is7x7) {
    // Compute quarter starts on the fly so we can cap each stint at
    // qStart + 15min.
    const allSessionStints = stints; // already filtered to this session × player
    const quarterStarts = new Map<number, number>();
    // We can't see other players' stints from here — but quarter
    // start is the earliest stint within that quarter. We approximate
    // using the player's own first stint per quarter; any wider-team
    // start computation is the caller's problem. The hard cap below
    // is enough to anticipate the full 15 min credit.
    for (const st of allSessionStints) {
      if (!st.quarter) continue;
      const t = new Date(st.startAt).getTime();
      const cur = quarterStarts.get(st.quarter);
      if (cur === undefined || t < cur) quarterStarts.set(st.quarter, t);
    }
    let total = 0;
    for (const st of allSessionStints) {
      const start = new Date(st.startAt).getTime();
      let end = st.endAt ? new Date(st.endAt).getTime() : fallbackEnd;
      if (st.quarter) {
        const qStart = quarterStarts.get(st.quarter);
        if (qStart !== undefined) {
          const cap = qStart + QUARTER_DURATION_MS;
          if (!st.endAt) end = cap;
          else if (end > cap) end = cap;
        }
      }
      if (end > start) total += end - start;
    }
    return Math.max(0, total);
  }

  // 11v11: subtract paused intervals.
  const sessionPauseMs = pauseMs(session);
  let total = 0;
  for (const st of stints) {
    const start = new Date(st.startAt).getTime();
    const end = st.endAt ? new Date(st.endAt).getTime() : fallbackEnd;
    if (end > start) total += end - start;
  }
  return Math.max(0, total - sessionPauseMs);
}

// Short status code used inside the wide pivot grids.
function trainingShort(status: AttendanceStatus | undefined): string {
  if (!status) return 'Pr'; // default-on-create
  switch (status) {
    case 'present':
      return 'Pr';
    case 'sfc':
      return 'SFC';
    case 'return':
      return 'RC';
    case 'excused':
      return 'Exc';
    case 'unexcused':
      return 'Abs';
    case 'vacation':
      return 'Vac';
    case 'not_called':
      return 'NC';
  }
}

function matchShort(status: AttendanceStatus | undefined): string {
  if (!status) return '-';
  switch (status) {
    case 'present':
      return 'C'; // Convoqué
    case 'sfc':
      return 'SFC';
    case 'return':
      return 'RC';
    case 'excused':
      return 'Exc';
    case 'unexcused':
      return 'Abs';
    case 'vacation':
      return 'Vac';
    case 'not_called':
      return '-';
  }
}

function isCalledStatus(status: AttendanceStatus | undefined): boolean {
  return status === 'present' || status === 'sfc' || status === 'return';
}

function fmtPct(num: number, den: number): string {
  if (den === 0) return '-';
  return `${Math.round((num / den) * 100)}%`;
}

function periodLabel(sessions: Session[]): string {
  if (sessions.length === 0) return '—';
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  if (first.id === last.id) return formatShortDate(first.date);
  return `${formatShortDate(first.date)} → ${formatShortDate(last.date)}`;
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
    a.name.localeCompare(b.name, 'fr'),
  );

  // Pre-compute per-player stats once — re-used by the synthesis
  // section AND the team summary headlines.
  type AggCounts = Record<AttendanceStatus, number>;
  type PlayerAgg = {
    player: Player;
    counts: AggCounts;
    trainingPresent: number;
    trainingRatio: number;
    matchCalled: number;
    matchPlayed: number;
    matchRatio: number;
    totalMatchMs: number;
    avgMatchMs: number;
    events: { goal: number; assist: number; key: number; yellow: number; red: number };
  };

  const aggregates: PlayerAgg[] = sortedPlayers.map((player) => {
    const counts: AggCounts = {
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

    let matchCalled = 0;
    let matchPlayed = 0;
    let totalMatchMs = 0;
    for (const s of matchSessions) {
      const att = attendances.find(
        (a) => a.sessionId === s.id && a.playerId === player.id,
      );
      if (isCalledStatus(att?.status)) matchCalled += 1;

      const sStints = stints.filter(
        (st) => st.sessionId === s.id && st.playerId === player.id,
      );
      const endRef = s.endedAt
        ? new Date(s.endedAt).getTime()
        : s.startedAt
        ? new Date(s.startedAt).getTime()
        : 0;
      const ms = sumStintMs(sStints, s, endRef);
      if (ms > 0) {
        matchPlayed += 1;
        totalMatchMs += ms;
      }
    }
    const matchRatio =
      matchSessions.length === 0 ? 0 : matchCalled / matchSessions.length;
    const avgMatchMs = matchPlayed === 0 ? 0 : totalMatchMs / matchPlayed;

    const events = { goal: 0, assist: 0, key: 0, yellow: 0, red: 0 };
    for (const e of matchEvents) {
      if (e.playerId !== player.id) continue;
      if (!matchSessions.some((s) => s.id === e.sessionId)) continue;
      events[e.type] = (events[e.type] ?? 0) + 1;
    }

    return {
      player,
      counts,
      trainingPresent,
      trainingRatio,
      matchCalled,
      matchPlayed,
      matchRatio,
      totalMatchMs,
      avgMatchMs,
      events,
    };
  });

  // =======================================================================
  // En-tête
  // =======================================================================
  chunks.push(`# Étoile Carouge FC — Export saison`);
  chunks.push(row(['Généré le', formatShortDate(new Date().toISOString())]));
  chunks.push(row(['Période', periodLabel(sortedSessions)]));
  chunks.push(row(['Effectif', sortedPlayers.length]));
  chunks.push(row(['Entraînements actifs', trainingSessions.length]));
  chunks.push(row(['Matchs actifs', matchSessions.length]));

  // =======================================================================
  // Synthèse équipe — KPIs + top performers
  // =======================================================================
  chunks.push(...sectionHeader('Synthèse équipe'));

  const teamGoals = aggregates.reduce((acc, x) => acc + x.events.goal, 0);
  const teamAssists = aggregates.reduce((acc, x) => acc + x.events.assist, 0);
  const teamKeys = aggregates.reduce((acc, x) => acc + x.events.key, 0);
  const teamYellow = aggregates.reduce((acc, x) => acc + x.events.yellow, 0);
  const teamRed = aggregates.reduce((acc, x) => acc + x.events.red, 0);
  const teamMatchMs = aggregates.reduce((acc, x) => acc + x.totalMatchMs, 0);

  // Average ratios across players (skips empty when no sessions).
  const avgTraining =
    aggregates.length === 0
      ? 0
      : aggregates.reduce((a, x) => a + x.trainingRatio, 0) / aggregates.length;
  const avgMatchCall =
    aggregates.length === 0
      ? 0
      : aggregates.reduce((a, x) => a + x.matchRatio, 0) / aggregates.length;

  const topScorer = [...aggregates]
    .filter((x) => x.events.goal > 0)
    .sort((a, b) => b.events.goal - a.events.goal)[0];
  const topAssist = [...aggregates]
    .filter((x) => x.events.assist > 0)
    .sort((a, b) => b.events.assist - a.events.assist)[0];
  const topMinutes = [...aggregates]
    .filter((x) => x.totalMatchMs > 0)
    .sort((a, b) => b.totalMatchMs - a.totalMatchMs)[0];
  const topPresence = [...aggregates]
    .filter((x) => trainingSessions.length > 0)
    .sort((a, b) => b.trainingRatio - a.trainingRatio)[0];

  chunks.push(row(['Indicateur', 'Valeur']));
  chunks.push(row(['Taux d\'activité moyen (entraînements)', `${Math.round(avgTraining * 100)}%`]));
  chunks.push(row(['Taux de convocation moyen (matchs)', `${Math.round(avgMatchCall * 100)}%`]));
  chunks.push(row(['Buts marqués (saison)', teamGoals]));
  chunks.push(row(['Passes décisives (saison)', teamAssists]));
  chunks.push(row(['Moments clés (saison)', teamKeys]));
  chunks.push(row(['Cartons jaunes (saison)', teamYellow]));
  chunks.push(row(['Cartons rouges (saison)', teamRed]));
  chunks.push(row(['Temps de jeu cumulé (équipe)', formatDuration(teamMatchMs)]));
  chunks.push(
    row([
      'Meilleur buteur',
      topScorer
        ? `${topScorer.player.name} (${topScorer.events.goal} but${topScorer.events.goal > 1 ? 's' : ''})`
        : '—',
    ]),
  );
  chunks.push(
    row([
      'Meilleur passeur',
      topAssist
        ? `${topAssist.player.name} (${topAssist.events.assist} passe${topAssist.events.assist > 1 ? 's' : ''})`
        : '—',
    ]),
  );
  chunks.push(
    row([
      'Plus gros temps de jeu',
      topMinutes
        ? `${topMinutes.player.name} (${formatDuration(topMinutes.totalMatchMs)})`
        : '—',
    ]),
  );
  chunks.push(
    row([
      'Joueur le plus assidu',
      topPresence
        ? `${topPresence.player.name} (${Math.round(topPresence.trainingRatio * 100)}%)`
        : '—',
    ]),
  );

  // =======================================================================
  // Synthèse par joueur (saison)
  // =======================================================================
  chunks.push(...sectionHeader('Synthèse par joueur (saison)'));
  chunks.push(
    row([
      'Joueur',
      'Présent au club',
      'SFC',
      'Retour au club',
      'Absents excusés',
      'Absents non excusés',
      'Vacances',
      'Non convoqué',
      'Actifs',
      'Entraînements total',
      'Taux activité',
      'Matchs convoqués',
      'Matchs joués',
      'Matchs total',
      'Taux convocation',
      'Temps de jeu',
      'Temps de jeu (min)',
      'Moy. temps / match',
      'Buts',
      'Passes',
      'Moments clés',
      'Cartons jaunes',
      'Cartons rouges',
    ]),
  );

  // Sort by activity ratio desc — most engaged player surfaces first.
  const sortedAgg = [...aggregates].sort((a, b) => {
    if (b.trainingRatio !== a.trainingRatio)
      return b.trainingRatio - a.trainingRatio;
    return a.player.name.localeCompare(b.player.name, 'fr');
  });

  for (const agg of sortedAgg) {
    chunks.push(
      row([
        agg.player.name,
        agg.counts.present,
        agg.counts.sfc,
        agg.counts.return,
        agg.counts.excused,
        agg.counts.unexcused,
        agg.counts.vacation,
        agg.counts.not_called,
        agg.trainingPresent,
        trainingSessions.length,
        `${Math.round(agg.trainingRatio * 100)}%`,
        agg.matchCalled,
        agg.matchPlayed,
        matchSessions.length,
        `${Math.round(agg.matchRatio * 100)}%`,
        formatDuration(agg.totalMatchMs),
        decimalMinutes(agg.totalMatchMs),
        formatDuration(agg.avgMatchMs),
        agg.events.goal,
        agg.events.assist,
        agg.events.key,
        agg.events.yellow,
        agg.events.red,
      ]),
    );
  }

  // =======================================================================
  // Pivot — Présences entraînements (Joueur × Date)
  // =======================================================================
  chunks.push(...sectionHeader('Présences entraînements (matrice)'));
  chunks.push(
    row([
      'Légende',
      'Pr = Présent au club',
      'SFC = Suit la formation cantonale',
      'RC = Retour au club',
      'Exc = Absent excusé',
      'Abs = Absent non excusé',
      'Vac = Vacances',
      'NC = Non convoqué',
      '- = aucune saisie',
    ]),
  );

  const trainingHeader: Array<string | number> = ['Joueur'];
  for (const s of trainingSessions) {
    trainingHeader.push(`${dayLabelShort(s.date)} ${formatShortDate(s.date)}`);
  }
  trainingHeader.push('Actifs', 'Présents', 'Total', 'Taux activité');
  chunks.push(row(trainingHeader));

  for (const player of sortedPlayers) {
    const cells: Array<string | number> = [player.name];
    let present = 0;
    let active = 0;
    for (const s of trainingSessions) {
      const att = attendances.find(
        (a) => a.sessionId === s.id && a.playerId === player.id,
      );
      cells.push(trainingShort(att?.status));
      if (isCalledStatus(att?.status)) active += 1;
      if (att?.status === 'present') present += 1;
    }
    cells.push(active, present, trainingSessions.length, fmtPct(active, trainingSessions.length));
    chunks.push(row(cells));
  }

  // =======================================================================
  // Pivot — Convocations matchs (Joueur × Date)
  // =======================================================================
  chunks.push(...sectionHeader('Convocations matchs (matrice)'));
  chunks.push(
    row([
      'Légende',
      'C = Convoqué',
      'SFC = SFC',
      'RC = Retour au club',
      'Exc = Absent excusé',
      'Abs = Absent non excusé',
      'Vac = Vacances',
      '- = Non convoqué',
    ]),
  );

  const matchHeader: Array<string | number> = ['Joueur'];
  for (const s of matchSessions) {
    matchHeader.push(
      `${formatShortDate(s.date)} vs ${s.label ?? '?'}${s.kind === 'match_7x7' ? ' (7v7)' : ''}`,
    );
  }
  matchHeader.push('Convoqués', 'Joués', 'Total', 'Taux');
  chunks.push(row(matchHeader));

  for (const player of sortedPlayers) {
    const cells: Array<string | number> = [player.name];
    let called = 0;
    let played = 0;
    for (const s of matchSessions) {
      const att = attendances.find(
        (a) => a.sessionId === s.id && a.playerId === player.id,
      );
      cells.push(matchShort(att?.status));
      if (isCalledStatus(att?.status)) called += 1;
      const sStints = stints.filter(
        (st) => st.sessionId === s.id && st.playerId === player.id,
      );
      const endRef = s.endedAt
        ? new Date(s.endedAt).getTime()
        : s.startedAt
        ? new Date(s.startedAt).getTime()
        : 0;
      if (sumStintMs(sStints, s, endRef) > 0) played += 1;
    }
    cells.push(called, played, matchSessions.length, fmtPct(called, matchSessions.length));
    chunks.push(row(cells));
  }

  // =======================================================================
  // Matchs — Résumés
  // =======================================================================
  chunks.push(...sectionHeader('Matchs — Résumés'));
  chunks.push(
    row([
      'Date',
      'Jour',
      'Adversaire',
      'Format',
      'Statut',
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
    let effectiveMs = 0;
    if (s.kind === 'match_7x7') {
      // For 7v7 the duration is the sum of completed quarters × 15 min.
      const quartersPlayed = new Set<number>();
      for (const st of stints) {
        if (st.sessionId !== s.id || !st.quarter) continue;
        quartersPlayed.add(st.quarter);
      }
      effectiveMs = quartersPlayed.size * QUARTER_DURATION_MS;
    } else {
      const start = s.startedAt ? new Date(s.startedAt).getTime() : 0;
      const end = s.endedAt
        ? new Date(s.endedAt).getTime()
        : s.startedAt
        ? Date.now()
        : 0;
      effectiveMs =
        start && end > start ? Math.max(0, end - start - pauseMs(s)) : 0;
    }
    const status = s.endedAt
      ? 'Terminé'
      : s.startedAt
      ? 'En cours'
      : 'À venir';
    chunks.push(
      row([
        formatShortDate(s.date),
        dayLabelLong(s.date),
        s.label ?? '',
        s.kind === 'match_7x7' ? '7 vs 7' : '11 vs 11',
        status,
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
  // Matchs — Performances par joueur
  // =======================================================================
  chunks.push(...sectionHeader('Matchs — Performances par joueur'));
  chunks.push(
    row([
      'Date',
      'Adversaire',
      'Format',
      'Joueur',
      'Convoqué',
      'Titulaire',
      'Postes',
      'Temps joué',
      'Temps joué (min)',
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

    for (const player of sortedPlayers) {
      const att = attendances.find(
        (a) => a.sessionId === s.id && a.playerId === player.id,
      );
      const convoqué = isCalledStatus(att?.status);
      const hasStints = stints.some(
        (st) => st.sessionId === s.id && st.playerId === player.id,
      );
      const hasEvents = matchEvents.some(
        (e) => e.sessionId === s.id && e.playerId === player.id,
      );
      if (!convoqué && !hasStints && !hasEvents) continue;

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
      const timeMs = sumStintMs(pStints, s, endRef);

      const evCounts = { goal: 0, assist: 0, key: 0, yellow: 0, red: 0 };
      for (const e of matchEvents) {
        if (e.sessionId !== s.id || e.playerId !== player.id) continue;
        evCounts[e.type] = (evCounts[e.type] ?? 0) + 1;
      }

      chunks.push(
        row([
          formatShortDate(s.date),
          s.label ?? '',
          s.kind === 'match_7x7' ? '7 vs 7' : '11 vs 11',
          player.name,
          convoqué ? 'Oui' : 'Non',
          titulaire ? 'Oui' : 'Non',
          positions,
          formatDuration(timeMs),
          decimalMinutes(timeMs),
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
  // Matchs — Chronologie évènements
  // =======================================================================
  chunks.push(...sectionHeader('Matchs — Chronologie évènements'));
  chunks.push(
    row(['Date', 'Adversaire', 'Minute', 'Joueur', 'Évènement', 'Note']),
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
        e.note ?? '',
      ]),
    );
  }

  // =======================================================================
  // Matchs — Temps de jeu détaillé (intervalles)
  // =======================================================================
  chunks.push(...sectionHeader('Matchs — Temps de jeu par intervalle'));
  chunks.push(
    row([
      'Date',
      'Adversaire',
      'Format',
      'Quart',
      'Joueur',
      'Poste',
      'Entrée',
      'Sortie',
      'Durée',
      'Durée (min)',
    ]),
  );
  const sortedStints = [...stints].sort((a, b) => {
    const sa = matchSessions.find((x) => x.id === a.sessionId);
    const sb = matchSessions.find((x) => x.id === b.sessionId);
    if (sa && sb && sa.id !== sb.id) {
      return (
        new Date(sa.date).getTime() - new Date(sb.date).getTime()
      );
    }
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });
  for (const st of sortedStints) {
    const s = matchSessions.find((x) => x.id === st.sessionId);
    if (!s) continue;
    const player = players.find((p) => p.id === st.playerId);
    const endRef = st.endAt
      ? new Date(st.endAt).getTime()
      : s.endedAt
      ? new Date(s.endedAt).getTime()
      : Date.now();
    let durMs = endRef - new Date(st.startAt).getTime();
    if (s.kind === 'match_7x7' && st.quarter) {
      // Cap by the 15 min quarter window.
      const qStarts = new Map<number, number>();
      for (const x of stints) {
        if (x.sessionId !== s.id || !x.quarter) continue;
        const t = new Date(x.startAt).getTime();
        const cur = qStarts.get(x.quarter);
        if (cur === undefined || t < cur) qStarts.set(x.quarter, t);
      }
      const qStart = qStarts.get(st.quarter);
      if (qStart !== undefined) {
        const cap = qStart + QUARTER_DURATION_MS;
        const effEnd = Math.min(endRef, cap);
        durMs = effEnd - new Date(st.startAt).getTime();
      }
    } else {
      durMs -= pauseMs(s);
    }
    durMs = Math.max(0, durMs);
    chunks.push(
      row([
        formatShortDate(s.date),
        s.label ?? '',
        s.kind === 'match_7x7' ? '7 vs 7' : '11 vs 11',
        st.quarter ?? '',
        player?.name ?? '',
        st.position ? POSITION_META[st.position].short : '',
        formatTime(st.startAt),
        formatTime(st.endAt),
        formatDuration(durMs),
        decimalMinutes(durMs),
      ]),
    );
  }

  return chunks.join(NL);
}
