import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDate } from '@/utils/date';
import type { AttendanceStatus, Player } from '@/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Session'>;

export function SessionScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const {
    players,
    sessions,
    getStatus,
    setAttendance,
    bulkSetAttendance,
    deleteSession,
  } = useData();

  const session = sessions.find((s) => s.id === sessionId);
  const [query, setQuery] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: session ? formatDate(session.date) : 'Séance',
    });
  }, [navigation, session]);

  const presentCount = useMemo(() => {
    return players.filter((p) => getStatus(sessionId, p.id) === 'present').length;
  }, [players, getStatus, sessionId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return players;
    const q = query.toLowerCase();
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, query]);

  const toggle = async (player: Player) => {
    const current = getStatus(sessionId, player.id);
    const next: AttendanceStatus = current === 'present' ? 'absent' : 'present';
    try {
      await Haptics.selectionAsync();
    } catch {}
    await setAttendance(sessionId, player.id, next);
  };

  const markAllPresent = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    await bulkSetAttendance(sessionId, 'present');
  };

  const markAllAbsent = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    await bulkSetAttendance(sessionId, 'absent');
  };

  const confirmDelete = () => {
    Alert.alert(
      'Supprimer la séance ?',
      'Cette action est définitive.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(sessionId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>Séance introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.summaryBar}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryValue}>
            {presentCount}<Text style={styles.summaryDivider}>/{players.length}</Text>
          </Text>
          <Text style={styles.summaryLabel}>Présents</Text>
        </View>
        <View style={styles.summaryActions}>
          <Pressable style={styles.chip} onPress={markAllPresent}>
            <Text style={styles.chipLabel}>Tout présent</Text>
          </Pressable>
          <Pressable style={[styles.chip, styles.chipGhost]} onPress={markAllAbsent}>
            <Text style={[styles.chipLabel, styles.chipLabelGhost]}>Tout absent</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => {
          const status = getStatus(sessionId, item.id);
          const isPresent = status === 'present';
          return (
            <Pressable onPress={() => toggle(item)}>
              <Card
                padded={false}
                style={[
                  styles.row,
                  isPresent ? styles.rowPresent : styles.rowAbsent,
                ]}
              >
                <Avatar name={item.name} size={44} />
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text
                    style={[
                      styles.rowStatus,
                      isPresent ? styles.rowStatusPresent : styles.rowStatusAbsent,
                    ]}
                  >
                    {isPresent ? 'Présent' : 'Absent'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.toggle,
                    isPresent ? styles.toggleOn : styles.toggleOff,
                  ]}
                >
                  <View
                    style={[
                      styles.knob,
                      isPresent ? styles.knobOn : styles.knobOff,
                    ]}
                  />
                </View>
              </Card>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <Button label="Supprimer la séance" variant="ghost" onPress={confirmDelete} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...typography.body, color: colors.textMuted },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  summaryBlock: { flex: 0 },
  summaryValue: { ...typography.number, fontSize: 28, color: colors.textPrimary },
  summaryDivider: { color: colors.textMuted, fontSize: 18, fontWeight: '600' },
  summaryLabel: { ...typography.caption, color: colors.textSecondary },
  summaryActions: { flexDirection: 'row', gap: spacing.sm, flexShrink: 1 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  chipGhost: { backgroundColor: colors.primarySoft },
  chipLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  chipLabelGhost: { color: colors.primary },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderLeftWidth: 4,
  },
  rowPresent: { borderLeftColor: colors.success },
  rowAbsent: { borderLeftColor: colors.border },
  rowText: { flex: 1 },
  rowName: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 16 },
  rowStatus: { ...typography.caption, marginTop: 2 },
  rowStatusPresent: { color: colors.success, fontWeight: '700' },
  rowStatusAbsent: { color: colors.textMuted },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: colors.success },
  toggleOff: { backgroundColor: colors.border },
  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
});
