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
import { FormationPitch } from '@/components/FormationPitch';
import { EVENT_META, EVENT_ORDER } from '@/constants/events';
import {
  DEFAULT_FORMATION_ID,
  FORMATIONS,
  findFormation,
  type FormationSlot,
} from '@/constants/formations';
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
type SlotSheetState = { slot: FormationSlot } | null;
type FormationSheetOpen = boolean;

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
    setLineupPosition,
    removeFromLineup,
    setFormation,
    assignToSlot,
    startMatch,
    pauseMatch,
    resumeMatch,
    endMatch,
    putOnPitch,
    takeOffPitch,
  } = useData();

  const session = sessions.find((s) => s.id === sessionId);
  const [now, setNow] = useState<number>(Date.now());
  const [eventSheet, setEventSheet] = useState<EventSheetState>(null);
  const [positionSheet, setPositionSheet] = useState<PositionSheetState>(null);
  const [slotSheet, setSlotSheet] = useState<SlotSheetState>(null);
  const [formationSheet, setFormationSheet] = useState<FormationSheetOpen>(false);
  const [customMode, setCustomMode] = useState<boolean>(false);
  const [customCounts, setCustomCounts] = useState<number[]>([4, 3, 3]);

  const formation = findFormation(session?.formation);
  const lineupSlots = session?.lineupSlots ?? {};

  const started = !!session?.startedAt;
  const ended = !!session?.endedAt;
  const pauseIntervals = session?.pauseIntervals ?? [];
  const lastPause = pauseIntervals[pauseIntervals.length - 1];
  const isPaused = !!lastPause && !lastPause.end;
  const matchRunning = started && !ended && !isPaused;

  useEffect(() => {
    if (!started || ended) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [started, ended]);

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
    if (started) {
      const open = sessionStints
        .filter((st) => st.playerId === playerId && !st.endAt)
        .sort(
          (a, b) =>
            new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
        )[0];
      return open?.position;
    }
    return session?.lineupPositions?.[playerId];
  };

  const handleTogglePitch = async (player: Player) => {
    const onPitch = onPitchIds.has(player.id);
    try {
      await Haptics.selectionAsync();
    } catch {}
    if (onPitch) {
      if (started) {
        await takeOffPitch(sessionId, player.id);
      } else {
        await removeFromLineup(sessionId, player.id);
      }
      return;
    }
    // Adding a player to the pitch — always ask for position
    setPositionSheet({
      player,
      mode: started ? 'substitute' : 'lineup',
      onSelect: async (pos) => {
        setPositionSheet(null);
        if (started) {
          await putOnPitch(sessionId, player.id, pos);
        } else {
          await setLineupPosition(sessionId, player.id, pos);
        }
      },
    });
  };

  const handleChangePosition = (player: Player) => {
    setPositionSheet({
      player,
      mode: started ? 'substitute' : 'lineup',
      onSelect: async (pos) => {
        setPositionSheet(null);
        if (started) {
          // Close current stint and reopen with new position for precise tracking
          await takeOffPitch(sessionId, player.id);
          await putOnPitch(sessionId, player.id, pos);
        } else {
          await setLineupPosition(sessionId, player.id, pos);
        }
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
    let pauseMs = 0;
    for (const p of pauseIntervals) {
      const pStart = new Date(p.start).getTime();
      const pEnd = p.end ? new Date(p.end).getTime() : now;
      if (pEnd > pStart) pauseMs += pEnd - pStart;
    }
    return formatDuration(end - base - pauseMs);
  }, [session, now, pauseIntervals]);

  const handlePauseResume = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    if (isPaused) {
      await resumeMatch(sessionId);
    } else {
      await pauseMatch(sessionId);
    }
  };

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
                {ended
                  ? 'Match terminé'
                  : isPaused
                  ? 'Pause'
                  : started
                  ? 'Match en cours'
                  : 'Match à démarrer'}
              </Text>
              <Text
                style={[
                  styles.clockValue,
                  isPaused && { color: colors.warning },
                ]}
              >
                {matchClock ?? '0:00'}
              </Text>
              <Text style={styles.clockHint}>
                {convoqués.length} convoqués · {pitchPlayers.length} sur le terrain
              </Text>
            </View>
            <View style={styles.clockActions}>
              {!started ? (
                <Button label="▶ Démarrer" onPress={handleStartMatch} />
              ) : !ended ? (
                <>
                  <Button
                    label={isPaused ? '▶ Reprendre' : '❚❚ Pause'}
                    variant={isPaused ? 'primary' : 'secondary'}
                    onPress={handlePauseResume}
                  />
                  <Button
                    label="Finir"
                    variant="ghost"
                    onPress={handleEndMatch}
                  />
                </>
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
            <Card style={styles.formationCard}>
              <View style={styles.formationHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formationTitle}>Composition</Text>
                  <Text style={styles.formationHint}>
                    {started
                      ? 'Tape un joueur pour noter un évènement ou un remplacement'
                      : 'Tape sur un poste pour placer un joueur'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setFormationSheet(true)}
                  disabled={ended}
                  style={[styles.formationChip, ended && { opacity: 0.4 }]}
                >
                  <Text style={styles.formationChipLabel}>
                    {formation ? formation.label : 'Aucune'}
                  </Text>
                  <Text style={styles.formationChipCaret}>▾</Text>
                </Pressable>
              </View>

              {formation ? (
                <FormationPitch
                  formation={formation}
                  lineupSlots={lineupSlots}
                  players={players}
                  onSlotPress={(slot) => setSlotSheet({ slot })}
                  readOnly={ended}
                />
              ) : (
                <View style={styles.noFormation}>
                  <Text style={styles.noFormationText}>
                    Choisis une formation pour visualiser ton équipe sur le
                    terrain.
                  </Text>
                  <Button
                    label="Choisir une formation"
                    onPress={() => setFormationSheet(true)}
                    fullWidth
                  />
                </View>
              )}
            </Card>

            {formation ? (
              started && !ended ? (
              <>
                <Text style={styles.sectionHeader}>
                  Banc ({benchPlayers.length})
                </Text>
                {benchPlayers.length === 0 ? (
                  <Card>
                    <Text style={styles.muted}>
                      Tous les convoqués sont sur le terrain.
                    </Text>
                  </Card>
                ) : (
                  <Card padded={false} style={styles.benchCard}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.benchScroll}
                    >
                      {benchPlayers.map((player) => {
                        const totals = getPlayerMatchTotals(
                          player.id,
                          sessionId,
                        );
                        const hasEvents =
                          totals.goals +
                            totals.assists +
                            totals.key +
                            totals.yellow +
                            totals.red >
                          0;
                        return (
                          <View key={player.id} style={styles.benchPlayer}>
                            <Avatar
                              name={player.name}
                              photoUri={player.photoUri}
                              size={40}
                            />
                            <Text
                              style={styles.benchName}
                              numberOfLines={1}
                            >
                              {player.name.split(/\s+/).pop()}
                            </Text>
                            {hasEvents ? (
                              <Text style={styles.benchEvents}>
                                {totals.goals > 0
                                  ? `⚽${totals.goals} `
                                  : ''}
                                {totals.yellow > 0
                                  ? `🟨${totals.yellow} `
                                  : ''}
                                {totals.red > 0 ? `🟥${totals.red}` : ''}
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </ScrollView>
                  </Card>
                )}
              </>
              ) : null
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
                      onChangePosition={() => handleChangePosition(player)}
                      onEvent={() => setEventSheet({ player })}
                    />
                  ))
                )}

                <Text style={styles.sectionHeader}>
                  Banc ({benchPlayers.length})
                </Text>
                {benchPlayers.length === 0 ? (
                  <Card>
                    <Text style={styles.muted}>
                      Tous les convoqués sont sur le terrain.
                    </Text>
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
                      onChangePosition={() => handleChangePosition(player)}
                      onEvent={() => setEventSheet({ player })}
                    />
                  ))
                )}
              </>
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

      <BottomSheet
        visible={formationSheet}
        title="Choisir une formation"
        onClose={() => {
          setFormationSheet(false);
          setCustomMode(false);
        }}
      >
        {!customMode ? (
          <>
            <View style={styles.formationGrid}>
              {FORMATIONS.map((f) => {
                const active = session?.formation === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={async () => {
                      await setFormation(sessionId, f.id);
                      setFormationSheet(false);
                    }}
                    style={[
                      styles.formationOption,
                      active && styles.formationOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.formationOptionLabel,
                        active && styles.formationOptionLabelActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => {
                const seed =
                  session?.formation && /^\d+(-\d+){1,3}$/.test(session.formation)
                    ? session.formation.split('-').map(Number)
                    : [4, 3, 3];
                setCustomCounts(seed.length === 3 ? seed : [4, 3, 3]);
                setCustomMode(true);
              }}
              style={styles.customLink}
            >
              <Text style={styles.customLinkLabel}>＋ Personnalisée</Text>
              <Text style={styles.customLinkSub}>
                Choisis le nombre de défenseurs / milieux / attaquants
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.customWrap}>
            <Text style={styles.customTitle}>Composition personnalisée</Text>
            <Text style={styles.customSub}>
              1 GK · {customCounts[0]} DEF · {customCounts[1]} MID ·{' '}
              {customCounts[2]} ATT
            </Text>
            <Text style={styles.customTotal}>
              Total : {1 + customCounts.reduce((a, b) => a + b, 0)} joueurs
            </Text>

            {(['Défense', 'Milieu', 'Attaque'] as const).map((label, idx) => (
              <View key={label} style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>{label}</Text>
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() =>
                      setCustomCounts((c) => {
                        const next = [...c];
                        next[idx] = Math.max(0, c[idx] - 1);
                        return next;
                      })
                    }
                  >
                    <Text style={styles.stepBtnLabel}>−</Text>
                  </Pressable>
                  <Text style={styles.stepValue}>{customCounts[idx]}</Text>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() =>
                      setCustomCounts((c) => {
                        const next = [...c];
                        next[idx] = Math.min(6, c[idx] + 1);
                        return next;
                      })
                    }
                  >
                    <Text style={styles.stepBtnLabel}>+</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            <View style={styles.customActions}>
              <Button
                label="Retour"
                variant="secondary"
                onPress={() => setCustomMode(false)}
              />
              <View style={{ width: spacing.sm }} />
              <Button
                label="Appliquer"
                onPress={async () => {
                  const id = customCounts.join('-');
                  await setFormation(sessionId, id);
                  setCustomMode(false);
                  setFormationSheet(false);
                }}
              />
            </View>
          </View>
        )}
      </BottomSheet>

      <BottomSheet
        visible={!!slotSheet}
        title={
          slotSheet
            ? `Poste ${slotSheet.slot.label} · ${POSITION_META[slotSheet.slot.position].label}`
            : 'Poste'
        }
        onClose={() => setSlotSheet(null)}
      >
        {slotSheet ? (
          <SlotSheetBody
            slot={slotSheet.slot}
            session={session}
            started={started}
            ended={ended}
            players={players}
            convoqués={convoqués}
            lineupSlots={lineupSlots}
            sessionId={sessionId}
            assignToSlot={assignToSlot}
            addMatchEvent={addMatchEvent}
            putOnPitch={putOnPitch}
            takeOffPitch={takeOffPitch}
            getPlayerMatchTotals={getPlayerMatchTotals}
            onClose={() => setSlotSheet(null)}
          />
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

type SlotSheetProps = {
  slot: FormationSlot;
  session: ReturnType<typeof useData>['sessions'][number] | undefined;
  started: boolean;
  ended: boolean;
  players: ReturnType<typeof useData>['players'];
  convoqués: ReturnType<typeof useData>['players'];
  lineupSlots: Record<string, string>;
  sessionId: string;
  assignToSlot: ReturnType<typeof useData>['assignToSlot'];
  addMatchEvent: ReturnType<typeof useData>['addMatchEvent'];
  putOnPitch: ReturnType<typeof useData>['putOnPitch'];
  takeOffPitch: ReturnType<typeof useData>['takeOffPitch'];
  getPlayerMatchTotals: ReturnType<typeof useData>['getPlayerMatchTotals'];
  onClose: () => void;
};

function SlotSheetBody({
  slot,
  session,
  started,
  ended,
  players,
  convoqués,
  lineupSlots,
  sessionId,
  assignToSlot,
  addMatchEvent,
  putOnPitch,
  takeOffPitch,
  getPlayerMatchTotals,
  onClose,
}: SlotSheetProps) {
  const assignedPlayerId = lineupSlots[slot.id];
  const assignedPlayer = assignedPlayerId
    ? players.find((p) => p.id === assignedPlayerId)
    : undefined;

  const otherSlotIds = Object.entries(lineupSlots)
    .filter(([sid, pid]) => sid !== slot.id && pid)
    .map(([, pid]) => pid);
  const placedIds = new Set(otherSlotIds);

  const availableBench = convoqués.filter(
    (p) => !placedIds.has(p.id) && p.id !== assignedPlayerId,
  );
  const otherPlaced = convoqués.filter((p) => placedIds.has(p.id));

  const eventDo = async (type: MatchEventType) => {
    if (!assignedPlayer) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    await addMatchEvent(sessionId, assignedPlayer.id, type);
    onClose();
  };

  const substitute = async (newPlayer: Player) => {
    if (!assignedPlayer) return;
    // Close the outgoing player's stint if match is running.
    if (started && !ended) {
      await takeOffPitch(sessionId, assignedPlayer.id);
    }
    await assignToSlot(sessionId, slot.id, newPlayer.id);
    if (started && !ended) {
      await putOnPitch(sessionId, newPlayer.id, slot.position);
    }
    onClose();
  };

  const removeFromSlot = async () => {
    if (!assignedPlayer) return;
    if (started && !ended) {
      await takeOffPitch(sessionId, assignedPlayer.id);
    }
    await assignToSlot(sessionId, slot.id, null);
    onClose();
  };

  const assignNew = async (newPlayer: Player) => {
    await assignToSlot(sessionId, slot.id, newPlayer.id);
    if (started && !ended) {
      await putOnPitch(sessionId, newPlayer.id, slot.position);
    }
    onClose();
  };

  if (!assignedPlayer) {
    return (
      <View>
        <Text style={styles.slotGroupLabel}>Banc (convoqués)</Text>
        {availableBench.length === 0 && otherPlaced.length === 0 ? (
          <Text style={styles.muted}>
            Tous les convoqués sont déjà placés. Libère un autre poste d'abord.
          </Text>
        ) : (
          <View style={styles.slotPlayerGrid}>
            {availableBench.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => assignNew(p)}
                style={styles.slotPlayerChip}
              >
                <Avatar name={p.name} photoUri={p.photoUri} size={32} />
                <Text style={styles.slotPlayerName2}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {otherPlaced.length > 0 ? (
          <>
            <Text style={styles.slotGroupLabel}>
              Déjà placés (repositionner)
            </Text>
            <View style={styles.slotPlayerGrid}>
              {otherPlaced.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => assignNew(p)}
                  style={[styles.slotPlayerChip, styles.slotPlayerChipMoved]}
                >
                  <Avatar name={p.name} photoUri={p.photoUri} size={32} />
                  <Text style={styles.slotPlayerName2}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </View>
    );
  }

  const totals = getPlayerMatchTotals(assignedPlayer.id, sessionId);

  return (
    <View>
      <View style={styles.slotAssignedRow}>
        <Avatar
          name={assignedPlayer.name}
          photoUri={assignedPlayer.photoUri}
          size={48}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.slotAssignedName}>{assignedPlayer.name}</Text>
          <Text style={styles.slotAssignedMeta}>
            {POSITION_META[slot.position].label}
          </Text>
          {totals.goals +
            totals.assists +
            totals.key +
            totals.yellow +
            totals.red >
          0 ? (
            <View style={styles.slotTotalsRow}>
              {totals.goals > 0 ? (
                <Text
                  style={[
                    styles.slotTotalItem,
                    { color: EVENT_META.goal.color },
                  ]}
                >
                  {EVENT_META.goal.glyph} {totals.goals}
                </Text>
              ) : null}
              {totals.assists > 0 ? (
                <Text
                  style={[
                    styles.slotTotalItem,
                    { color: EVENT_META.assist.color },
                  ]}
                >
                  {EVENT_META.assist.glyph} {totals.assists}
                </Text>
              ) : null}
              {totals.key > 0 ? (
                <Text
                  style={[
                    styles.slotTotalItem,
                    { color: EVENT_META.key.color },
                  ]}
                >
                  {EVENT_META.key.glyph} {totals.key}
                </Text>
              ) : null}
              {totals.yellow > 0 ? (
                <Text
                  style={[
                    styles.slotTotalItem,
                    { color: EVENT_META.yellow.color },
                  ]}
                >
                  {EVENT_META.yellow.glyph} {totals.yellow}
                </Text>
              ) : null}
              {totals.red > 0 ? (
                <Text
                  style={[
                    styles.slotTotalItem,
                    { color: EVENT_META.red.color },
                  ]}
                >
                  {EVENT_META.red.glyph} {totals.red}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {started && !ended ? (
        <>
          <Text style={styles.slotGroupLabel}>Évènement</Text>
          <View style={styles.eventGridBig}>
            {EVENT_ORDER.map((type) => {
              const meta = EVENT_META[type];
              return (
                <Pressable
                  key={type}
                  onPress={() => eventDo(type)}
                  style={[styles.eventBigBtn, { backgroundColor: meta.bg }]}
                >
                  <Text style={styles.eventBigGlyph}>{meta.glyph}</Text>
                  <Text style={[styles.eventBigLabel, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.slotGroupLabel}>Remplacer par…</Text>
          {availableBench.length === 0 ? (
            <Text style={styles.muted}>Aucun remplaçant disponible.</Text>
          ) : (
            <View style={styles.slotPlayerGrid}>
              {availableBench.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => substitute(p)}
                  style={styles.slotPlayerChip}
                >
                  <Avatar name={p.name} photoUri={p.photoUri} size={32} />
                  <Text style={styles.slotPlayerName2}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          <Text style={styles.slotGroupLabel}>Remplacer par…</Text>
          {availableBench.length === 0 && otherPlaced.length === 0 ? (
            <Text style={styles.muted}>
              Tous les convoqués sont déjà placés.
            </Text>
          ) : (
            <View style={styles.slotPlayerGrid}>
              {availableBench.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => assignNew(p)}
                  style={styles.slotPlayerChip}
                >
                  <Avatar name={p.name} photoUri={p.photoUri} size={32} />
                  <Text style={styles.slotPlayerName2}>{p.name}</Text>
                </Pressable>
              ))}
              {otherPlaced.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => assignNew(p)}
                  style={[styles.slotPlayerChip, styles.slotPlayerChipMoved]}
                >
                  <Avatar name={p.name} photoUri={p.photoUri} size={32} />
                  <Text style={styles.slotPlayerName2}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      <View style={styles.slotFooter}>
        <Pressable onPress={removeFromSlot} style={styles.slotRemoveFull}>
          <Text style={styles.slotRemoveLabel}>
            {started && !ended ? '↓ Sortir du terrain (banc)' : 'Retirer du poste'}
          </Text>
        </Pressable>
      </View>
    </View>
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
  onChangePosition,
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
  onChangePosition: () => void;
  onEvent: () => void;
}) {
  const hasEvents =
    totals.goals + totals.assists + totals.key + totals.yellow + totals.red > 0;
  const posMeta = position ? POSITION_META[position] : null;

  return (
    <Card
      padded={false}
      style={[styles.playerCard, onPitch && styles.playerCardActive]}
    >
      <View style={styles.playerTop}>
        <Avatar name={player.name} photoUri={player.photoUri} size={52} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.playerName} numberOfLines={1}>
            {player.name}
          </Text>
          {onPitch ? (
            <Pressable
              onPress={onChangePosition}
              disabled={ended}
              style={[
                styles.positionBadge,
                posMeta
                  ? { backgroundColor: posMeta.bg }
                  : styles.positionBadgeEmpty,
              ]}
            >
              <Text
                style={[
                  styles.positionBadgeLabel,
                  posMeta
                    ? { color: posMeta.color }
                    : { color: colors.textSecondary },
                ]}
              >
                {posMeta
                  ? `${posMeta.short} · ${posMeta.label}`
                  : 'Ajouter un poste'}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.playerMetaMuted}>Sur le banc</Text>
          )}
        </View>
      </View>

      {onPitch ? (
        <View style={styles.playerClock}>
          <Text style={styles.playerClockValue}>
            {started ? formatDuration(playMs) : '—'}
          </Text>
          <Text style={styles.playerClockLabel}>
            {started
              ? onPitch && !ended
                ? 'Temps de jeu · en cours'
                : 'Temps de jeu'
              : 'Titulaire (match non démarré)'}
          </Text>
        </View>
      ) : null}

      <View style={styles.playerActions}>
        <Pressable
          disabled={ended}
          onPress={onTogglePitch}
          style={[
            styles.pitchToggle,
            onPitch ? styles.pitchToggleOff : styles.pitchToggleOn,
            ended && styles.pitchToggleDisabled,
          ]}
        >
          <Text
            style={[
              styles.pitchToggleLabel,
              onPitch ? styles.pitchToggleLabelDark : styles.pitchToggleLabelLight,
            ]}
          >
            {onPitch ? '↓ Sur le banc' : started ? '↑ Sur le terrain' : '↑ Titulaire'}
          </Text>
        </Pressable>
        {onPitch ? (
          <Pressable onPress={onEvent} style={styles.eventBtn}>
            <Text style={styles.eventBtnLabel}>⚡ Évènement</Text>
          </Pressable>
        ) : null}
      </View>

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
  formationCard: { gap: spacing.md },
  formationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  formationTitle: { ...typography.h3, color: colors.textPrimary },
  formationHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  formationChipLabel: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  formationChipCaret: { color: colors.primary, fontWeight: '800' },
  formationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  formationOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    flexGrow: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  formationOptionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  formationOptionLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 16,
  },
  formationOptionLabelActive: { color: colors.primary },
  customLink: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  customLinkLabel: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 15,
  },
  customLinkSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  customWrap: { gap: spacing.md },
  customTitle: { ...typography.h3, color: colors.textPrimary },
  customSub: {
    ...typography.body,
    color: colors.textSecondary,
  },
  customTotal: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  stepperLabel: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 22,
  },
  stepValue: {
    ...typography.h2,
    color: colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  customActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  noFormation: {
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  noFormationText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  slotAssignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  slotAssignedName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
  },
  slotAssignedMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  slotRemove: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#FEE2E2',
  },
  slotRemoveLabel: { color: colors.danger, fontWeight: '700' },
  slotGroupLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '800',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  slotPlayerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotPlayerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotPlayerChipMoved: {
    borderColor: colors.warning,
    borderStyle: 'dashed',
  },
  slotPlayerName2: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  slotTotalsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  slotTotalItem: {
    fontSize: 12,
    fontWeight: '800',
  },
  eventGridBig: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  eventBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    width: '48%',
    flexGrow: 1,
  },
  eventBigGlyph: { fontSize: 20 },
  eventBigLabel: {
    ...typography.bodyBold,
    fontSize: 14,
    flexShrink: 1,
  },
  slotFooter: {
    marginTop: spacing.md,
  },
  slotRemoveFull: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  benchCard: {
    paddingVertical: 8,
  },
  benchScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  benchPlayer: {
    alignItems: 'center',
    minWidth: 60,
    maxWidth: 80,
  },
  benchName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 4,
    fontSize: 11,
  },
  benchEvents: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '700',
  },
  playerCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  playerCardActive: {
    borderLeftColor: colors.success,
    borderLeftWidth: 6,
    backgroundColor: '#F0FDF4',
  },
  playerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  playerName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 18,
    flexShrink: 1,
  },
  positionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  positionBadgeEmpty: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  positionBadgeLabel: {
    ...typography.caption,
    fontWeight: '800',
    fontSize: 12,
  },
  playerMetaMuted: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  playerClock: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
  },
  playerClockValue: {
    ...typography.number,
    fontSize: 30,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  playerClockLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  playerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pitchToggle: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 14,
  },
  pitchToggleLabelLight: { color: '#FFFFFF' },
  pitchToggleLabelDark: { color: colors.textPrimary },
  eventBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventBtnLabel: { color: colors.primary, fontWeight: '800', fontSize: 14 },
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
