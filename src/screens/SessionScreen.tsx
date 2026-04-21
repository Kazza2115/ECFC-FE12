import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import {
  PRIMARY_STATUSES,
  SECONDARY_STATUSES,
  STATUS_META,
} from '@/constants/statuses';
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
    toggleCancelled,
  } = useData();

  const session = sessions.find((s) => s.id === sessionId);
  const cancelled = !!session?.cancelled;
  const [sheetPlayer, setSheetPlayer] = useState<Player | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: session ? formatDate(session.date) : 'Séance',
    });
  }, [navigation, session]);

  const presentCount = useMemo(() => {
    return players.filter((p) => {
      const s = getStatus(sessionId, p.id);
      return STATUS_META[s]?.countsPresent;
    }).length;
  }, [players, getStatus, sessionId]);

  const pickStatus = async (playerId: string, status: AttendanceStatus) => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    await setAttendance(sessionId, playerId, status);
  };

  const markAll = async (status: AttendanceStatus) => {
    try {
      await Haptics.notificationAsync(
        status === 'present'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    } catch {}
    await bulkSetAttendance(sessionId, status);
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
      <View style={styles.topBar}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryValue}>
            {presentCount}
            <Text style={styles.summaryDivider}>/{players.length}</Text>
          </Text>
          <Text style={styles.summaryLabel}>
            {cancelled ? 'Séance annulée' : 'Présents'}
          </Text>
        </View>
        <View style={styles.cancelBlock}>
          <View>
            <Text style={styles.cancelTitle}>Entraînement annulé</Text>
            <Text style={styles.cancelHint}>Exclu du taux de présence</Text>
          </View>
          <Switch
            value={cancelled}
            onValueChange={async () => {
              try {
                await Haptics.selectionAsync();
              } catch {}
              await toggleCancelled(sessionId);
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {!cancelled ? (
        <View style={styles.bulkRow}>
          <Pressable style={styles.bulkChip} onPress={() => markAll('present')}>
            <Text style={styles.bulkLabel}>Tout présent</Text>
          </Pressable>
          <Pressable
            style={[styles.bulkChip, styles.bulkChipGhost]}
            onPress={() => markAll('unexcused')}
          >
            <Text style={[styles.bulkLabel, styles.bulkLabelGhost]}>
              Tout absent
            </Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={players}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => {
          const status = getStatus(sessionId, item.id);
          const meta = STATUS_META[status];
          const isSecondary = !meta.primary;
          return (
            <Card
              padded={false}
              style={[
                styles.row,
                cancelled && styles.rowDisabled,
                {
                  borderLeftColor: meta.color,
                },
              ]}
            >
              <Avatar name={item.name} size={40} />
              <View style={styles.rowText}>
                <Text
                  style={[
                    styles.rowName,
                    cancelled && styles.rowNameDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text style={[styles.rowStatus, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>
              <View style={styles.segmented}>
                {PRIMARY_STATUSES.map((key) => {
                  const sMeta = STATUS_META[key];
                  const active = status === key;
                  return (
                    <Pressable
                      key={key}
                      disabled={cancelled}
                      onPress={() => pickStatus(item.id, key)}
                      style={[
                        styles.segBtn,
                        active && { backgroundColor: sMeta.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.segGlyph,
                          { color: active ? sMeta.color : colors.textMuted },
                        ]}
                      >
                        {sMeta.glyph}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  disabled={cancelled}
                  onPress={() => setSheetPlayer(item)}
                  style={[
                    styles.segBtn,
                    isSecondary && { backgroundColor: meta.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.segGlyph,
                      {
                        color: isSecondary ? meta.color : colors.textMuted,
                        fontSize: isSecondary ? 11 : 14,
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {isSecondary ? meta.short : '⋯'}
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />

      <View style={styles.footer}>
        <Button
          label="Supprimer la séance"
          variant="ghost"
          onPress={confirmDelete}
          fullWidth
        />
      </View>

      <BottomSheet
        visible={!!sheetPlayer}
        title={
          sheetPlayer ? `Statut de ${sheetPlayer.name}` : 'Choisir un statut'
        }
        onClose={() => setSheetPlayer(null)}
      >
        <View style={styles.sheetGrid}>
          {[...PRIMARY_STATUSES, ...SECONDARY_STATUSES].map((key) => {
            const sMeta = STATUS_META[key];
            const active =
              sheetPlayer && getStatus(sessionId, sheetPlayer.id) === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.sheetItem,
                  {
                    backgroundColor: active ? sMeta.bg : colors.background,
                    borderColor: active ? sMeta.color : colors.border,
                  },
                ]}
                onPress={async () => {
                  if (!sheetPlayer) return;
                  await pickStatus(sheetPlayer.id, key);
                  setSheetPlayer(null);
                }}
              >
                <Text style={[styles.sheetGlyph, { color: sMeta.color }]}>
                  {sMeta.glyph}
                </Text>
                <Text style={styles.sheetLabel}>{sMeta.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...typography.body, color: colors.textMuted },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  summaryBlock: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  summaryValue: { ...typography.number, fontSize: 30, color: colors.textPrimary },
  summaryDivider: { color: colors.textMuted, fontSize: 18, fontWeight: '600' },
  summaryLabel: { ...typography.body, color: colors.textSecondary },
  cancelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelTitle: { ...typography.bodyBold, color: colors.textPrimary },
  cancelHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  bulkRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bulkChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  bulkChipGhost: { backgroundColor: colors.primarySoft },
  bulkLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  bulkLabelGhost: { color: colors.primary },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    paddingRight: spacing.xs,
    gap: spacing.sm,
    borderLeftWidth: 4,
  },
  rowDisabled: { opacity: 0.4 },
  rowText: { flex: 1, minWidth: 0 },
  rowName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  rowNameDisabled: { textDecorationLine: 'line-through' },
  rowStatus: { ...typography.caption, marginTop: 2, fontWeight: '600' },
  segmented: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 3,
  },
  segBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segGlyph: { fontSize: 16, fontWeight: '800' },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sheetItem: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  sheetGlyph: { fontSize: 18, fontWeight: '800' },
  sheetLabel: { ...typography.bodyBold, color: colors.textPrimary, flexShrink: 1 },
});
