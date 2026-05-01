import React, { useLayoutEffect, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { EVENT_META } from '@/constants/events';
import { STATUS_META } from '@/constants/statuses';
import { useData } from '@/context/DataContext';
import { radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';
import { formatDate } from '@/utils/date';
import { isMatchKind } from '@/types';
import type { MatchEventType } from '@/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerDetail'>;

function formatMinutes(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return `${m}min${s > 0 ? ` ${s.toString().padStart(2, '0')}s` : ''}`;
}

export function PlayerDetailScreen({ route, navigation }: Props) {
  const { playerId } = route.params;
  const {
    players,
    sessions,
    attendances,
    matchEvents,
    playerStats,
    matchCallUps,
    getPlayerMatchTotals,
    getPlayerPlayMs,
  } = useData();
  const styles = useThemedStyles(makeStyles);

  const player = players.find((p) => p.id === playerId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: player?.name ?? 'Joueur' });
  }, [navigation, player]);

  const trainingStats = useMemo(
    () => playerStats.find((s) => s.player.id === playerId),
    [playerStats, playerId],
  );

  const matchStats = useMemo(
    () => matchCallUps.find((s) => s.player.id === playerId),
    [matchCallUps, playerId],
  );

  const totals = useMemo(
    () => getPlayerMatchTotals(playerId),
    [getPlayerMatchTotals, playerId],
  );

  const totalPlayMs = useMemo(
    () => getPlayerPlayMs(playerId),
    [getPlayerPlayMs, playerId],
  );

  const playerSessions = useMemo(() => {
    const items = sessions
      .filter((s) => !s.cancelled)
      .map((s) => {
        const att = attendances.find(
          (a) => a.sessionId === s.id && a.playerId === playerId,
        );
        const status = att?.status;
        const isMatch = isMatchKind(s.kind);
        const ms = isMatch ? getPlayerPlayMs(playerId, s.id) : 0;
        const matchTotals = isMatch ? getPlayerMatchTotals(playerId, s.id) : null;
        return { session: s, status, isMatch, ms, matchTotals };
      })
      .filter((r) => {
        if (!r.status && !r.ms && !r.matchTotals) return false;
        if (r.matchTotals) {
          const any =
            r.matchTotals.goals +
              r.matchTotals.assists +
              r.matchTotals.key +
              r.matchTotals.yellow +
              r.matchTotals.red >
            0;
          if (any) return true;
        }
        if (r.ms > 0) return true;
        if (
          r.status === 'present' ||
          r.status === 'sfc' ||
          r.status === 'return'
        )
          return true;
        return false;
      })
      .sort(
        (a, b) =>
          new Date(b.session.date).getTime() -
          new Date(a.session.date).getTime(),
      );
    return items;
  }, [sessions, attendances, playerId, getPlayerPlayMs, getPlayerMatchTotals]);

  const matchesPlayed = useMemo(() => {
    return playerSessions.filter(
      (r) =>
        r.isMatch &&
        (r.ms > 0 ||
          (r.matchTotals &&
            r.matchTotals.goals +
              r.matchTotals.assists +
              r.matchTotals.key +
              r.matchTotals.yellow +
              r.matchTotals.red >
              0)),
    ).length;
  }, [playerSessions]);

  const trainingsAttended = useMemo(() => {
    return playerSessions.filter(
      (r) =>
        !r.isMatch &&
        (r.status === 'present' ||
          r.status === 'sfc' ||
          r.status === 'return'),
    ).length;
  }, [playerSessions]);

  if (!player) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>Joueur introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.identityCard}>
          <View style={styles.identityRow}>
            <Avatar name={player.name} photoUri={player.photoUri} size={72} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{player.name}</Text>
              <Text style={styles.subtitle}>
                {trainingsAttended} entraînement{trainingsAttended > 1 ? 's' : ''}
                {' · '}
                {matchesPlayed} match{matchesPlayed > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.ringRow}>
          {trainingStats && trainingStats.totalSessions > 0 ? (
            <Card style={styles.ringCard}>
              <ProgressRing
                value={trainingStats.ratio}
                size={92}
                strokeWidth={9}
                label="actif"
                color={STATUS_META.sfc.color}
              />
              <Text style={styles.ringTitle}>Assiduité</Text>
              <Text style={styles.ringHint}>
                {trainingStats.totalPresent}/{trainingStats.totalSessions}{' '}
                entraînements
              </Text>
            </Card>
          ) : null}
          {matchStats && matchStats.total > 0 ? (
            <Card style={styles.ringCard}>
              <ProgressRing
                value={matchStats.ratio}
                size={92}
                strokeWidth={9}
                label="convoqué"
                color={STATUS_META.present.color}
              />
              <Text style={styles.ringTitle}>Convocations</Text>
              <Text style={styles.ringHint}>
                {matchStats.called}/{matchStats.total} matchs
              </Text>
            </Card>
          ) : null}
        </View>

        <View style={styles.kpiRow}>
          <KpiCard
            label="Temps de jeu"
            value={totalPlayMs > 0 ? formatMinutes(totalPlayMs) : '—'}
          />
          <KpiCard label="Matchs joués" value={String(matchesPlayed)} />
        </View>

        <Text style={styles.sectionHeader}>Stats matchs</Text>
        <Card style={styles.eventsCard}>
          {totals.goals + totals.assists + totals.key + totals.yellow + totals.red === 0 ? (
            <EmptyState
              title="Pas encore d'évènement"
              description="Aucun but, passe ou évènement enregistré pour ce joueur."
            />
          ) : (
            <View style={styles.eventGrid}>
              <EventStat type="goal" value={totals.goals} />
              <EventStat type="assist" value={totals.assists} />
              <EventStat type="key" value={totals.key} />
              <EventStat type="yellow" value={totals.yellow} />
              <EventStat type="red" value={totals.red} />
            </View>
          )}
        </Card>

        {trainingStats && trainingStats.totalSessions > 0 ? (
          <>
            <Text style={styles.sectionHeader}>Détail entraînements</Text>
            <Card padded={false} style={styles.detailCard}>
              <DetailRow
                glyph={STATUS_META.present.glyph}
                color={STATUS_META.present.color}
                label="Présent au club"
                value={trainingStats.present}
              />
              <DetailRow
                glyph={STATUS_META.sfc.glyph}
                color={STATUS_META.sfc.color}
                label="SFC"
                value={trainingStats.sfc}
                divider
              />
              <DetailRow
                glyph={STATUS_META.return.glyph}
                color={STATUS_META.return.color}
                label="Retour au club"
                value={trainingStats.ret}
                divider
              />
              <DetailRow
                glyph={STATUS_META.excused.glyph}
                color={STATUS_META.excused.color}
                label="Absent excusé"
                value={trainingStats.excused}
                divider
              />
              <DetailRow
                glyph={STATUS_META.unexcused.glyph}
                color={STATUS_META.unexcused.color}
                label="Absent non excusé"
                value={trainingStats.unexcused}
                divider
              />
              {trainingStats.vacation > 0 ? (
                <DetailRow
                  glyph={STATUS_META.vacation.glyph}
                  color={STATUS_META.vacation.color}
                  label="Vacances"
                  value={trainingStats.vacation}
                  divider
                />
              ) : null}
            </Card>
            <View style={styles.barWrap}>
              <ProgressBar value={trainingStats.ratio} height={8} />
            </View>
          </>
        ) : null}

        {playerSessions.length > 0 ? (
          <>
            <Text style={styles.sectionHeader}>Activité récente</Text>
            <Card padded={false} style={styles.detailCard}>
              {playerSessions.slice(0, 12).map((row, index, arr) => (
                <Pressable
                  key={row.session.id}
                  onPress={() => {
                    if (row.isMatch) {
                      navigation.navigate('MatchSheet', {
                        sessionId: row.session.id,
                      });
                    } else {
                      navigation.navigate('Session', {
                        sessionId: row.session.id,
                      });
                    }
                  }}
                  style={[
                    styles.activityRow,
                    index < arr.length - 1 && styles.rowDivider,
                  ]}
                >
                  <View
                    style={[
                      styles.activityKind,
                      row.isMatch
                        ? styles.activityKindMatch
                        : styles.activityKindTraining,
                    ]}
                  >
                    <Text
                      style={[
                        styles.activityKindText,
                        row.isMatch
                          ? styles.activityKindTextMatch
                          : styles.activityKindTextTraining,
                      ]}
                    >
                      {row.isMatch ? '⚽' : '🏋️'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {row.session.label
                        ? `vs ${row.session.label}`
                        : row.isMatch
                        ? 'Match'
                        : 'Entraînement'}
                    </Text>
                    <Text style={styles.activityMeta}>
                      {formatDate(row.session.date)}
                      {row.status
                        ? ` · ${STATUS_META[row.status].short}`
                        : ''}
                      {row.isMatch && row.ms > 0
                        ? ` · ${formatMinutes(row.ms)}`
                        : ''}
                    </Text>
                  </View>
                  {row.matchTotals &&
                  row.matchTotals.goals + row.matchTotals.assists > 0 ? (
                    <View style={styles.activityPills}>
                      {row.matchTotals.goals > 0 ? (
                        <ActivityPill type="goal" value={row.matchTotals.goals} />
                      ) : null}
                      {row.matchTotals.assists > 0 ? (
                        <ActivityPill
                          type="assist"
                          value={row.matchTotals.assists}
                        />
                      ) : null}
                    </View>
                  ) : null}
                  <Text style={styles.activityCaret}>›</Text>
                </Pressable>
              ))}
            </Card>
          </>
        ) : null}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </Card>
  );
}

