import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { formatDate } from '@/utils/date';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Sessions'>;

export function SessionsListScreen({ navigation }: Props) {
  const { sessions, players, getSessionAttendance, createSession } = useData();

  const newSession = async () => {
    const s = await createSession();
    navigation.navigate('Session', { sessionId: s.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {sessions.length === 0 ? (
          <Card>
            <EmptyState
              title="Aucune séance"
              description="Lancez votre première séance pour commencer le suivi."
            >
              <Button label="Nouvelle session" onPress={newSession} fullWidth />
            </EmptyState>
          </Card>
        ) : (
          <>
            <Button label="Nouvelle session" onPress={newSession} fullWidth />
            <View style={{ height: spacing.md }} />
            {sessions.map((s) => {
              const att = getSessionAttendance(s.id);
              const present = att.filter(
                (a) => STATUS_META[a.status]?.countsPresent,
              ).length;
              const ratio =
                players.length === 0 ? 0 : present / players.length;
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
                      <Text
                        style={[
                          styles.rowTitle,
                          s.cancelled && styles.rowTitleCancelled,
                        ]}
                      >
                        {formatDate(s.date)}
                      </Text>
                      {s.cancelled ? (
                        <View style={styles.cancelPill}>
                          <Text style={styles.cancelPillLabel}>Annulée</Text>
                        </View>
                      ) : (
                        <Text style={styles.rowPct}>
                          {Math.round(ratio * 100)}%
                        </Text>
                      )}
                    </View>
                    <Text style={styles.rowMeta}>
                      {s.cancelled
                        ? 'Exclue du taux de présence'
                        : `${present} présents / ${players.length} joueurs`}
                    </Text>
                    {!s.cancelled ? (
                      <View style={styles.barWrap}>
                        <ProgressBar value={ratio} height={6} />
                      </View>
                    ) : null}
                  </Card>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  row: {},
  rowCancelled: { opacity: 0.6 },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: { ...typography.h3, color: colors.textPrimary },
  rowTitleCancelled: { textDecorationLine: 'line-through' },
  rowPct: { ...typography.bodyBold, color: colors.primary },
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
});
