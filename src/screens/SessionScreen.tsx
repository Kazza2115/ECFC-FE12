import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
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
  STATUS_META,
  labelForStatus,
  primaryStatusesFor,
  secondaryStatusesFor,
  shortForStatus,
} from '@/constants/statuses';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDate } from '@/utils/date';
import { confirm, notify } from '@/utils/confirm';
import type { AttendanceStatus, Player, SessionKind } from '@/types';
import { isMatchKind } from '@/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Session'>;

export function SessionScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const {
    players,
    sessions,
    attendances,
    getStatus,
    setAttendance,
    bulkSetAttendance,
    deleteSession,
    toggleCancelled,
    setSessionConfirmed,
  } = useData();

  const session = sessions.find((s) => s.id === sessionId);
  const kind: SessionKind = session?.kind ?? 'training';
  const isMatch = isMatchKind(kind);
  const cancelled = !!session?.cancelled;
  const isConfirmed = !!session?.confirmed;

  const [sheetPlayer, setSheetPlayer] = useState<Player | null>(null);

  const primaryStatuses = primaryStatusesFor(kind);
  const allStatuses = useMemo(
    () => [...primaryStatuses, ...secondaryStatusesFor(kind)],
    [kind, primaryStatuses],
  );

  // Re-evaluate "should keep" on every render so the unmount cleanup
  // sees the latest state. Trainings rely on the explicit "Confirmer"
  // banner; matches keep themselves the moment the coach convokes
  // anyone or starts the chrono.
  const keepRef = useRef(false);
  keepRef.current =
    attendances.some((a) => a.sessionId === sessionId) ||
    !!session?.cancelled ||
    (!isMatch && !!session?.confirmed) ||
    !!session?.startedAt;
  const explicitlyDeletedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (explicitlyDeletedRef.current) return;
      if (keepRef.current) return;
      deleteSession(sessionId).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: session
        ? `${isMatch ? '⚽ ' : ''}${formatDate(session.date)}`
        : isMatch
        ? 'Match'
        : 'Séance',
    });
  }, [navigation, session, isMatch]);

  const presentCount = useMemo(() => {
    return players.filter((p) => {
      const s = getStatus(sessionId, p.id);
      return STATUS_META[s]?.countsPresent;
    }).length;
  }, [players, getStatus, sessionId]);

  const requiredConvoqués = session?.kind === 'match_7x7' ? 7 : 11;
  const matchFormatLabel = session?.kind === 'match_7x7' ? '7 vs 7' : '11 vs 11';

  const handleModeLive = async () => {
    if (presentCount < requiredConvoqués) {
      await notify(
        'Pas assez de convoqués',
        `Tu as convoqué ${presentCount} joueur${
          presentCount > 1 ? 's' : ''
        }. Il en faut au moins ${requiredConvoqués} pour démarrer un match ${matchFormatLabel}.`,
      );
      return;
    }
    navigation.navigate('MatchLive', { sessionId });
  };

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

  const handleToggleCancelled = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    await toggleCancelled(sessionId);
  };

  const confirmDelete = async () => {
    const ok = await confirm({
      title: isMatch ? 'Supprimer le match ?' : 'Supprimer la séance ?',
      message: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    explicitlyDeletedRef.current = true;
    await deleteSession(sessionId);
    navigation.goBack();
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

  const summaryLabel = cancelled
    ? isMatch ? 'Match annulé' : 'Séance annulée'
    : isMatch ? 'Convoqués' : 'Présents';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.topBar}>
        <View style={styles.summaryRow}>
          <View style={styles.kindBadge}>
            <Text style={styles.kindBadgeText}>
              {isMatch ? '⚽ Match' : '🏋️ Entraînement'}
            </Text>
          </View>
          {session.label ? (
            <Text style={styles.opponent} numberOfLines={1}>
              vs {session.label}
            </Text>
          ) : null}
        </View>

        <View style={styles.summaryBlock}>
          <Text style={styles.summaryValue}>
            {presentCount}
            <Text style={styles.summaryDivider}>/{players.length}</Text>
          </Text>
          <Text style={styles.summaryLabel}>{summaryLabel}</Text>
        </View>

        <View style={styles.cancelBlock}>
          <View>
            <Text style={styles.cancelTitle}>
              {isMatch ? 'Match annulé' : 'Entraînement annulé'}
            </Text>
            <Text style={styles.cancelHint}>Exclu des statistiques</Text>
          </View>
          <Switch
            value={cancelled}
            onValueChange={handleToggleCancelled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {!cancelled && !isMatch && !isConfirmed ? (
        <Pressable
          onPress={async () => {
            try {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch {}
            await setSessionConfirmed(sessionId, true);
            navigation.popToTop();
          }}
          style={styles.confirmBanner}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.confirmBannerTitle}>
              Entraînement à confirmer
            </Text>
            <Text style={styles.confirmBannerHint}>
              Sans confirmation, la séance sera supprimée en quittant
              l'écran.
            </Text>
          </View>
          <View style={styles.confirmBannerCta}>
            <Text style={styles.confirmBannerCtaLabel}>Confirmer</Text>
          </View>
        </Pressable>
      ) : null}

      {!cancelled && !isMatch && isConfirmed ? (
        <View style={styles.confirmedBanner}>
          <Text style={styles.confirmedGlyph}>✓</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.confirmedTitle}>
              {isMatch ? 'Match confirmé' : 'Entraînement confirmé'}
            </Text>
            <Text style={styles.confirmedHint}>
              La séance est enregistrée et synchronisée pour tout le staff.
            </Text>
          </View>
          <Pressable
            onPress={async () => {
              const ok = await confirm({
                title: 'Annuler la confirmation ?',
                message:
                  'La séance redevient un brouillon. Si tu n\'enregistres rien d\'autre, elle sera supprimée en quittant l\'écran.',
                confirmLabel: 'Annuler',
                destructive: true,
              });
              if (!ok) return;
              try {
                await Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                );
              } catch {}
              await setSessionConfirmed(sessionId, false);
            }}
            style={styles.confirmedUndo}
          >
            <Text style={styles.confirmedUndoLabel}>Annuler</Text>
          </Pressable>
        </View>
      ) : null}

      {!cancelled ? (
        <View style={styles.bulkRow}>
          <Pressable style={styles.bulkChip} onPress={() => markAll('present')}>
            <Text style={styles.bulkLabel}>
              {isMatch ? 'Tout convoquer' : 'Tout présent'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.bulkChip, styles.bulkChipGhost]}
            onPress={() => markAll(isMatch ? 'not_called' : 'unexcused')}
          >
            <Text style={[styles.bulkLabel, styles.bulkLabelGhost]}>
              {isMatch ? 'Tout non convoquer' : 'Tout absent'}
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
          const isSecondary = !primaryStatuses.includes(status);
          return (
            <Card
              padded={false}
              style={[
                styles.row,
                cancelled && styles.rowDisabled,
                { borderLeftColor: meta.color },
              ]}
            >
              <Avatar name={item.name} photoUri={item.photoUri} size={40} />
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
                  {labelForStatus(kind, status)}
                </Text>
              </View>
              <View style={styles.segmented}>
                {primaryStatuses.map((key) => {
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
                    {isSecondary ? shortForStatus(kind, status) : '⋯'}
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />

      <View style={styles.footer}>
        {isMatch && !cancelled ? (
          <>
            <Button
              label="⚡ Mode Live"
              onPress={handleModeLive}
              fullWidth
            />
            <View style={{ height: spacing.sm }} />
          </>
        ) : null}
        <Button
          label={isMatch ? 'Supprimer le match' : 'Supprimer la séance'}
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
          {allStatuses.map((key) => {
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
                <Text style={styles.sheetLabel}>{labelForStatus(kind, key)}</Text>
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
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kindBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  kindBadgeText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  opponent: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  summaryBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
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
  confirmBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  confirmBannerTitle: {
    ...typography.bodyBold,
    color: '#92400E',
    fontSize: 14,
  },
  confirmBannerHint: {
    ...typography.caption,
    color: '#92400E',
    marginTop: 2,
  },
  confirmBannerCta: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#F59E0B',
  },
  confirmBannerCtaLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  confirmedGlyph: {
    fontSize: 22,
    fontWeight: '800',
    color: '#15803D',
    width: 26,
    textAlign: 'center',
  },
  confirmedTitle: {
    ...typography.bodyBold,
    color: '#14532D',
    fontSize: 14,
  },
  confirmedHint: {
    ...typography.caption,
    color: '#166534',
    marginTop: 2,
  },
  confirmedUndo: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  confirmedUndoLabel: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 13,
  },
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
  sheetLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
});
