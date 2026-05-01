import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatCard } from '@/components/StatCard';
import { EVENT_META } from '@/constants/events';
import { STATUS_META } from '@/constants/statuses';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';
import { buildAttendanceCSV } from '@/utils/csv';
import type { MatchEventType, PlayerMatchTotals } from '@/types';
import { isMatchKind } from '@/types';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, TabParamList } from '@/navigation/AppNavigator';
import { useNavigation } from '@react-navigation/native';
import { formatDate } from '@/utils/date';

type StatsNav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Stats'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Tab = 'training' | 'match';

export function StatsScreen() {
  const {
    players,
    sessions,
    attendances,
    matchEvents,
    stints,
    playerStats,
    matchCallUps,
    getPlayerMatchTotals,
    getPlayerPlayMs,
    globalRatio,
    globalPresentRatio,
    activeTrainingsCount,
    activeMatchesCount,
  } = useData();

  const [tab, setTab] = useState<Tab>('training');

  const hasTrainingData = activeTrainingsCount > 0 && players.length > 0;
  const hasMatchData = activeMatchesCount > 0 && players.length > 0;

  const exportCSV = async () => {
    try {
      if (activeTrainingsCount === 0 && activeMatchesCount === 0) {
        Alert.alert(
          'Aucune donnée',
          'Créez au moins une séance avant d\'exporter.',
        );
        return;
      }
      const csv = buildAttendanceCSV(
        players,
        sessions,
        attendances,
        matchEvents,
        stints,
      );
      const BOM = '﻿';
      const today = new Date().toISOString().slice(0, 10);
      const filename = `ecfc-export-${today}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([BOM + csv], {
          type: 'text/csv;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, BOM + csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exporter les présences',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Export prêt', `Fichier enregistré : ${fileUri}`);
      }
    } catch (err) {
      Alert.alert('Erreur', 'L\'export a échoué.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Statistiques"
        subtitle="Assiduité, convocations, events"
        right={
          <Pressable style={styles.exportBtn} onPress={exportCSV}>
            <Text style={styles.exportLabel}>Export CSV</Text>
          </Pressable>
        }
      />

      <View style={styles.tabsRow}>
        <TabButton
          label="🏋️  Entraînements"
          active={tab === 'training'}
          onPress={() => setTab('training')}
        />
        <TabButton
          label="⚽  Matchs"
          active={tab === 'match'}
          onPress={() => setTab('match')}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'training' ? (
          hasTrainingData ? (
            <TrainingView
              playerStats={playerStats}
              globalRatio={globalRatio}
              globalPresentRatio={globalPresentRatio}
              players={players}
              activeTrainingsCount={activeTrainingsCount}
            />
          ) : (
            <Card>
              <EmptyState
                title="Pas encore d'entraînement"
                description="Crée un entraînement et marque les présences pour voir l'assiduité de ton effectif."
              />
            </Card>
          )
        ) : hasMatchData ? (
          <MatchView
            sessions={sessions}
            players={players}
            matchCallUps={matchCallUps}
            matchEvents={matchEvents}
            activeMatchesCount={activeMatchesCount}
            getPlayerMatchTotals={getPlayerMatchTotals}
            getPlayerPlayMs={getPlayerPlayMs}
          />
        ) : (
          <Card>
            <EmptyState
              title="Pas encore de match"
              description="Crée un match, convoque les joueurs et lance le Mode Live pour voir apparaître les stats."
            />
          </Card>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function TrainingView({
  playerStats,
  globalRatio,
  globalPresentRatio,
  players,
  activeTrainingsCount,
}: {
  playerStats: ReturnType<typeof useData>['playerStats'];
  globalRatio: number;
  globalPresentRatio: number;
  players: ReturnType<typeof useData>['players'];
  activeTrainingsCount: number;
}) {
  const best = playerStats[0];
  const worst = playerStats[playerStats.length - 1];
  const totals = playerStats.reduce(
    (acc, p) => {
      acc.present += p.present;
      acc.sfc += p.sfc;
      acc.ret += p.ret;
      acc.excused += p.excused;
      acc.unexcused += p.unexcused;
      return acc;
    },
    { present: 0, sfc: 0, ret: 0, excused: 0, unexcused: 0 },
  );

  return (
    <>
      <Card style={styles.hero}>
        <Text style={styles.heroBigTitle}>Suivi entraînement</Text>
        <Text style={styles.heroBigSub}>
          {players.length} joueurs · {activeTrainingsCount}{' '}
          entraînement{activeTrainingsCount > 1 ? 's' : ''}
        </Text>
        <View style={styles.heroDualRow}>
          <View style={styles.heroMetric}>
            <ProgressRing
              value={globalPresentRatio}
              size={96}
              strokeWidth={11}
              color={STATUS_META.present.color}
              label="au club"
            />
            <Text style={styles.heroMetricTitle}>Présents</Text>
            <Text style={styles.heroMetricSub}>
              Sur le terrain à Carouge
            </Text>
          </View>
          <View style={styles.heroMetric}>
            <ProgressRing
              value={globalRatio}
              size={96}
              strokeWidth={11}
              color={STATUS_META.sfc.color}
              label="actif"
            />
            <Text style={styles.heroMetricTitle}>Actifs</Text>
            <Text style={styles.heroMetricSub}>+ SFC + Retour au club</Text>
          </View>
        </View>

        {best ? (
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaLabel}>Meilleur</Text>
            <Text style={styles.heroMetaValue}>
              {best.player.name} · {Math.round(best.ratio * 100)}% actif
            </Text>
          </View>
        ) : null}
        {worst && worst !== best ? (
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaLabel}>À encourager</Text>
            <Text style={styles.heroMetaValue}>
              {worst.player.name} · {Math.round(worst.ratio * 100)}% actif
            </Text>
          </View>
        ) : null}
      </Card>

      <View style={styles.statsRow}>
        <StatCard
          label="Présents au club"
          value={totals.present}
          hint="Sur le terrain à Carouge"
          accent={STATUS_META.present.color}
        />
        <View style={{ width: spacing.md }} />
        <StatCard
          label="Actifs"
          value={totals.present + totals.sfc + totals.ret}
          hint={`+ ${totals.sfc} SFC · ${totals.ret} RC`}
          accent={STATUS_META.sfc.color}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Absences"
          value={totals.excused + totals.unexcused}
          hint={`${totals.excused} exc · ${totals.unexcused} non exc`}
          accent={STATUS_META.unexcused.color}
        />
      </View>

      <Card padded={false} style={styles.listCard}>
        {playerStats.map((stat, index) => (
          <View
            key={stat.player.id}
            style={[
              styles.playerRow,
              index < playerStats.length - 1 && styles.rowDivider,
            ]}
          >
            <Avatar
              name={stat.player.name}
              photoUri={stat.player.photoUri}
              size={40}
            />
            <View style={styles.playerInfo}>
              <View style={styles.playerTop}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {stat.player.name}
                </Text>
                <View style={styles.playerPctBlock}>
                  <Text style={styles.playerPct}>
                    {Math.round(stat.ratio * 100)}%
                  </Text>
                  <Text style={styles.playerPctSub}>actif</Text>
                </View>
              </View>
              <View style={styles.barWrap}>
                <ProgressBar value={stat.ratio} height={6} />
              </View>
              <Text style={styles.playerMeta}>
                Actif {stat.totalPresent}/{stat.totalSessions} · Présent au club{' '}
                {stat.present}/{stat.totalSessions}
                {stat.totalSessions > 0 ? ` (${Math.round(
                  (stat.present / stat.totalSessions) * 100,
                )}%)` : ''}
              </Text>
              <View style={styles.miniStats}>
                {stat.sfc > 0 ? (
                  <MiniStat label="SFC" value={stat.sfc} color={STATUS_META.sfc.color} />
                ) : null}
                {stat.excused > 0 ? (
                  <MiniStat label="Exc" value={stat.excused} color={STATUS_META.excused.color} />
                ) : null}
                {stat.unexcused > 0 ? (
                  <MiniStat label="Abs" value={stat.unexcused} color={STATUS_META.unexcused.color} />
                ) : null}
                {stat.vacation > 0 ? (
                  <MiniStat label="Vac" value={stat.vacation} color={STATUS_META.vacation.color} />
                ) : null}
                {stat.notCalled > 0 ? (
                  <MiniStat label="NC" value={stat.notCalled} color={STATUS_META.not_called.color} />
                ) : null}
              </View>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

function formatMinutes(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s}s`;
  return `${m}min${s > 0 ? ` ${s.toString().padStart(2, '0')}s` : ''}`;
}

function MatchView({
  sessions,
  players,
  matchCallUps,
  matchEvents,
  activeMatchesCount,
  getPlayerMatchTotals,
  getPlayerPlayMs,
}: {
  sessions: ReturnType<typeof useData>['sessions'];
  players: ReturnType<typeof useData>['players'];
  matchCallUps: ReturnType<typeof useData>['matchCallUps'];
  matchEvents: ReturnType<typeof useData>['matchEvents'];
  activeMatchesCount: number;
  getPlayerMatchTotals: (playerId: string, sessionId?: string) => PlayerMatchTotals;
  getPlayerPlayMs: (playerId: string, sessionId?: string, now?: number) => number;
}) {
  const navigation = useNavigation<StatsNav>();

  const matchSessions = useMemo(
    () =>
      sessions
        .filter((s) => isMatchKind(s.kind) && !s.cancelled)
        .sort(
          (a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
    [sessions],
  );

  const matchSummary = useMemo(() => {
    const summary = new Map<
      string,
      {
        goals: number;
        assists: number;
        keys: number;
        yellow: number;
        red: number;
        totalEvents: number;
        scorers: Array<{ playerId: string; count: number }>;
        assisters: Array<{ playerId: string; count: number }>;
        topMinutes: { playerId: string; ms: number } | null;
        totalMinutes: number;
      }
    >();

    const goalsByPlayer = new Map<string, Map<string, number>>();
    const assistsByPlayer = new Map<string, Map<string, number>>();

    for (const s of matchSessions) {
      summary.set(s.id, {
        goals: 0,
        assists: 0,
        keys: 0,
        yellow: 0,
        red: 0,
        totalEvents: 0,
        scorers: [],
        assisters: [],
        topMinutes: null,
        totalMinutes: 0,
      });
      goalsByPlayer.set(s.id, new Map());
      assistsByPlayer.set(s.id, new Map());
    }

    for (const e of matchEvents) {
      const bucket = summary.get(e.sessionId);
      if (!bucket) continue;
      bucket.totalEvents += 1;
      if (e.type === 'goal') {
        bucket.goals += 1;
        const map = goalsByPlayer.get(e.sessionId)!;
        map.set(e.playerId, (map.get(e.playerId) ?? 0) + 1);
      } else if (e.type === 'assist') {
        bucket.assists += 1;
        const map = assistsByPlayer.get(e.sessionId)!;
        map.set(e.playerId, (map.get(e.playerId) ?? 0) + 1);
      } else if (e.type === 'key') {
        bucket.keys += 1;
      } else if (e.type === 'yellow') {
        bucket.yellow += 1;
      } else if (e.type === 'red') {
        bucket.red += 1;
      }
    }

    for (const s of matchSessions) {
      const bucket = summary.get(s.id)!;
      bucket.scorers = Array.from(goalsByPlayer.get(s.id)!.entries())
        .map(([playerId, count]) => ({ playerId, count }))
        .sort((a, b) => b.count - a.count);
      bucket.assisters = Array.from(assistsByPlayer.get(s.id)!.entries())
        .map(([playerId, count]) => ({ playerId, count }))
        .sort((a, b) => b.count - a.count);

      const nowMs = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
      let topMs = 0;
      let topPlayerId: string | null = null;
      let totalMs = 0;
      for (const p of players) {
        const ms = getPlayerPlayMs(p.id, s.id, nowMs);
        totalMs += ms;
        if (ms > topMs) {
          topMs = ms;
          topPlayerId = p.id;
        }
      }
      bucket.topMinutes = topPlayerId
        ? { playerId: topPlayerId, ms: topMs }
        : null;
      bucket.totalMinutes = totalMs;
    }

    return summary;
  }, [matchSessions, matchEvents, players, getPlayerPlayMs]);

  const nameOf = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.name ?? '—';
  };
  const playerTotals = useMemo(() => {
    return players
      .map((p) => ({
        player: p,
        totals: getPlayerMatchTotals(p.id),
      }))
      .sort((a, b) => {
        if (b.totals.goals !== a.totals.goals) return b.totals.goals - a.totals.goals;
        if (b.totals.assists !== a.totals.assists) return b.totals.assists - a.totals.assists;
        return b.totals.key - a.totals.key;
      });
  }, [players, getPlayerMatchTotals]);

  const aggregate = useMemo(() => {
    const total: Record<MatchEventType, number> = {
      goal: 0,
      assist: 0,
      key: 0,
      yellow: 0,
      red: 0,
    };
    for (const e of matchEvents) {
      total[e.type] = (total[e.type] ?? 0) + 1;
    }
    return total;
  }, [matchEvents]);

  const topScorer = playerTotals.find((x) => x.totals.goals > 0);
  const topAssister = [...playerTotals].sort(
    (a, b) => b.totals.assists - a.totals.assists,
  )[0];
  const hasAssister = topAssister && topAssister.totals.assists > 0;

  const playMinutesByPlayer = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of players) {
      map.set(p.id, getPlayerPlayMs(p.id));
    }
    return map;
  }, [players, getPlayerPlayMs]);

  const topMinutes = useMemo(() => {
    return [...players]
      .map((p) => ({ player: p, ms: playMinutesByPlayer.get(p.id) ?? 0 }))
      .filter((x) => x.ms > 0)
      .sort((a, b) => b.ms - a.ms)[0];
  }, [players, playMinutesByPlayer]);

  return (
    <>
      <Text style={styles.sectionTitle}>Feuilles de match</Text>
      <View style={styles.matchList}>
        {matchSessions.map((s) => {
          const bucket = matchSummary.get(s.id);
          if (!bucket) return null;
          const state = s.endedAt
            ? 'terminé'
            : s.startedAt
            ? 'en cours'
            : 'à venir';
          const hasContent =
            bucket.totalEvents > 0 || bucket.totalMinutes > 0;
          return (
            <Pressable
              key={s.id}
              onPress={() =>
                navigation.navigate('MatchSheet', { sessionId: s.id })
              }
            >
              <Card style={styles.matchCard}>
                <View style={styles.matchCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.matchCardTitle} numberOfLines={1}>
                      {s.label ? `vs ${s.label}` : 'Match'}
                    </Text>
                    <Text style={styles.matchCardSub}>
                      {formatDate(s.date)} · {state}
                    </Text>
                  </View>
                  <View style={styles.matchCardPills}>
                    {bucket.goals > 0 ? (
                      <MatchPill
                        count={bucket.goals}
                        meta={EVENT_META.goal}
                      />
                    ) : null}
                    {bucket.assists > 0 ? (
                      <MatchPill
                        count={bucket.assists}
                        meta={EVENT_META.assist}
                      />
                    ) : null}
                    {bucket.yellow > 0 ? (
                      <MatchPill
                        count={bucket.yellow}
                        meta={EVENT_META.yellow}
                      />
                    ) : null}
                    {bucket.red > 0 ? (
                      <MatchPill
                        count={bucket.red}
                        meta={EVENT_META.red}
                      />
                    ) : null}
                  </View>
                </View>

                {hasContent ? (
                  <View style={styles.matchHighlights}>
                    {bucket.scorers.length > 0 ? (
                      <HighlightRow
                        icon={EVENT_META.goal.glyph}
                        label="Buteurs"
                        value={bucket.scorers
                          .slice(0, 3)
                          .map(
                            (x) =>
                              `${nameOf(x.playerId)}${x.count > 1 ? ` ×${x.count}` : ''}`,
                          )
                          .join(' · ')}
                      />
                    ) : null}
                    {bucket.assisters.length > 0 ? (
                      <HighlightRow
                        icon={EVENT_META.assist.glyph}
                        label="Passeurs"
                        value={bucket.assisters
                          .slice(0, 3)
                          .map(
                            (x) =>
                              `${nameOf(x.playerId)}${x.count > 1 ? ` ×${x.count}` : ''}`,
                          )
                          .join(' · ')}
                      />
                    ) : null}
                    {bucket.topMinutes ? (
                      <HighlightRow
                        icon="⏱"
                        label="Plus long"
                        value={`${nameOf(bucket.topMinutes.playerId)} · ${formatMinutes(bucket.topMinutes.ms)}`}
                      />
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.matchEmpty}>
                    {state === 'à venir'
                      ? 'Match à venir'
                      : 'Pas encore de stats — passe en Mode Live'}
                  </Text>
                )}

                <Text style={styles.matchCta}>Voir la feuille ›</Text>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.hero}>
        <Text style={styles.heroTitle}>Saison</Text>
        <Text style={styles.heroHint}>
          {activeMatchesCount} match{activeMatchesCount > 1 ? 's' : ''} ·{' '}
          {matchEvents.length} évènement{matchEvents.length > 1 ? 's' : ''}
        </Text>
        <View style={styles.leadersRow}>
          {topScorer ? (
            <View style={styles.leaderCard}>
              <Text style={styles.leaderLabel}>
                {EVENT_META.goal.glyph} Meilleur buteur
              </Text>
              <Text style={styles.leaderValue} numberOfLines={1}>
                {topScorer.player.name}
              </Text>
              <Text
                style={[
                  styles.leaderCount,
                  { color: EVENT_META.goal.color },
                ]}
              >
                {topScorer.totals.goals} but{topScorer.totals.goals > 1 ? 's' : ''}
              </Text>
            </View>
          ) : null}
          {hasAssister ? (
            <View style={styles.leaderCard}>
              <Text style={styles.leaderLabel}>
                {EVENT_META.assist.glyph} Meilleur passeur
              </Text>
              <Text style={styles.leaderValue} numberOfLines={1}>
                {topAssister!.player.name}
              </Text>
              <Text
                style={[
                  styles.leaderCount,
                  { color: EVENT_META.assist.color },
                ]}
              >
                {topAssister!.totals.assists} passe
                {topAssister!.totals.assists > 1 ? 's' : ''}
              </Text>
            </View>
          ) : null}
          {topMinutes ? (
            <View style={styles.leaderCard}>
              <Text style={styles.leaderLabel}>⏱  Plus gros temps de jeu</Text>
              <Text style={styles.leaderValue} numberOfLines={1}>
                {topMinutes.player.name}
              </Text>
              <Text style={[styles.leaderCount, { color: colors.primary }]}>
                {formatMinutes(topMinutes.ms)}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>

      <View style={styles.aggregateRow}>
        <AggregateTile type="goal" value={aggregate.goal} />
        <AggregateTile type="assist" value={aggregate.assist} />
        <AggregateTile type="key" value={aggregate.key} />
      </View>
      <View style={styles.aggregateRow}>
        <AggregateTile type="yellow" value={aggregate.yellow} />
        <AggregateTile type="red" value={aggregate.red} />
        <View style={{ flex: 1 }} />
      </View>

      <Text style={styles.sectionTitle}>Convocations & events par joueur</Text>

      <Card padded={false} style={styles.listCard}>
        {matchCallUps.map((stat, index) => {
          const totals = getPlayerMatchTotals(stat.player.id);
          const eventPills: Array<{
            label: string;
            value: number;
            color: string;
            glyph: string;
          }> = [];
          if (totals.goals > 0) eventPills.push({ label: 'Buts', value: totals.goals, color: EVENT_META.goal.color, glyph: EVENT_META.goal.glyph });
          if (totals.assists > 0) eventPills.push({ label: 'Passes', value: totals.assists, color: EVENT_META.assist.color, glyph: EVENT_META.assist.glyph });
          if (totals.key > 0) eventPills.push({ label: 'Clés', value: totals.key, color: EVENT_META.key.color, glyph: EVENT_META.key.glyph });
          if (totals.yellow > 0) eventPills.push({ label: 'Jaunes', value: totals.yellow, color: EVENT_META.yellow.color, glyph: EVENT_META.yellow.glyph });
          if (totals.red > 0) eventPills.push({ label: 'Rouges', value: totals.red, color: EVENT_META.red.color, glyph: EVENT_META.red.glyph });

          return (
            <View
              key={stat.player.id}
              style={[
                styles.playerRow,
                index < matchCallUps.length - 1 && styles.rowDivider,
              ]}
            >
              <Avatar
                name={stat.player.name}
                photoUri={stat.player.photoUri}
                size={40}
              />
              <View style={styles.playerInfo}>
                <View style={styles.playerTop}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {stat.player.name}
                  </Text>
                  <Text
                    style={[
                      styles.playerPct,
                      { color: STATUS_META.sfc.color },
                    ]}
                  >
                    {stat.called} / {stat.total}
                  </Text>
                </View>
                <View style={styles.barWrap}>
                  <ProgressBar value={stat.ratio} height={6} />
                </View>
                <Text style={styles.playerMeta}>
                  ⏱ {formatMinutes(playMinutesByPlayer.get(stat.player.id) ?? 0)} joué
                </Text>
                <View style={styles.miniStats}>
                  <MiniStat
                    label="Conv"
                    value={stat.called}
                    color={STATUS_META.present.color}
                  />
                  <MiniStat
                    label="Non"
                    value={stat.notCalled}
                    color={STATUS_META.not_called.color}
                  />
                  {stat.absent > 0 ? (
                    <MiniStat
                      label="Abs"
                      value={stat.absent}
                      color={STATUS_META.unexcused.color}
                    />
                  ) : null}
                </View>
                {eventPills.length > 0 ? (
                  <View style={styles.eventRow}>
                    {eventPills.map((pill) => (
                      <View
                        key={pill.label}
                        style={[
                          styles.eventPill,
                          {
                            backgroundColor: pill.color + '15',
                            borderColor: pill.color + '33',
                          },
                        ]}
                      >
                        <Text style={styles.eventGlyph}>{pill.glyph}</Text>
                        <Text
                          style={[styles.eventValue, { color: pill.color }]}
                        >
                          {pill.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </Card>
    </>
  );
}

function MatchPill({
  count,
  meta,
}: {
  count: number;
  meta: (typeof EVENT_META)[MatchEventType];
}) {
  return (
    <View style={[styles.matchPill, { backgroundColor: meta.bg }]}>
      <Text style={styles.matchPillGlyph}>{meta.glyph}</Text>
      <Text style={[styles.matchPillValue, { color: meta.color }]}>
        {count}
      </Text>
    </View>
  );
}

function HighlightRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.highlightRow}>
      <Text style={styles.highlightIcon}>{icon}</Text>
      <Text style={styles.highlightLabel}>{label}</Text>
      <Text style={styles.highlightValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function AggregateTile({ type, value }: { type: MatchEventType; value: number }) {
  const meta = EVENT_META[type];
  return (
    <View style={[styles.aggregateTile, { backgroundColor: meta.bg }]}>
      <Text style={styles.aggregateGlyph}>{meta.glyph}</Text>
      <Text style={[styles.aggregateValue, { color: meta.color }]}>
        {value}
      </Text>
      <Text style={[styles.aggregateLabel, { color: meta.color }]}>
        {meta.label}
      </Text>
    </View>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={[miniStatStyles.wrap, { borderColor: color + '33' }]}>
      <Text style={[miniStatStyles.value, { color }]}>{value}</Text>
      <Text style={[miniStatStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const miniStatStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  value: { fontSize: 11, fontWeight: '800' },
  label: { fontSize: 10, fontWeight: '700' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  exportBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  exportLabel: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabLabel: { ...typography.bodyBold, color: colors.textSecondary, fontSize: 13 },
  tabLabelActive: { color: '#FFFFFF' },
  hero: {},
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroText: { flex: 1 },
  heroTitle: { ...typography.h3, color: colors.textPrimary },
  heroHint: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  heroMetaRow: { marginTop: 8 },
  heroMetaLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  heroMetaValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  leadersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  leaderCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  leaderLabel: { ...typography.caption, color: colors.textSecondary },
  leaderValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: 4,
  },
  leaderCount: { ...typography.bodyBold, marginTop: 2, fontSize: 16 },
  aggregateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  aggregateTile: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'flex-start',
    gap: 4,
    minHeight: 80,
  },
  aggregateGlyph: { fontSize: 18 },
  aggregateValue: { ...typography.h2, fontSize: 24 },
  aggregateLabel: { ...typography.caption, fontWeight: '700' },
  statsRow: { flexDirection: 'row' },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  listCard: {},
  matchList: {
    gap: spacing.sm,
  },
  matchCard: {
    gap: spacing.sm,
  },
  matchCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  matchCardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 17,
  },
  matchCardSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  matchCardPills: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  matchPillGlyph: { fontSize: 13 },
  matchPillValue: { fontWeight: '800', fontSize: 13 },
  matchHighlights: {
    gap: 6,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  highlightIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  highlightLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    width: 74,
    paddingTop: 2,
  },
  highlightValue: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
  },
  matchEmpty: {
    ...typography.body,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  matchCta: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
    alignSelf: 'flex-end',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  playerInfo: { flex: 1, minWidth: 0 },
  playerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
    flex: 1,
    marginRight: spacing.sm,
  },
  playerPct: { ...typography.bodyBold, color: colors.primary },
  playerPctBlock: { alignItems: 'flex-end' },
  playerPctSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    marginTop: -2,
  },
  heroSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  heroBigTitle: { ...typography.h2, color: colors.textPrimary },
  heroBigSub: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroDualRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  heroMetric: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  heroMetricTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  heroMetricSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  barWrap: { marginTop: 6 },
  playerMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  miniStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  eventRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  eventPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  eventGlyph: { fontSize: 12 },
  eventValue: { fontSize: 12, fontWeight: '800' },
});
