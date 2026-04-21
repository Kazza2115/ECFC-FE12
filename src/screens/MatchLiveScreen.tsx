import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
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
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { EVENT_META, EVENT_ORDER } from '@/constants/events';
import { POSITION_META, POSITION_ORDER } from '@/constants/positions';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDate } from '@/utils/date';
import { confirm } from '@/utils/confirm';
import type { MatchEventType, Player, PlayerPosition } from '@/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchLive'>;

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type EventSheetState = { player: Player } | null;
type PositionSheetState = {
  player: Player;
  mode: 'lineup' | 'substitute';
  onSelect: (pos: PlayerPosition | undefined) => void;
} | null;

export function MatchLiveScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const {
    players,
    sessions,
    stints,
    getStatus,
    addMatchEvent,
    removeMatchEvent,
    getSessionEvents,
    getPlayerMatchTotals,
    getSessionStints,
    getPlayerPlayMs,
    toggleLineup,
    startMatch,
    endMatch,
    putOnPitch,
    takeOffPitch,
  } = useData();

  const session = sessions.find((s) => s.id === sessionId);
  const [now, setNow] = useState<number>(Date.now());
  const [eventSheet, setEventSheet] = useState<EventSheetState>(null);
  const [positionSheet, setPositionSheet] = useState<PositionSheetState>(null);

  const started = !!session?.startedAt;
  const ended = !!session?.endedAt;
  const matchRunning = started && !ended;

  useEffect(() => {
    if (!matchRunning) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [matchRunning]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: session
        ? `Live · ${session.label ? `vs ${session.label} · ` : ''}${formatDate(session.date)}`
        : 'Match Live',
    });
  }, [navigation, session]);

  const convoqués = useMemo(() => {
    const eligible = players.filter((p) => {
      const status = getStatus(sessionId, p.id);
      return status === 'present' || status === 'sfc' || status === 'return';
    });
    const extraIds = new Set<string>();
    for (const st of stints) {
      if (st.sessionId === sessionId) extraIds.add(st.playerId);
    }
    for (const e of getSessionEvents(sessionId)) {
      extraIds.add(e.playerId);
    }
    const extras = players.filter(
      (p) => extraIds.has(p.id) && !eligible.find((x) => x.id === p.id),
    );
    return [...eligible, ...extras];
  }, [players, getStatus, sessionId, stints, getSessionEvents]);

  const sessionStints = useMemo(
    () => getSessionStints(sessionId),
    [getSessionStints, sessionId],
  );

  const onPitchIds = useMemo(() => {
    if (!started) return new Set(session?.startingLineup ?? []);
    return new Set(
      sessionStints.filter((st) => !st.endAt).map((st) => st.playerId),
    );
  }, [started, session, sessionStints]);

  const currentPosition = (playerId: string): PlayerPosition | undefined => {
    const open = sessionStints
      .filter((st) => st.playerId === playerId && !st.endAt)
      .sort(
        (a, b) =>
          new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
      )[0];
    return open?.position;
  };

  const handleTogglePitch = async (player: Player) => {
    const onPitch = onPitchIds.has(player.id);
    try {
      await Haptics.selectionAsync();
    } catch {}
    if (onPitch) {
      await takeOffPitch(sessionId, player.id);
      return;
    }
    if (!started) {
      await toggleLineup(sessionId, player.id);
      return;
    }
    setPositionSheet({
      player,
      mode: 'substitute',
      onSelect: async (pos) => {
        setPositionSheet(null);
        await putOnPitch(sessionId, player.id, pos);
      },
    });
  };

  const handleStartMatch = async () => {
    const lineup = session?.startingLineup ?? [];
    if (lineup.length === 0) {
      const ok = await confirm({
        title: 'Aucun titulaire désigné',
        message: 'Tu peux démarrer sans titulaires mais le temps ne comptera que quand tu mets un joueur sur le terrain.',
        confirmLabel: 'Démarrer',
      });
      if (!ok) return;
    }
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    } catch {}
    await startMatch(sessionId);
  };

  const handleEndMatch = async () => {
    const ok = await confirm({
      title: 'Finir le match ?',
      message: 'Ferme tous les temps de jeu en cours.',
      confirmLabel: 'Finir le match',
    });
    if (!ok) return;
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    } catch {}
    await endMatch(sessionId);
  };

  const handleAddEvent = async (player: Player, type: MatchEventType) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await addMatchEvent(sessionId, player.id, type);
    setEventSheet(null);
  };

  const handleRemoveEvent = async (id: string) => {
    const ok = await confirm({
      title: 'Supprimer cet évènement ?',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
    if (!ok) return;
    await removeMatchEvent(id);
  };

  const recentEvents = useMemo(
    () => [...getSessionEvents(sessionId)].reverse().slice(0, 20),
    [getSessionEvents, sessionId],
  );

  const matchClock = useMemo(() => {
    if (!session?.startedAt) return null;
    const base = new Date(session.startedAt).getTime();
    const end = session.endedAt ? new Date(session.endedAt).getTime() : now;
    return formatDuration(end - base);
  }, [session, now]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>Session introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pitchPlayers = convoqués.filter((p) => onPitchIds.has(p.id));
  const benchPlayers = convoqués.filter((p) => !onPitchIds.has(p.id));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.clockCard}>
          <View style={styles.clockRow}>
            <View>
              <Text style={styles.clockLabel}>
                {ended ? 'Match terminé' : started ? 'Match en cours' : 'Match à démarrer'}
              </Text>
              <Text style={styles.clockValue}>{matchClock ?? '0:00'}</Text>
              <Text style={styles.clockHint}>
                {convoqués.length} convoqués · {pitchPlayers.length} sur le terrain
              </Text>
            </View>
            <View style={styles.clockActions}>
              {!started ? (
                <Button label="▶ Démarrer" onPress={handleStartMatch} />
              ) : !ended ? (
                <Button label="Finir" variant="secondary" onPress={handleEndMatch} />
              ) : null}
            </View>
          </View>
        </Card>

        {convoqués.length === 0 ? (
          <Card>
            <EmptyState
              title="Aucun joueur convoqué"
              description="Retourne sur la convocation du match pour convoquer des joueurs."
            />
          </Card>
        ) : (
          <>
            <Text style={styles.sectionHeader}>
              {started ? 'Sur le terrain' : 'Titulaires'} ({pitchPlayers.length})
            </Text>
            {pitchPlayers.length === 0 ? (
              <Card>
                <Text style={styles.muted}>
                  {started
                    ? 'Personne sur le terrain. Appuie sur un joueur du banc pour l\'envoyer jouer.'
                    : 'Marque tes titulaires en appuyant sur les joueurs du banc.'}
                </Text>
              </Card>
            ) : (
              pitchPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onPitch
                  started={started}
                  ended={ended}
                  playMs={getPlayerPlayMs(player.id, sessionId, now)}
                  totals={getPlayerMatchTotals(player.id, sessionId)}
                  position={currentPosition(player.id)}
                  onTogglePitch={() => handleTogglePitch(player)}
                  onEvent={() => setEventSheet({ player })}
                />
              ))
            )}

            <Text style={styles.sectionHeader}>
              Banc ({benchPlayers.length})
            </Text>
            {benchPlayers.length === 0 ? (
              <Card>
                <Text style={styles.muted}>Tous les convoqués sont sur le terrain.</Text>
              </Card>
            ) : (
              benchPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onPitch={false}
                  started={started}
                  ended={ended}
                  playMs={getPlayerPlayMs(player.id, sessionId, now)}
                  totals={getPlayerMatchTotals(player.id, sessionId)}
                  position={undefined}
                  onTogglePitch={() => handleTogglePitch(player)}
                  onEvent={() => setEventSheet({ player })}
                />
              ))
            )}
          </>
        )}

        {recentEvents.length > 0 ? (
          <>
            <Text style={styles.sectionHeader}>Évènements récents</Text>
            <Card padded={false}>
              {recentEvents.map((ev, idx) => {
                const meta = EVENT_META[ev.type];
                const player = players.find((p) => p.id === ev.playerId);
                return (
                  <Pressable
                    key={ev.id}
                    onLongPress={() => handleRemoveEvent(ev.id)}
                    style={[
                      styles.eventRow,
                      idx < recentEvents.length - 1 && styles.eventDivider,
                    ]}
                  >
                    <Text style={[styles.eventGlyph, { color: meta.color }]}>
                      {meta.glyph}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventName}>
                        {player ? player.name : '—'}
                      </Text>
                      <Text style={styles.eventMeta}>
                        {meta.label} · appui long pour supprimer
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={!!eventSheet}
        title={eventSheet ? eventSheet.player.name : ''}
        onClose={() => setEventSheet(null)}
      >
        <View style={styles.eventGrid}>
          {EVENT_ORDER.map((type) => {
            const meta = EVENT_META[type];
            return (
              <Pressable
                key={type}
                onPress={() =>
                  eventSheet && handleAddEvent(eventSheet.player, type)
                }
                style={[styles.eventOption, { backgroundColor: meta.bg }]}
              >
                <Text style={styles.eventOptionGlyph}>{meta.glyph}</Text>
                <Text style={[styles.eventOptionLabel, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <BottomSheet
        visible={!!positionSheet}
        title={
          positionSheet
            ? `${positionSheet.player.name} · poste ?`
            : 'Poste ?'
        }
        onClose={() => setPositionSheet(null)}
      >
        <View style={styles.positionsRow}>
          {POSITION_ORDER.map((pos) => {
            const meta = POSITION_META[pos];
            return (
              <Pressable
                key={pos}
                onPress={() => positionSheet?.onSelect(pos)}
                style={[styles.positionChip, { backgroundColor: meta.bg }]}
              >
                <Text style={[styles.positionLabel, { color: meta.color }]}>
                  {meta.short}
                </Text>
                <Text style={[styles.positionSub, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => positionSheet?.onSelect(undefined)}
          style={styles.positionSkip}
        >
          <Text style={styles.positionSkipLabel}>Sans poste</Text>
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

function PlayerCard({
  player,
  onPitch,
  started,
  ended,
  playMs,
  totals,
  position,
  onTogglePitch,
  onEvent,
}: {
  player: Player;
  onPitch: boolean;
  started: boolean;
  ended: boolean;
  playMs: number;
  totals: { goals: number; assists: number; key: number; yellow: number; red: number };
  position: PlayerPosition | undefined;
  onTogglePitch: () => void;
  onEvent: () => void;
}) {
  const hasEvents =
    totals.goals + totals.assists + totals.key + totals.yellow + totals.red > 0;

  return (
    <Card style={[styles.playerCard, onPitch && styles.playerCardActive]}>
      <View style={styles.playerTop}>
        <Avatar name={player.name} photoUri={player.photoUri} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.playerNameRow}>
            <Text style={styles.playerName} numberOfLines={1}>
              {player.name}
            </Text>
            {position ? (
              <View
                style={[
                  styles.positionBadge,
                  { backgroundColor: POSITION_META[position].bg },
                ]}
              >
                <Text
                  style={[
                    styles.positionBadgeLabel,
                    { color: POSITION_META[position].color },
                  ]}
                >
                  {POSITION_META[position].short}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.playerMeta}>
            {started
              ? `${formatDuration(playMs)} joué${onPitch && !ended ? ' · en cours' : ''}`
              : onPitch
              ? 'Titulaire'
              : 'Sur le banc'}
          </Text>
        </View>
        <Pressable
          disabled={ended}
          onPress={onTogglePitch}
          style={[
            styles.pitchToggle,
            onPitch ? styles.pitchToggleOn : styles.pitchToggleOff,
            ended && styles.pitchToggleDisabled,
          ]}
        >
          <Text
            style={[
              styles.pitchToggleLabel,
              onPitch ? styles.pitchToggleLabelOn : styles.pitchToggleLabelOff,
            ]}
          >
            {onPitch
              ? started
                ? 'Banc'
                : 'Titulaire'
              : started
              ? 'Terrain'
              : 'Titulaire'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.playerBottom}>
        <Pressable onPress={onEvent} style={styles.eventBtn}>
          <Text style={styles.eventBtnLabel}>⚡ Évènement</Text>
        </Pressable>
        {hasEvents ? (
          <View style={styles.totalsRow}>
            {totals.goals > 0 ? (
              <TotalPill color={EVENT_META.goal.color} glyph={EVENT_META.goal.glyph} value={totals.goals} />
            ) : null}
            {totals.assists > 0 ? (
              <TotalPill color={EVENT_META.assist.color} glyph={EVENT_META.assist.glyph} value={totals.assists} />
            ) : null}
            {totals.key > 0 ? (
              <TotalPill color={EVENT_META.key.color} glyph={EVENT_META.key.glyph} value={totals.key} />
            ) : null}
            {totals.yellow > 0 ? (
              <TotalPill color={EVENT_META.yellow.color} glyph={EVENT_META.yellow.glyph} value={totals.yellow} />
            ) : null}
            {totals.red > 0 ? (
              <TotalPill color={EVENT_META.red.color} glyph={EVENT_META.red.glyph} value={totals.red} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function TotalPill({
  color,
  glyph,
  value,
}: {
  color: string;
  glyph: string;
  value: number;
}) {
  return (
    <View style={[styles.totalPill, { borderColor: color + '44' }]}>
      <Text style={styles.totalGlyph}>{glyph}</Text>
      <Text style={[styles.totalValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...typography.body, color: colors.textMuted },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  clockCard: {},
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  clockLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  clockValue: {
    ...typography.number,
    fontSize: 32,
    color: colors.textPrimary,
    marginTop: 2,
  },
  clockHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  clockActions: { flexDirection: 'row', gap: spacing.sm },
  sectionHeader: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  playerCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
    gap: spacing.sm,
  },
  playerCardActive: {
    borderLeftColor: colors.primary,
    backgroundColor: colors.surface,
  },
  playerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playerName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 16,
    flexShrink: 1,
  },
  positionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  positionBadgeLabel: {
    ...typography.caption,
    fontWeight: '800',
    fontSize: 11,
  },
  playerMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pitchToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  pitchToggleOn: { backgroundColor: colors.primary },
  pitchToggleOff: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pitchToggleDisabled: { opacity: 0.4 },
  pitchToggleLabel: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  pitchToggleLabelOn: { color: '#FFFFFF' },
  pitchToggleLabelOff: { color: colors.textPrimary },
  playerBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  eventBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  eventBtnLabel: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  totalsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  totalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  totalGlyph: { fontSize: 13 },
  totalValue: { fontSize: 13, fontWeight: '800' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  eventDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  eventGlyph: { fontSize: 22 },
  eventName: { ...typography.bodyBold, color: colors.textPrimary },
  eventMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  eventGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  eventOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    width: '48%',
    flexGrow: 1,
  },
  eventOptionGlyph: { fontSize: 20 },
  eventOptionLabel: {
    ...typography.bodyBold,
    fontSize: 14,
    flexShrink: 1,
  },
  positionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  positionChip: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  positionLabel: { ...typography.h2, fontSize: 20 },
  positionSub: { ...typography.caption, marginTop: 2, fontWeight: '700' },
  positionSkip: {
    marginTop: spacing.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  positionSkipLabel: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
});
