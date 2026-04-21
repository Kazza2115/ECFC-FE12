import React from 'react';
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
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { StatCard } from '@/components/StatCard';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDate } from '@/utils/date';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList, TabParamList } from '@/navigation/AppNavigator';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function DashboardScreen({ navigation }: { navigation: Nav }) {
  const { players, sessions, playerStats, globalRatio, createSession } = useData();

  const topPlayers = playerStats.slice(0, 5);
  const lastSession = sessions[0];

  const handleNewSession = async () => {
    const session = await createSession();
    navigation.navigate('Session', { sessionId: session.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour Coach</Text>
            <Text style={styles.subtitle}>Étoile Carouge FC · Juniors</Text>
          </View>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>ECFC</Text>
          </View>
        </View>

        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <ProgressRing value={globalRatio} size={110} strokeWidth={10} label="global" />
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Taux de présence</Text>
              <Text style={styles.heroHint}>
                {sessions.length === 0
                  ? 'Lancez votre première séance'
                  : `${sessions.length} séance${sessions.length > 1 ? 's' : ''} enregistrée${sessions.length > 1 ? 's' : ''}`}
              </Text>
              {lastSession ? (
                <Text style={styles.heroMeta}>Dernière : {formatDate(lastSession.date)}</Text>
              ) : null}
            </View>
          </View>
        </Card>

        <View style={styles.statsRow}>
          <StatCard label="Joueurs" value={players.length} accent={colors.primary} />
          <View style={{ width: spacing.md }} />
          <StatCard label="Séances" value={sessions.length} accent={colors.accent} />
        </View>

        <View style={styles.actions}>
          <Button
            label="Nouvelle session"
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top assiduité</Text>
          <Pressable onPress={() => navigation.navigate('Stats')}>
            <Text style={styles.link}>Voir tout</Text>
          </Pressable>
        </View>

        {topPlayers.length === 0 || sessions.length === 0 ? (
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
                <Avatar name={stat.player.name} size={36} />
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{stat.player.name}</Text>
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
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
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
  playerInfo: { flex: 1 },
  playerName: { ...typography.bodyBold, color: colors.textPrimary },
  barWrapper: { marginTop: 6 },
  playerPct: { ...typography.bodyBold, color: colors.textPrimary, minWidth: 44, textAlign: 'right' },
});