function EventStat({ type, value }: { type: MatchEventType; value: number }) {
  const styles = useThemedStyles(makeStyles);
  const meta = EVENT_META[type];
  return (
    <View style={[styles.eventStat, { backgroundColor: meta.bg }]}>
      <Text style={styles.eventStatGlyph}>{meta.glyph}</Text>
      <Text style={[styles.eventStatValue, { color: meta.color }]}>
        {value}
      </Text>
      <Text style={[styles.eventStatLabel, { color: meta.color }]}>
        {meta.short}
      </Text>
    </View>
  );
}

function DetailRow({
  glyph,
  color,
  label,
  value,
  divider,
}: {
  glyph: string;
  color: string;
  label: string;
  value: number;
  divider?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.detailRow, divider && styles.rowDivider]}>
      <Text style={[styles.detailGlyph, { color }]}>{glyph}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, { color }]}>{value}</Text>
    </View>
  );
}

function ActivityPill({ type, value }: { type: MatchEventType; value: number }) {
  const styles = useThemedStyles(makeStyles);
  const meta = EVENT_META[type];
  return (
    <View style={[styles.activityPill, { backgroundColor: meta.bg }]}>
      <Text style={styles.activityPillGlyph}>{meta.glyph}</Text>
      <Text style={[styles.activityPillValue, { color: meta.color }]}>
        {value}
      </Text>
    </View>
  );
}

