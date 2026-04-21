import React from 'react';
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

export function StatsScreen() {
  const {
    players,
    sessions,
    attendances,
    playerStats,
    matchCallUps,
    getPlayerMatchTotals,
    globalRatio,
    activeTrainingsCount,
    activeMatchesCount,
  } = useData();

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

  const exportCSV = async () => {
    try {
      if (activeTrainingsCount === 0 && activeMatchesCount === 0) {
        Alert.alert(
          'Aucune donnée',
          'Créez au moins une séance avant d\'exporter.',
        );
        return;
      }
      const csv = buildAttendanceCSV(players, sessions, attendances);

      if (Platform.OS === 'web') {
        const blob = new Blob(['﻿' + csv], {
          type: 'text/csv;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'presences-ecfc.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}presences-ecfc.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
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

  const hasAnyData = activeTrainingsCount > 0 || activeMatchesCount > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Statistiques"
        subtitle="Assiduité entraînement et matchs"
        right={
          <Pressable style={styles.exportBtn} onPress={exportCSV}>
            <Text style={styles.exportLabel}>Export CSV</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!hasAnyData || players.length === 0 ? (
          <Card>
            <EmptyState
              title="Pas encore de données"
              description="Créez des joueurs et lancez une séance pour faire apparaître les stats."
            />
          </Card>
        ) : (
          <>
            {activeTrainingsCount > 0 ? (
              <>
                <Text style={styles.sectionHeader}>🏋️  Entraînements</Text>

                <Card style={styles.hero}>
                  <View style={styles.heroRow}>
                    <ProgressRing
                      value={globalRatio}
                      size={120}
                      strokeWidth={12}
                      label="global"
                    />
                    <View style={styles.heroText}>
                      <Text style={styles.heroTitle}>Assiduité</Text>
                      <Text style={styles.heroHint}>
                        {players.length} joueurs · {activeTrainingsCount}{' '}
                        entraînement{activeTrainingsCount > 1 ? 's' : ''}
                      </Text>
                      {best ? (
                        <View style={styles.heroMetaRow}>
                          <Text style={styles.heroMetaLabel}>Meilleur</Text>
                          <Text style={styles.heroMetaValue}>
                            {best.player.name} · {Math.round(best.ratio * 100)}%
                          </Text>
                        </View>
                      ) : null}
                      {worst && worst !== best ? (
                        <View style={styles.heroMetaRow}>
                          <Text style={styles.heroMetaLabel}>À encourager</Text>
                          <Text style={styles.heroMetaValue}>
                            {worst.player.name} ·{' '}
                            {Math.round(worst.ratio * 100)}%
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Card>

                <View style={styles.statsRow}>
                  <StatCard
                    label="Présents"
                    value={totals.present}
                    hint={`+ ${totals.sfc} SFC · ${totals.ret} RC`}
                    accent={STATUS_META.present.color}
                  />
                  <View style={{ width: spacing.md }} />
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
                          <Text style={styles.playerPct}>
                            {Math.round(stat.ratio * 100)}%
                          </Text>
                        </View>
                        <View style={styles.barWrap}>
                          <ProgressBar value={stat.ratio} height={6} />
                        </View>
                        <Text style={styles.playerMeta}>
                          {stat.totalPresent} / {stat.totalSessions}
                        </Text>
                        <View style={styles.miniStats}>
                          {stat.sfc > 0 ? (
                            <MiniStat
                              label="SFC"
                              value={stat.sfc}
                              color={STATUS_META.sfc.color}
                            />
                          ) : null}
                          {stat.excused > 0 ? (
                            <MiniStat
                              label="Exc"
                              value={stat.excused}
                              color={STATUS_META.excused.color}
                            />
                          ) : null}
                          {stat.unexcused > 0 ? (
                            <MiniStat
                              label="Abs"
                              value={stat.unexcused}
                              color={STATUS_META.unexcused.color}
                            />
                          ) : null}
                          {stat.vacation > 0 ? (
                            <MiniStat
                              label="Vac"
                              value={stat.vacation}
                              color={STATUS_META.vacation.color}
                            />
                          ) : null}
                          {stat.notCalled > 0 ? (
                            <MiniStat
                              label="NC"
                              value={stat.notCalled}
                              color={STATUS_META.not_called.color}
                            />
                          ) : null}
                        </View>
                      </View>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            {activeMatchesCount > 0 ? (
              <>
                <Text style={styles.sectionHeader}>⚽  Convocations match</Text>
                <Card padded={false} style={styles.listCard}>
                  {matchCallUps.map((stat, index) => {
                    const totals = getPlayerMatchTotals(stat.player.id);
                    const eventPills: Array<{ label: string; value: number; color: string; glyph: string }> = [];
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
                                    { backgroundColor: pill.color + '15', borderColor: pill.color + '33' },
                                  ]}
                                >
                                  <Text style={styles.eventGlyph}>
                                    {pill.glyph}
                                  </Text>
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
            ) : null}
          </>
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
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
  sectionHeader: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
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
  statsRow: { flexDirection: 'row' },
  listCard: {},
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
