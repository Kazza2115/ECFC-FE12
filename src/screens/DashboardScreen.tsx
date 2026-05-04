import React, { useMemo, useState } from 'react';
import { isMatchKind } from '@/types';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { AnimatedFadeIn } from '@/components/AnimatedFadeIn';
import { GradientBackdrop } from '@/components/GradientBackdrop';
import { TeamLogo } from '@/components/TeamLogo';
import { SyncPill } from '@/components/SyncPill';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProfileMenu } from '@/components/ProfileMenu';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { StatCard } from '@/components/StatCard';
import { colors, radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';
import { formatDate, nextTrainingDates, sameDay } from '@/utils/date';
import { notify } from '@/utils/confirm';
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
    activeTrainingsCount,
    activeMatchesCount,
    createSession,
    syncStatus,
    lastSyncError,
    refreshFromCloud,
  } = useData();
  const { profile } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const coachFirstName = (profile?.displayName ?? '').split(' ')[0] || '';
  const greeting = coachFirstName
    ? `Bonjour ${coachFirstName}`
    : 'Bonjour Coach';
  const teamLabel = profile?.teamName ?? 'Mon équipe';

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [matchFormat, setMatchFormat] = useState<'match' | 'match_7x7'>('match');

  const topPlayers = playerStats.slice(0, 5);
  const lastSession = sessions[0];

  const upcoming = useMemo(() => {
    const candidates = nextTrainingDates(3);
    return candidates
      .filter(
        (iso) =>
          !sessions.some(
            (s) => !s.cancelled && !isMatchKind(s.kind) && sameDay(s.date, iso),
          ),
      )
      .slice(0, 3);
  }, [sessions]);

  const startTraining = async (iso?: string) => {
    const session = await createSession({ kind: 'training', date: iso });
    navigation.navigate('Session', { sessionId: session.id });
  };

  const openMatchModal = () => {
    setOpponent('');
    setMatchModalOpen(true);
  };

  const startMatch = async () => {
    const label = opponent.trim();
    if (!label) {
      await notify(
        'Adversaire requis',
        'Indique le nom de l\'équipe adverse pour créer le match.',
      );
      return;
    }
    const session = await createSession({
      kind: matchFormat,
      label,
    });
    setMatchModalOpen(false);
    setOpponent('');
    setMatchFormat('match');
    navigation.navigate('Session', { sessionId: session.id });
  };

  const quickSession = (iso: string) => startTraining(iso);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Full-bleed soft halo behind the header — extends behind the
          status bar on native, gives the dashboard that HeroUI hero
          glow without taking layout space. */}
      <View pointerEvents="none" style={styles.topHalo}>
        <GradientBackdrop
          from={colors.primarySoft}
          to={colors.background}
          opacity={1}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedFadeIn delay={0}>
          <View style={styles.header}>
            <View style={styles.headerControls}>
              <SyncPill
                status={syncStatus}
                lastError={lastSyncError}
                onRefresh={refreshFromCloud}
              />
              <ThemeToggle />
              <ProfileMenu />
            </View>
            <View style={styles.headerHero}>
              <TeamLogo
                teamId={profile?.teamId}
                logoUrl={profile?.teamLogoUrl}
                size={52}
              />
              <View style={styles.headerHeroText}>
                <Text style={styles.subtitle}>{teamLabel}</Text>
                <Text style={styles.greeting}>{greeting}</Text>
              </View>
            </View>
          </View>
        </AnimatedFadeIn>

        <AnimatedFadeIn delay={70}>
        <Card style={styles.heroCard}>
          <GradientBackdrop
            from={colors.primarySoft}
            to={colors.surface}
            radius={radius.lg}
            opacity={1}
          />
          <View style={styles.heroRow}>
            <ProgressRing value={globalRatio} size={104} strokeWidth={10} label="actif" />
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Taux d'activité</Text>
              <Text style={styles.heroHint}>
                {activeTrainingsCount === 0
                  ? 'Lancez votre premier entraînement'
                  : `${activeTrainingsCount} entraînement${activeTrainingsCount > 1 ? 's' : ''} pris${activeTrainingsCount > 1 ? 'es' : 'e'} en compte`}
              </Text>
              {lastSession ? (
                <Text style={styles.heroMeta}>
                  Dernière {isMatchKind(lastSession.kind) ? 'convocation' : 'séance'} : {formatDate(lastSession.date)}
                  {lastSession.cancelled ? ' · annulée' : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
        </AnimatedFadeIn>

        <AnimatedFadeIn delay={140}>
        <View style={styles.statsRow}>
          <StatCard
            label="Entraînements"
            value={activeTrainingsCount}
            accent={colors.primary}
          />
          <View style={{ width: spacing.md }} />
          <StatCard
            label="Matchs"
            value={activeMatchesCount}
            accent={colors.accent}
          />
        </View>
        </AnimatedFadeIn>

        <AnimatedFadeIn delay={210}>
        <View style={styles.actions}>
          <View style={styles.actionsRow}>
            <View style={styles.actionCol}>
              <Button
                label="Entraînement"
                onPress={() => startTraining()}
                icon={<Text style={styles.actionGlyphLight}>＋</Text>}
                fullWidth
              />
            </View>
            <View style={{ width: spacing.sm }} />
            <View style={styles.actionCol}>
              <Button
                label="Match"
                onPress={openMatchModal}
                variant="secondary"
                icon={<Text style={styles.actionGlyph}>⚽</Text>}
                fullWidth
              />
            </View>
          </View>
          <View style={{ height: spacing.xs }} />
          <Button
            label="Toutes les séances"
            onPress={() => navigation.navigate('Sessions')}
            variant="ghost"
            fullWidth
          />
        </View>
        </AnimatedFadeIn>

        {upcoming.length > 0 ? (
          <AnimatedFadeIn delay={280}>
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
          </AnimatedFadeIn>
        ) : null}

        <AnimatedFadeIn delay={upcoming.length > 0 ? 350 : 280}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top assiduité</Text>
          <Pressable onPress={() => navigation.navigate('Stats')}>
            <Text style={styles.link}>Voir tout</Text>
          </Pressable>
        </View>

        {topPlayers.length === 0 || activeTrainingsCount === 0 ? (
          <Card>
            <EmptyState
              title="Pas encore de stats"
              description="Démarrez un entraînement pour commencer à mesurer la présence de vos joueurs."
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
        </AnimatedFadeIn>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <Modal
        visible={matchModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMatchModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouveau match</Text>
            <Text style={styles.modalHint}>
              Crée la convocation pour un match à venir.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Adversaire (ex. Servette FC)"
              placeholderTextColor={colors.textMuted}
              value={opponent}
              onChangeText={setOpponent}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={startMatch}
            />

            <Text style={styles.formatLabel}>Format</Text>
            <View style={styles.formatRow}>
              <Pressable
                onPress={() => setMatchFormat('match')}
                style={[
                  styles.formatOption,
                  matchFormat === 'match' && styles.formatOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.formatOptionTitle,
                    matchFormat === 'match' && styles.formatOptionTitleActive,
                  ]}
                >
                  11 vs 11
                </Text>
                <Text style={styles.formatOptionSub}>Match standard</Text>
              </Pressable>
              <Pressable
                onPress={() => setMatchFormat('match_7x7')}
                style={[
                  styles.formatOption,
                  matchFormat === 'match_7x7' && styles.formatOptionActive,
                ]}
              >
                <Text
                  style={[
                    styles.formatOptionTitle,
                    matchFormat === 'match_7x7' && styles.formatOptionTitleActive,
                  ]}
                >
                  7 vs 7
                </Text>
                <Text style={styles.formatOptionSub}>
                  4 quart-temps · 4 équipes
                </Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setMatchModalOpen(false)}
              />
              <View style={{ width: spacing.sm }} />
              <Button label="Créer le match" onPress={startMatch} />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemedColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  topHalo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    overflow: 'hidden',
  },
  content: { paddingBottom: spacing.xxl },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  headerHeroText: {
    alignItems: 'flex-start',
    flexShrink: 1,
  },
  greeting: { ...typography.largeTitle, color: c.textPrimary, marginTop: 2 },
  subtitle: {
    ...typography.micro,
    color: c.textMuted,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroText: { flex: 1 },
  heroTitle: { ...typography.h2, color: c.textPrimary },
  heroHint: { ...typography.body, color: c.textMuted, marginTop: 4 },
  heroMeta: { ...typography.caption, color: c.textMuted, marginTop: 10 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actions: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionCol: { flex: 1 },
  actionGlyphLight: { color: c.onPrimary, fontSize: 17, fontWeight: '800' },
  actionGlyph: { color: c.primary, fontSize: 17 },
  upcomingBlock: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionLabel: {
    ...typography.micro,
    color: c.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  upcomingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: c.primarySoft,
  },
  chipLabel: { color: c.primary, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, color: c.textPrimary },
  link: { ...typography.bodyBold, color: c.primary },
  listCard: { marginHorizontal: spacing.lg },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: c.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { ...typography.caption, color: c.primary, fontWeight: '800' },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: { ...typography.bodyBold, color: c.textPrimary },
  barWrapper: { marginTop: 6 },
  playerPct: {
    ...typography.bodyBold,
    color: c.textPrimary,
    minWidth: 44,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { width: '100%', maxWidth: 420 },
  modalTitle: { ...typography.h3, color: c.textPrimary },
  modalHint: {
    ...typography.body,
    color: c.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: c.textPrimary,
    backgroundColor: c.background,
  },
  formatLabel: {
    ...typography.caption,
    color: c.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  formatRow: { flexDirection: 'row', gap: spacing.sm },
  formatOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
  },
  formatOptionActive: {
    borderColor: c.primary,
    backgroundColor: c.primarySoft,
  },
  formatOptionTitle: {
    ...typography.bodyBold,
    color: c.textPrimary,
    fontSize: 15,
  },
  formatOptionTitleActive: { color: c.primary },
  formatOptionSub: {
    ...typography.caption,
    color: c.textSecondary,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
});
