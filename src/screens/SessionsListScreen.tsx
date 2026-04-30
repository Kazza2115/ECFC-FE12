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
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { STATUS_META } from '@/constants/statuses';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';
import { confirm, notify } from '@/utils/confirm';
import { formatDate } from '@/utils/date';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Sessions'>;

type Filter = 'all' | 'training' | 'match';

export function SessionsListScreen({ navigation }: Props) {
  const { sessions, players, getSessionAttendance, createSession } = useData();
  const [filter, setFilter] = useState<Filter>('all');
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [opponent, setOpponent] = useState('');
  const [matchFormat, setMatchFormat] = useState<'match' | 'match_7x7'>('match');

  const filtered = useMemo(() => {
    if (filter === 'all') return sessions;
    if (filter === 'match') return sessions.filter((s) => isMatchKind(s.kind));
    return sessions.filter((s) => !isMatchKind(s.kind));
  }, [sessions, filter]);

  const startTraining = async () => {
    const s = await createSession({ kind: 'training' });
    navigation.navigate('Session', { sessionId: s.id });
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
    const s = await createSession({
      kind: matchFormat,
      label,
    });
    setMatchModalOpen(false);
    setOpponent('');
    setMatchFormat('match');
    navigation.navigate('Session', { sessionId: s.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.filterRow}>
          {(['all', 'training', 'match'] as Filter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
            >
              <Text
                style={[
                  styles.filterLabel,
                  filter === f && styles.filterLabelActive,
                ]}
              >
                {f === 'all'
                  ? 'Tout'
                  : f === 'training'
                  ? 'Entraînements'
                  : 'Matchs'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.quickActions}>
          <View style={{ flex: 1 }}>
            <Button label="+ Entraînement" onPress={startTraining} fullWidth />
          </View>
          <View style={{ width: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Button
              label="+ Match"
              onPress={openMatchModal}
              variant="secondary"
              fullWidth
            />
          </View>
        </View>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              title={
                filter === 'match'
                  ? 'Aucun match'
                  : filter === 'training'
                  ? 'Aucun entraînement'
                  : 'Aucune séance'
              }
              description="Utilisez les boutons ci-dessus pour en créer un."
            />
          </Card>
        ) : (
          filtered.map((s) => {
            const isMatch = isMatchKind(s.kind);
            const att = getSessionAttendance(s.id);
            const presentOrCalled = att.filter((a) =>
              STATUS_META[a.status]?.countsPresent,
            ).length;
            const ratio =
              players.length === 0 ? 0 : presentOrCalled / players.length;
            return (
              <Pressable
                key={s.id}
                onPress={() =>
                  navigation.navigate('Session', { sessionId: s.id })
                }
              >
                <Card
                  style={[styles.row, s.cancelled && styles.rowCancelled]}
                >
                  <View style={styles.rowHeader}>
                    <View style={styles.rowTitleBlock}>
                      <View
                        style={[
                          styles.kindBadge,
                          isMatch
                            ? styles.kindBadgeMatch
                            : styles.kindBadgeTraining,
                        ]}
                      >
                        <Text
                          style={[
                            styles.kindBadgeText,
                            isMatch
                              ? styles.kindBadgeTextMatch
                              : styles.kindBadgeTextTraining,
                          ]}
                        >
                          {isMatch ? '⚽ Match' : '🏋️ Entraînement'}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.rowTitle,
                          s.cancelled && styles.rowTitleCancelled,
                        ]}
                      >
                        {formatDate(s.date)}
                      </Text>
                      {!s.cancelled && !s.confirmed ? (
                        <View style={styles.draftPill}>
                          <Text style={styles.draftPillLabel}>Brouillon</Text>
                        </View>
                      ) : null}
                      {!s.cancelled && s.confirmed ? (
                        <View style={styles.confirmedPill}>
                          <Text style={styles.confirmedPillLabel}>
                            ✓ Confirmé
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {s.cancelled ? (
                      <View style={styles.cancelPill}>
                        <Text style={styles.cancelPillLabel}>Annulé</Text>
                      </View>
                    ) : (
                      <Text style={styles.rowPct}>
                        {isMatch
                          ? `${presentOrCalled}/${players.length}`
                          : `${Math.round(ratio * 100)}%`}
                      </Text>
                    )}
                  </View>
                  {s.label ? (
                    <Text style={styles.rowLabel}>vs {s.label}</Text>
                  ) : null}
                  <Text style={styles.rowMeta}>
                    {s.cancelled
                      ? 'Exclu des statistiques'
                      : isMatch
                      ? `${presentOrCalled} convoqués / ${players.length}`
                      : `${presentOrCalled} présents / ${players.length}`}
                  </Text>
                  {!s.cancelled ? (
                    <View style={styles.barWrap}>
                      <ProgressBar value={ratio} height={6} />
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            );
          })
        )}
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
            <TextInput
              style={styles.input}
              placeholder="Adversaire"
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
              <Button label="Créer" onPress={startMatch} />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  filterRow: { flexDirection: 'row', gap: spacing.xs },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  filterLabelActive: { color: '#FFFFFF' },
  quickActions: { flexDirection: 'row' },
  row: {},
  rowCancelled: { opacity: 0.6 },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowTitleBlock: { flex: 1, minWidth: 0, gap: 4 },
  kindBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  kindBadgeTraining: { backgroundColor: colors.primarySoft },
  kindBadgeMatch: { backgroundColor: '#FEF3C7' },
  kindBadgeText: { fontSize: 11, fontWeight: '700' },
  kindBadgeTextTraining: { color: colors.primary },
  kindBadgeTextMatch: { color: '#B45309' },
  rowTitle: { ...typography.h3, color: colors.textPrimary },
  rowTitleCancelled: { textDecorationLine: 'line-through' },
  rowPct: { ...typography.bodyBold, color: colors.primary },
  rowLabel: { ...typography.body, color: colors.textPrimary, marginTop: 2 },
  rowMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  barWrap: { marginTop: spacing.sm },
  cancelPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  cancelPillLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  draftPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: '#FEF3C7',
    marginTop: 4,
  },
  draftPillLabel: {
    ...typography.caption,
    color: '#92400E',
    fontWeight: '800',
    fontSize: 11,
  },
  confirmedPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: '#DCFCE7',
    marginTop: 4,
  },
  confirmedPillLabel: {
    ...typography.caption,
    color: '#166534',
    fontWeight: '800',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: { width: '100%', maxWidth: 420 },
  modalTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
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
