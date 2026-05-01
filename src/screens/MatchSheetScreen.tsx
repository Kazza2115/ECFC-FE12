import React, { useLayoutEffect, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { EVENT_META } from '@/constants/events';
import { POSITION_META } from '@/constants/positions';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';
import { formatLongDate } from '@/utils/date';
import type { MatchEvent, PlayerPosition, PlayerStint } from '@/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchSheet'>;

function formatMinutes(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return `${m}min${s > 0 ? ` ${s.toString().padStart(2, '0')}s` : ''}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

export function MatchSheetScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const {
    sessions,
    players,
    getSessionEvents,
    getSessionStints,
    getPlayerMatchTotals,
    getPlayerPlayMs,
  } = useData();
  const styles = useThemedStyles(makeStyles);

  const session = sessions.find((s) => s.id === sessionId);
  const events = useMemo(
    () => getSessionEvents(sessionId),
    [getSessionEvents, sessionId],
  );
  const stints = useMemo(
    () => getSessionStints(sessionId),
    [getSessionStints, sessionId],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: session ? `Feuille · ${session.label ?? 'Match'}` : 'Feuille',
    });
  }, [navigation, session]);

  const nowMs = session?.endedAt
    ? new Date(session.endedAt).getTime()
    : Date.now();

  const lineupPositions = session?.lineupPositions ?? {};
  const startingLineup = session?.startingLineup ?? [];

  const participantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const st of stints) ids.add(st.playerId);
    for (const id of startingLineup) ids.add(id);
    for (const e of events) ids.add(e.playerId);
    return ids;
  }, [stints, startingLineup, events]);

  const participants = useMemo(() => {
    return players
      .filter((p) => participantIds.has(p.id))
      .map((p) => {
        const ms = getPlayerPlayMs(p.id, sessionId, nowMs);
        const totals = getPlayerMatchTotals(p.id, sessionId);
        const playerStints = stints.filter((st) => st.playerId === p.id);
        const positionUsed = playerStints
          .map((st) => st.position)
          .filter((x): x is PlayerPosition => !!x);
        const uniquePositions = Array.from(new Set(positionUsed));
        return {
          player: p,
          ms,
          totals,
          positions: uniquePositions,
          wasStarter: startingLineup.includes(p.id),
        };
      })
      .sort((a, b) => b.ms - a.ms);
  }, [
    players,
    participantIds,
    getPlayerPlayMs,
    sessionId,
    nowMs,
    getPlayerMatchTotals,
    stints,
    startingLineup,
  ]);

  const eventAggregate = useMemo(() => {
    const totals = { goal: 0, assist: 0, key: 0, yellow: 0, red: 0 };
    for (const e of events) totals[e.type] = (totals[e.type] ?? 0) + 1;
    return totals;
  }, [events]);

  const QUARTER_DURATION_MS = 15 * 60 * 1000;

  const quarterStarts = useMemo(() => {
    const map = new Map<number, number>();
    if (session?.kind !== 'match_7x7') return map;
    for (const st of stints) {
      if (st.sessionId !== sessionId || !st.quarter) continue;
      const t = new Date(st.startAt).getTime();
      const cur = map.get(st.quarter);
      if (cur === undefined || t < cur) map.set(st.quarter, t);
    }
    return map;
  }, [stints, session?.kind, sessionId]);

  // For 7v7, the match duration is the sum of completed quarter
  // durations (15 min each), not the wall-clock between started_at
  // and ended_at. A quarter is "played" if at least one stint exists
  // with that quarter number.
  const matchDurationMs = (() => {
    if (session?.kind === 'match_7x7') {
      const quartersPlayed = new Set<number>();
      for (const st of stints) {
        if (st.sessionId !== sessionId || !st.quarter) continue;
        quartersPlayed.add(st.quarter);
      }
      return quartersPlayed.size * QUARTER_DURATION_MS;
    }
    if (session?.startedAt && session?.endedAt) {
      return (
        new Date(session.endedAt).getTime() -
        new Date(session.startedAt).getTime()
      );
    }
    if (session?.startedAt) {
      return Date.now() - new Date(session.startedAt).getTime();
    }
    return 0;
  })();

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>Match introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.header}>
          <Text style={styles.date}>{formatLongDate(session.date)}</Text>
          <Text style={styles.title}>
            {session.label ? `vs ${session.label}` : 'Match'}
          </Text>
          <View style={styles.headerMetaRow}>
            <MetaChip
              label="Durée"
              value={matchDurationMs > 0 ? formatMinutes(matchDurationMs) : '—'}
            />
            <MetaChip
              label="Convoqués"
              value={String(participants.length)}
            />
            <MetaChip
              label="Démarré"
              value={session.startedAt ? formatTime(session.startedAt) : 'Non'}
            />
          </View>
        </Card>

        {events.length > 0 ||
        eventAggregate.yellow + eventAggregate.red > 0 ? (
          <View style={styles.eventTotalsRow}>
            <EventTotal type="goal" value={eventAggregate.goal} />
            <EventTotal type="assist" value={eventAggregate.assist} />
            <EventTotal type="key" value={eventAggregate.key} />
            <EventTotal type="yellow" value={eventAggregate.yellow} />
            <EventTotal type="red" value={eventAggregate.red} />
          </View>
        ) : null}

        {participants.length === 0 ? (
          <Card>
            <EmptyState
              title="Pas encore de données"
              description="Aucun titulaire, aucun évènement n'a été enregistré pour ce match."
            />
          </Card>
        ) : (
          <>
            <Text style={styles.sectionHeader}>Joueurs</Text>
            <Card padded={false}>
              {participants.map((p, index) => (
                <View
                  key={p.player.id}
                  style={[
                    styles.playerRow,
                    index < participants.length - 1 && styles.rowDivider,
                  ]}
                >
                  <Avatar
                    name={p.player.name}
                    photoUri={p.player.photoUri}
                    size={44}
                  />
                  <View style={styles.playerInfo}>
                    <View style={styles.playerTopRow}>
                      <Text style={styles.playerName} numberOfLines={1}>
                        {p.player.name}
                      </Text>
                      <Text style={styles.playerTime}>
                        {p.ms > 0 ? formatMinutes(p.ms) : '—'}
                      </Text>
                    </View>
                    <View style={styles.playerSubRow}>
                      {p.wasStarter ? (
                        <View style={styles.starterPill}>
                          <Text style={styles.starterLabel}>Titulaire</Text>
                        </View>
                      ) : null}
                      {p.positions.map((pos) => {
                        const meta = POSITION_META[pos];
                        return (
                          <View
                            key={pos}
                            style={[
                              styles.positionPill,
                              { backgroundColor: meta.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.positionLabel,
                                { color: meta.color },
                              ]}
                            >
                              {meta.short}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    {hasAnyEvent(p.totals) ? (
                      <View style={styles.eventMiniRow}>
                        {p.totals.goals > 0 ? (
                          <MiniEvent
                            glyph={EVENT_META.goal.glyph}
                            color={EVENT_META.goal.color}
                            value={p.totals.goals}
                          />
                        ) : null}
                        {p.totals.assists > 0 ? (
                          <MiniEvent
                            glyph={EVENT_META.assist.glyph}
                            color={EVENT_META.assist.color}
                            value={p.totals.assists}
                          />
                        ) : null}
                        {p.totals.key > 0 ? (
                          <MiniEvent
                            glyph={EVENT_META.key.glyph}
                            color={EVENT_META.key.color}
                            value={p.totals.key}
                          />
                        ) : null}
                        {p.totals.yellow > 0 ? (
                          <MiniEvent
                            glyph={EVENT_META.yellow.glyph}
                            color={EVENT_META.yellow.color}
                            value={p.totals.yellow}
                          />
                        ) : null}
                        {p.totals.red > 0 ? (
                          <MiniEvent
                            glyph={EVENT_META.red.glyph}
                            color={EVENT_META.red.color}
                            value={p.totals.red}
                          />
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {events.length > 0 ? (
          <>
            <Text style={styles.sectionHeader}>Chronologie</Text>
            <Card padded={false}>
              {[...events]
                .sort(
                  (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime(),
                )
                .map((ev, index, arr) => (
                  <TimelineRow
                    key={ev.id}
                    event={ev}
                    players={players}
                    last={index === arr.length - 1}
                    start={session.startedAt}
                  />
                ))}
            </Card>
          </>
        ) : null}

        {stints.length > 0 ? (
          <>
            <Text style={styles.sectionHeader}>Temps de jeu</Text>
            <Card padded={false}>
              {stints
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.startAt).getTime() -
                    new Date(b.startAt).getTime(),
                )
                .map((st, index, arr) => (
                  <StintRow
                    key={st.id}
                    stint={st}
                    players={players}
                    last={index === arr.length - 1}
                    nowMs={nowMs}
                    is7x7={session.kind === 'match_7x7'}
                    quarterStarts={
                      session.kind === 'match_7x7' ? quarterStarts : undefined
                    }
                  />
                ))}
            </Card>
          </>
        ) : null}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function hasAnyEvent(totals: {
  goals: number;
  assists: number;
  key: number;
  yellow: number;
  red: number;
}): boolean {
  return (
    totals.goals + totals.assists + totals.key + totals.yellow + totals.red > 0
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function EventTotal({
  type,
  value,
}: {
  type: keyof typeof EVENT_META;
  value: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const meta = EVENT_META[type];
  return (
    <View style={[styles.eventTotal, { backgroundColor: meta.bg }]}>
      <Text style={styles.eventTotalGlyph}>{meta.glyph}</Text>
      <Text style={[styles.eventTotalValue, { color: meta.color }]}>
        {value}
      </Text>
    </View>
  );
}

function MiniEvent({
  glyph,
  color,
  value,
}: {
  glyph: string;
  color: string;
  value: number;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.miniEvent, { borderColor: color + '44' }]}>
      <Text style={styles.miniEventGlyph}>{glyph}</Text>
      <Text style={[styles.miniEventValue, { color }]}>{value}</Text>
    </View>
  );
}

function TimelineRow({
  event,
  players,
  last,
  start,
}: {
  event: MatchEvent;
  players: ReturnType<typeof useData>['players'];
  last: boolean;
  start?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const meta = EVENT_META[event.type];
  const player = players.find((p) => p.id === event.playerId);
  const minute = start
    ? Math.max(
        0,
        Math.floor(
          (new Date(event.createdAt).getTime() - new Date(start).getTime()) /
            60000,
        ),
      )
    : null;
  return (
    <View
      style={[styles.timelineRow, !last && styles.rowDivider]}
    >
      <View style={styles.timelineMinute}>
        <Text style={styles.timelineMinuteLabel}>
          {minute !== null ? `${minute}'` : '—'}
        </Text>
      </View>
      <Text style={[styles.timelineGlyph, { color: meta.color }]}>
        {meta.glyph}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.timelineName}>{player ? player.name : '—'}</Text>
        <Text style={styles.timelineMeta}>{meta.label}</Text>
      </View>
    </View>
  );
}

