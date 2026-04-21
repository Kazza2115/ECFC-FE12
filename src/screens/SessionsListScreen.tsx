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
import { useData } from '@/context/DataContext';
import { colors, spacing, typography } from '@/theme';
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
              const present = att.filter((a) => a.status === 'present').length;
              const ratio = players.length === 0 ? 0 : present / players.length;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => navigation.navigate('Session', { sessionId: s.id })}
                >
                  <Card style={styles.row}>
                    <View style={styles.rowHeader}>
                      <Text style={styles.rowTitle}>{formatDate(s.date)}</Text>
                      <Text style={styles.rowPct}>{Math.round(ratio * 100)}%</Text>
                    </View>
                    <Text style={styles.rowMeta}>
                      {present} présents / {players.length} joueurs
                    </Text>
                    <View style={styles.barWrap}>
                      <ProgressBar value={ratio} height={6} />
                    </View>
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
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: { ...typography.h3, color: colors.textPrimary },
  rowPct: { ...typography.bodyBold, color: colors.primary },
  rowMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  barWrap: { marginTop: spacing.sm },
});