const makeStyles = (c: ThemedColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    muted: { ...typography.body, color: c.textMuted },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    identityCard: {},
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    name: { ...typography.h2, color: c.textPrimary },
    subtitle: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 4,
    },
    ringRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    ringCard: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    ringTitle: {
      ...typography.bodyBold,
      color: c.textPrimary,
      marginTop: 6,
    },
    ringHint: {
      ...typography.caption,
      color: c.textMuted,
      textAlign: 'center',
    },
    kpiRow: { flexDirection: 'row', gap: spacing.md },
    kpiCard: { flex: 1 },
    kpiLabel: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
    },
    kpiValue: {
      ...typography.h1,
      color: c.textPrimary,
      marginTop: 6,
      fontVariant: ['tabular-nums'],
    },
    sectionHeader: {
      ...typography.h3,
      color: c.textPrimary,
      marginTop: spacing.md,
    },
    eventsCard: {},
    eventGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    eventStat: {
      flexBasis: '30%',
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      gap: 2,
      minWidth: 80,
    },
    eventStatGlyph: { fontSize: 22 },
    eventStatValue: { ...typography.h2, fontVariant: ['tabular-nums'] },
    eventStatLabel: {
      ...typography.micro,
      textTransform: 'uppercase',
    },
    detailCard: {},
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    detailGlyph: {
      fontSize: 18,
      fontWeight: '800',
      width: 24,
      textAlign: 'center',
    },
    detailLabel: {
      flex: 1,
      ...typography.body,
      color: c.textPrimary,
    },
    detailValue: {
      ...typography.h3,
      fontVariant: ['tabular-nums'],
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    barWrap: { paddingHorizontal: spacing.xs, marginTop: -spacing.xs },
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    activityKind: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityKindTraining: { backgroundColor: c.primarySoft },
    activityKindMatch: { backgroundColor: c.warningSoft },
    activityKindText: { fontSize: 16 },
    activityKindTextTraining: { color: c.primary },
    activityKindTextMatch: { color: c.warningText },
    activityTitle: {
      ...typography.bodyBold,
      color: c.textPrimary,
    },
    activityMeta: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    activityPills: {
      flexDirection: 'row',
      gap: 4,
    },
    activityPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    activityPillGlyph: { fontSize: 12 },
    activityPillValue: { ...typography.caption, fontWeight: '800' },
    activityCaret: {
      ...typography.h3,
      color: c.textMuted,
      marginLeft: 2,
    },
  });