function StintRow({
  stint,
  players,
  last,
  nowMs,
  is7x7,
  quarterStarts,
}: {
  stint: PlayerStint;
  players: ReturnType<typeof useData>['players'];
  last: boolean;
  nowMs: number;
  is7x7?: boolean;
  quarterStarts?: Map<number, number>;
}) {
  const styles = useThemedStyles(makeStyles);
  const player = players.find((p) => p.id === stint.playerId);
  const start = new Date(stint.startAt).getTime();
  let end = stint.endAt ? new Date(stint.endAt).getTime() : nowMs;
  if (is7x7 && stint.quarter && quarterStarts) {
    const qStart = quarterStarts.get(stint.quarter);
    if (qStart !== undefined) {
      const cap = qStart + 15 * 60 * 1000;
      if (!stint.endAt) end = cap;
      else if (end > cap) end = cap;
    }
  }
  const ms = Math.max(0, end - start);
  const posMeta = stint.position ? POSITION_META[stint.position] : null;
  return (
    <View style={[styles.stintRow, !last && styles.rowDivider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stintName}>{player ? player.name : '—'}</Text>
        <Text style={styles.stintMeta}>
          {formatTime(stint.startAt)}
          {stint.endAt ? ` → ${formatTime(stint.endAt)}` : ' → en cours'}
        </Text>
      </View>
      {posMeta ? (
        <View style={[styles.stintPos, { backgroundColor: posMeta.bg }]}>
          <Text style={[styles.stintPosLabel, { color: posMeta.color }]}>
            {posMeta.short}
          </Text>
        </View>
      ) : null}
      <Text style={styles.stintDuration}>{formatMinutes(ms)}</Text>
    </View>
  );
}

const makeStyles = (c: ThemedColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...typography.body, color: c.textMuted },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  header: {},
  date: {
    ...typography.micro,
    color: c.textMuted,
    textTransform: 'uppercase',
  },
  title: { ...typography.largeTitle, color: c.textPrimary, marginTop: 4 },
  headerMetaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
  },
  metaChip: {
    backgroundColor: c.background,
    borderRadius: radius.md,
    padding: spacing.sm,
    flex: 1,
    minWidth: 90,
  },
  metaLabel: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase' },
  metaValue: {
    ...typography.bodyBold,
    color: c.textPrimary,
    marginTop: 2,
  },
  eventTotalsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  eventTotal: {
    flex: 1,
    minWidth: 60,
    padding: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  eventTotalGlyph: { fontSize: 18 },
  eventTotalValue: { ...typography.h2, fontSize: 20, marginTop: 2 },
  sectionHeader: {
    ...typography.h3,
    color: c.textPrimary,
    marginTop: spacing.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  playerInfo: { flex: 1, minWidth: 0, gap: 6 },
  playerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerName: {
    ...typography.bodyBold,
    color: c.textPrimary,
    fontSize: 16,
    flex: 1,
    marginRight: spacing.sm,
  },
  playerTime: {
    ...typography.bodyBold,
    color: c.primary,
    fontVariant: ['tabular-nums'],
  },
  playerSubRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  starterPill: {
    backgroundColor: c.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  starterLabel: {
    ...typography.micro,
    color: c.primary,
    fontWeight: '700',
  },
  positionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  positionLabel: { ...typography.micro, fontWeight: '700' },
  eventMiniRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  miniEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniEventGlyph: { fontSize: 12 },
  miniEventValue: { fontSize: 12, fontWeight: '800' },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  timelineMinute: {
    minWidth: 44,
    backgroundColor: c.background,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  timelineMinuteLabel: {
    ...typography.bodyBold,
    fontSize: 13,
    color: c.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  timelineGlyph: { fontSize: 22 },
  timelineName: { ...typography.bodyBold, color: c.textPrimary },
  timelineMeta: {
    ...typography.caption,
    color: c.textMuted,
    marginTop: 2,
  },
  stintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  stintName: { ...typography.bodyBold, color: c.textPrimary },
  stintMeta: { ...typography.caption, color: c.textMuted, marginTop: 2 },
  stintPos: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  stintPosLabel: { ...typography.micro, fontWeight: '700' },
  stintDuration: {
    ...typography.bodyBold,
    color: c.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});

