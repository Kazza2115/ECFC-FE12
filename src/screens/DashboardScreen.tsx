import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useData } from '@/context/DataContext';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ClubLogo } from '@/components/ClubLogo';
import { SyncPill } from '@/components/SyncPill';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { StatCard } from '@/components/StatCard';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDate, nextTrainingDates, sameDay } from '@/utils/date';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, TabParamList } from '@/navigation/AppNavigator';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function DashboardScreen({ navigation }: { navigation: Nav }) {
  const {
    players,
    sessions,
    playerStats,
    globalRatio,
    activeSessionsCount,
    createSession,
    syncStatus,
    refreshFromCloud,
  } = useData();

  const topPlayers = playerStats.slice(0, 5);
  const lastSession = sessions[0];

  const upcoming = useMemo(() => {
    const candidates = nextTrainingDates(3);
    return candidates
      .filter(
        (iso) =>
          !sessions.some(
            (s) => !s.cancelled && sameDay(s.date, iso),
          ),
      )
      .slice(0, 3);
  }, [sessions]);

  const handleNewSession = async () => {
    const session = await createSession();
    navigation.navigate('Session', { sessionId: session.id });
  };

  const quickSession = async (iso: string) => {
    const session = await createSession({ date: iso, kind: 'training' });
    navigation.navigate('Session', { sessionId: session.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour Coach</Text>
            <Text style={styles.subtitle}>Étoile Carouge FC · Juniors</Text>
          </View>
          <View style={styles.headerRight}>
            <SyncPill status={syncStatus} onRefresh={refreshFromCloud} />
            <ClubLogo size={48} />
          </View>
        </View>

        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <ProgressRing value={globalRatio} size={110} strokeWidth={10} label="global" />
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Taux de présence</Text>
              <Text style={styles.heroHint}>
                {activeSessionsCount === 0
                  ? 'Lancez votre première séance'
                  : `${activeSessionsCount} séance${activeSessionsCount > 1 ? 's' : ''} prise${activeSessionsCount > 1 ? 's' : ''} en compte`}
              </Text>
              {lastSession ? (
                <Text style={styles.heroMeta}>
                  Dernière : {formatDate(lastSession.date)}
                  {lastSession.cancelled ? ' (annulée)' : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        <View style={styles.statsRow}>
          <StatCard label="Joueurs" value={players.length} accent={colors.primary} />
          <View style={{ width: spacing.md }} />
          <StatCard
            label="Activités"
            value={activeSessionsCount}
            hint={
              sessions.length !== activeSessionsCount
                ? `${sessions.length - activeSessionsCount} annulée${sessions.length - activeSessionsCount > 1 ? 's' : ''}`
                : undefined
            }
            accent={colors.accent}
          />
        </View>

        <View style={styles.actions}>
          <Button
            label="Nouvelle session (aujourd'hui)"
            onPress={handleNewSession}
            icon={<Text style={styles.actionGlyph}>＋</Text>}
            fullWidth
          />
          <View style={{ height: spacing.sm }} />
          <Button
            label="Voir toutes les séances"
            onPress={() => navigation.navigate('Sessions')}
            variant="secondary"
            fullWidth
          />
        </View>

        {upcoming.length > 0 ? (
          <View style={styles.upcomingBlock}>
            <Text style={styles.sectionLabel}>Prochains entraînements</Text>
            <View style={styles.upcomingRow}>
              {upcoming.map((iso) => (
                <Pressable
                  key={iso}
                  style={styles.chip}
                  onPress={() => quickSession(iso)}
                >
                  <Text style={styles.chipLabel}>{formatDate(iso)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top assiduité</Text>
          <Pressable onPress={() => navigation.navigate('Stats')}>
            <Text style={styles.link}>Voir tout</Text>
          </Pressable>
        </View>

        {topPlayers.length === 0 || activeSessionsCount === 0 ? (
          <Card>
            <EmptyState
              title="Pas encore de stats"
              description="Démarrez une séance pour commencer à mesurer la présence de vos joueurs."
            />
          </Card>
        ) : (
          <Card padded={false} style={styles.listCard}>
            {topPlayers.map((stat, index) => (
              <View
                key={stat.player.id}
                style={[
                  styles.playerRow,
                  index < topPlayers.length - 1 && styles.rowDivider,
                ]}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Avatar name={stat.player.name} photoUri={stat.player.photoUri} size={36} />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {stat.player.name}
                  </Text>
                  <View style={styles.barWrapper}>
                    <ProgressBar value={stat.ratio} height={6} />
                  </View>
                </View>
                <Text style={styles.playerPct}>{Math.round(stat.ratio * 100)}%</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroText: { flex: 1 },
  heroTitle: { ...typography.h3, color: colors.textPrimary },
  heroHint: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  heroMeta: { ...typography.caption, color: colors.textMuted, marginTop: 8 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  actionGlyph: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  upcomingBlock: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  upcomingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  chipLabel: { color: colors.primary, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },
  link: { ...typography.bodyBold, color: colors.primary },
  listCard: {
    marginHorizontal: spacing.lg,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { ...typography.caption, color: colors.primary, fontWeight: '800' },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: { ...typography.bodyBold, color: colors.textPrimary },
  barWrapper: { marginTop: 6 },
  playerPct: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    minWidth: 44,
    textAlign: 'right',
  },
});
