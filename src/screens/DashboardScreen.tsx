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
    activeTrainingsCount,
    activeMatchesCount,
    createSession,
    syncStatus,
    lastSyncError,
    refreshFromCloud,
  } = useData();

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
    const session = await createSession({
      kind: matchFormat,
      label: label || undefined,
    });
    setMatchModalOpen(false);
    setOpponent('');
    setMatchFormat('match');
    navigation.navigate('Session', { sessionId: session.id });
  };

  const quickSession = (iso: string) => startTraining(iso);

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
            <SyncPill
              status={syncStatus}
              lastError={lastSyncError}
              onRefresh={refreshFromCloud}
            />
            <ClubLogo size={48} />
          </View>
        </View>

        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <ProgressRing value={globalRatio} size={110} strokeWidth={10} label="global" />
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Taux de présence</Text>
              <Text style={styles.heroHint}>
                {activeTrainingsCount === 0
                  ? 'Lancez votre premier entraînement'
                  : `${activeTrainingsCount} entraînement${activeTrainingsCount > 1 ? 's' : ''} pris${activeTrainingsCount > 1 ? 'es' : 'e'} en compte`}
              </Text>
              {lastSession ? (
                <Text style={styles.heroMeta}>
                  Dernière {isMatchKind(lastSession.kind) ? 'convocation' : 'séance'} : {formatDate(lastSession.date)}
                  {lastSession.cancelled ? ' (annulée)' : ''}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

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

        <View style={styles.actions}>
          <View style={styles.actionsRow}>
            <View style={styles.actionCol}>
              <Button
                label="Entraînement"
                onPress={() => startTraining()}
                icon={<Text style={styles.actionGlyph}>＋</Text>}
                fullWidth
              />
            </View>
            <View style={{ width: spacing.sm }} />
            <View style={styles.actionCol}>
              <Button
                label="Match"
                onPress={openMatchModal}
                variant="secondary"
                icon={<Text style={styles.actionGlyphDark}>⚽</Text>}
                fullWidth
              />
            </View>
          </View>
          <View style={{ height: spacing.sm }} />
          <Button
            label="Voir toutes les séances"
            onPress={() => navigation.navigate('Sessions')}
            variant="ghost"
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
  heroCard: { marginHorizontal: spacing.lg, marginTop: spacing.sm },
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
  actions: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  actionsRow: { flexDirection: 'row' },
  actionCol: { flex: 1 },
  actionGlyph: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  actionGlyphDark: { color: colors.textPrimary, fontSize: 16 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { width: '100%', maxWidth: 420 },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  modalHint: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  formatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
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
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  formatOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  formatOptionTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  formatOptionTitleActive: { color: colors.primary },
  formatOptionSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
});
