import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { BottomSheet } from '@/components/BottomSheet';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { EVENT_META, EVENT_ORDER } from '@/constants/events';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDate } from '@/utils/date';
import { confirm } from '@/utils/confirm';
import type { MatchEventType, Player } from '@/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchLive'>;

export function MatchLiveScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const {
    players,
    sessions,
    getStatus,
    addMatchEvent,
    removeMatchEvent,
    getSessionEvents,
    getPlayerMatchTotals,
  } = useData();

  const session = sessions.find((s) => s.id === sessionId);
  const [sheetPlayer, setSheetPlayer] = useState<Player | null>(null);

  const events = useMemo(() => getSessionEvents(sessionId), [getSessionEvents, sessionId]);

  const convoqués = useMemo(() => {
    const eligible = players.filter((p) => {
      const status = getStatus(sessionId, p.id);
      return status === 'present' || status === 'sfc' || status === 'return';
    });
    const withEventIds = new Set(events.map((e) => e.playerId));
    const extras = players.filter(
      (p) => withEventIds.has(p.id) && !eligible.find((e) => e.id === p.id),
    );
    return [...eligible, ...extras];
  }, [players, getStatus, sessionId, events]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: session ? `Live · ${formatDate(session.date)}` : 'Match Live',
    });
  }, [navigation, session]);

  const record = async (playerId: string, type: MatchEventType) => {
    try {
      await Haptics.notificationAsync(
        type === 'goal'
          ? Haptics.NotificationFeedbackType.Success
          : type === 'red'
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Warning,
      );
    } catch {}
    await addMatchEvent(sessionId, playerId, type);
  };

  const undo = async (id: string) => {
    const ok = await confirm({
      title: 'Annuler cet évènement ?',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    await removeMatchEvent(id);
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>Match introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.meta}>
          <Text style={styles.opponent}>
            {session.label ? `vs ${session.label}` : 'Match en cours'}
          </Text>
          <Text style={styles.hint}>
            {convoqués.length} convoqué{convoqués.length > 1 ? 's' : ''} · appuie sur un joueur pour enregistrer un évènement
          </Text>
        </View>

        {convoqués.length === 0 ? (
          <Card>
            <EmptyState
              title="Aucun convoqué"
              description={'Retourne à la convocation et marque les joueurs [✓ Convoqué] avant de démarrer le mode live.'}
            />
          </Card>
        ) : (
          <View style={styles.grid}>
            {convoqués.map((p) => {
              const totals = getPlayerMatchTotals(p.id, sessionId);
              const rawPills: Array<{ key: MatchEventType; value: number }> = [
                { key: 'goal', value: totals.goals },
                { key: 'assist', value: totals.assists },
                { key: 'key', value: totals.key },
                { key: 'yellow', value: totals.yellow },
                { key: 'red', value: totals.red },
              ];
              const pills = rawPills.filter((x) => x.value > 0);

              return (
                <Pressable
                  key={p.id}
                  style={styles.playerCard}
                  onPress={() => setSheetPlayer(p)}
                >
                  <Avatar name={p.name} photoUri={p.photoUri} size={52} />
                  <Text style={styles.playerName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={styles.pillsRow}>
                    {pills.length === 0 ? (
                      <Text style={styles.pillMuted}>Toucher</Text>
                    ) : (
                      pills.map((pill) => {
                        const meta = EVENT_META[pill.key];
                        return (
                          <View
                            key={pill.key}
                            style={[styles.pill, { backgroundColor: meta.bg }]}
                          >
                            <Text style={[styles.pillValue, { color: meta.color }]}>
                              {meta.glyph}
                              {pill.value}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Évènements ({events.length})</Text>
        {events.length === 0 ? (
          <Card>
            <Text style={styles.emptyTimeline}>
              Pas encore d'action. Les évènements apparaîtront ici dès que tu en
              enregistres un.
            </Text>
          </Card>
        ) : (
          <Card padded={false} style={styles.timelineCard}>
            <FlatList
              data={events}
              scrollEnabled={false}
              keyExtractor={(e) => e.id}
              ItemSeparatorComponent={() => <View style={styles.timelineDivider} />}
              renderItem={({ item }) => {
                const meta = EVENT_META[item.type];
                const player = players.find((p) => p.id === item.playerId);
                const when = new Date(item.createdAt);
                const time = `${when.getHours().toString().padStart(2, '0')}:${when
                  .getMinutes()
                  .toString()
                  .padStart(2, '0')}`;
                return (
                  <View style={styles.timelineRow}>
                    <View style={[styles.timelineGlyph, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.timelineGlyphText, { color: meta.color }]}>
                        {meta.glyph}
                      </Text>
                    </View>
                    <View style={styles.timelineBody}>
                      <Text style={styles.timelineTitle} numberOfLines={1}>
                        {player?.name ?? 'Joueur supprimé'}
                      </Text>
                      <Text style={styles.timelineMeta}>
                        {meta.label} · {time}
                      </Text>
                    </View>
                    <Pressable style={styles.undoBtn} onPress={() => undo(item.id)}>
                      <Text style={styles.undoLabel}>Annuler</Text>
                    </Pressable>
                  </View>
                );
              }}
            />
          </Card>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <BottomSheet
        visible={!!sheetPlayer}
        title={sheetPlayer ? sheetPlayer.name : 'Évènement'}
        onClose={() => setSheetPlayer(null)}
      >
        <View style={styles.sheetGrid}>
          {EVENT_ORDER.map((type) => {
            const meta = EVENT_META[type];
            return (
              <Pressable
                key={type}
                style={[
                  styles.sheetItem,
                  { backgroundColor: meta.bg, borderColor: meta.color + '55' },
                ]}
                onPress={async () => {
                  if (!sheetPlayer) return;
                  await record(sheetPlayer.id, type);
                  setSheetPlayer(null);
                }}
              >
                <Text style={styles.sheetGlyph}>{meta.glyph}</Text>
                <Text style={[styles.sheetLabel, { color: meta.color }]}>
                  {meta.label}
                </Text>
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
  content: { padding: spacing.lg, gap: spacing.md },
  meta: { gap: 4 },
  opponent: { ...typography.h2, color: colors.textPrimary },
  hint: { ...typography.body, color: colors.textSecondary },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  playerCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: 14,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    minHeight: 24,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  pillValue: { fontSize: 12, fontWeight: '700' },
  pillMuted: { ...typography.caption, color: colors.textMuted },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  timelineCard: {},
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  timelineDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  timelineGlyph: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineGlyphText: { fontSize: 18 },
  timelineBody: { flex: 1, minWidth: 0 },
  timelineTitle: { ...typography.bodyBold, color: colors.textPrimary },
  timelineMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  undoBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  undoLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  emptyTimeline: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  sheetGrid: { gap: spacing.sm },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  sheetGlyph: { fontSize: 22 },
  sheetLabel: { ...typography.bodyBold, fontSize: 16 },
});
