import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FormationPitch } from '@/components/FormationPitch';
import { findFormation, type FormationSlot } from '@/constants/formations';
import { POSITION_META } from '@/constants/positions';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';
import { confirm, notify } from '@/utils/confirm';
import type { Player, Session } from '@/types';

const QUARTER_DURATION_MS = 15 * 60 * 1000; // 15 min

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Props = {
  session: Session;
  sessionId: string;
  convoqués: Player[];
};

export function Match7x7View({ session, sessionId, convoqués }: Props) {
  const {
    players,
    stints,
    assignToQuarterSlot,
    startQuarter,
    endQuarter,
    endMatch,
    getPlayerPlayMs,
  } = useData();

  const formation = findFormation(session.formation ?? '2-3-1');
  const currentQuarter = session.currentQuarter;
  const ended = !!session.endedAt;

  const [selectedQuarter, setSelectedQuarter] = useState<number>(
    currentQuarter ?? 1,
  );
  const [slotSheet, setSlotSheet] = useState<FormationSlot | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (currentQuarter !== undefined) {
      setSelectedQuarter(currentQuarter);
    }
  }, [currentQuarter]);

  useEffect(() => {
    if (currentQuarter === undefined || ended) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [currentQuarter, ended]);

  const quarterTeams = session.quarterTeams ?? {};

  // Quarter completion: a quarter is "done" if at least one stint with
  // that quarter exists AND it's no longer the currentQuarter.
  const playedQuarters = useMemo(() => {
    const set = new Set<number>();
    for (const st of stints) {
      if (st.sessionId !== sessionId) continue;
      if (st.quarter && st.quarter !== currentQuarter) set.add(st.quarter);
    }
    return set;
  }, [stints, sessionId, currentQuarter]);

  // Quarter elapsed when active (live).
  const quarterElapsed = useMemo(() => {
    if (currentQuarter === undefined) return 0;
    const stintsThisQuarter = stints.filter(
      (st) =>
        st.sessionId === sessionId &&
        st.quarter === currentQuarter &&
        !st.endAt,
    );
    if (stintsThisQuarter.length === 0) return 0;
    const earliest = Math.min(
      ...stintsThisQuarter.map((st) => new Date(st.startAt).getTime()),
    );
    return now - earliest;
  }, [stints, sessionId, currentQuarter, now]);

  const handleSlotPress = (slot: FormationSlot) => {
    if (currentQuarter !== undefined && currentQuarter === selectedQuarter) {
      // Live in this quarter — don't allow editing the lineup mid-quarter
      // through this UI; subs are not yet supported in 7x7 simplified view.
      return;
    }
    setSlotSheet(slot);
  };

  const handleStartQuarter = async () => {
    const team = quarterTeams[String(selectedQuarter)] ?? {};
    const required = formation?.slots.length ?? 7;
    const filled = Object.keys(team).length;
    if (filled < required) {
      await notify(
        'Équipe incomplète',
        `Place les ${required - filled} joueur${
          required - filled > 1 ? 's' : ''
        } restant${required - filled > 1 ? 's' : ''} pour démarrer le Q${selectedQuarter}. (${filled}/${required})`,
      );
      return;
    }
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      );
    } catch {}
    await startQuarter(sessionId, selectedQuarter);
  };

  const handleEndQuarter = async () => {
    const ok = await confirm({
      title: `Fin du Q${currentQuarter} ?`,
      message: 'Le temps de jeu de ce quart-temps sera figé.',
      confirmLabel: 'Terminer',
    });
    if (!ok) return;
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      );
    } catch {}
    await endQuarter(sessionId);
    if (currentQuarter && currentQuarter < 4) {
      setSelectedQuarter(currentQuarter + 1);
    }
  };

  const handleEndMatch = async () => {
    const ok = await confirm({
      title: 'Finir le match ?',
      message:
        'Tous les temps de jeu en cours seront fermés et le match sera marqué terminé.',
      confirmLabel: 'Finir',
    });
    if (!ok) return;
    await endMatch(sessionId);
  };

  // Decide what action to show.
  const canStartSelected =
    !ended &&
    currentQuarter === undefined &&
    !playedQuarters.has(selectedQuarter);
  const allQuartersDone =
    playedQuarters.size >= 4 || (playedQuarters.size === 3 && currentQuarter === 4);

  return (
    <>
      <Card style={styles.bannerCard}>
        <View style={styles.bannerRow}>
          <Text style={styles.bannerEmoji}>🏟️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Match 7 vs 7</Text>
            <Text style={styles.bannerHint}>
              4 quart-temps de 15 min · 4 équipes
            </Text>
          </View>
          {formation ? (
            <View style={styles.formationPill}>
              <Text style={styles.formationPillLabel}>{formation.label}</Text>
            </View>
          ) : null}
        </View>
      </Card>

      <View style={styles.quarterTabs}>
        {[1, 2, 3, 4].map((q) => {
          const active = selectedQuarter === q;
          const isLive = currentQuarter === q;
          const isDone = playedQuarters.has(q);
          return (
            <Pressable
              key={q}
              onPress={() => setSelectedQuarter(q)}
              style={[
                styles.quarterTab,
                active && styles.quarterTabActive,
                isLive && styles.quarterTabLive,
                isDone && styles.quarterTabDone,
              ]}
            >
              <Text
                style={[
                  styles.quarterTabLabel,
                  active && styles.quarterTabLabelActive,
                  isLive && styles.quarterTabLabelLive,
                ]}
              >
                Q{q}
              </Text>
              <Text style={styles.quarterTabSub}>
                {isLive
                  ? '● Live'
                  : isDone
                  ? '✓ Joué'
                  : `${
                      Object.keys(quarterTeams[String(q)] ?? {}).length
                    }/${formation?.slots.length ?? 7}`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {currentQuarter !== undefined && !ended ? (
        <Card style={styles.liveClock}>
          <Text style={styles.liveClockLabel}>Q{currentQuarter} en cours</Text>
          <Text style={styles.liveClockValue}>
            {fmt(quarterElapsed)} <Text style={styles.liveClockTotal}>/ 15:00</Text>
          </Text>
          <Text style={styles.liveClockHint}>
            Tu peux terminer le quart-temps à tout moment, pas besoin
            d'attendre 15 min.
          </Text>
          <Pressable
            onPress={handleEndQuarter}
            style={styles.liveEndBtn}
          >
            <Text style={styles.liveEndBtnLabel}>
              ⏹ Terminer Q{currentQuarter} maintenant
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {formation ? (
        <Card style={styles.pitchCard}>
          <FormationPitch
            formation={formation}
            lineupSlots={quarterTeams[String(selectedQuarter)] ?? {}}
            players={players}
            onSlotPress={handleSlotPress}
            readOnly={
              ended ||
              (currentQuarter !== undefined && currentQuarter === selectedQuarter)
            }
          />
          <Pressable
            onPress={() =>
              notify(
                'Changer de formation',
                'Pour cette version 7v7, la formation 2-3-1 est utilisée par défaut. Tu pourras la personnaliser depuis le picker formation existant en allant sur la séance.',
              )
            }
            style={styles.formationFootnote}
          >
            <Text style={styles.formationFootnoteText}>
              Formation : {formation.label} · même pour les 4 quart-temps
            </Text>
          </Pressable>
        </Card>
      ) : null}

      <View style={styles.actionsRow}>
        {canStartSelected ? (
          <Button
            label={`▶ Démarrer Q${selectedQuarter}`}
            onPress={handleStartQuarter}
            fullWidth
          />
        ) : null}
        {!ended &&
        playedQuarters.size > 0 &&
        currentQuarter === undefined &&
        playedQuarters.has(selectedQuarter) ? (
          <View style={styles.doneNote}>
            <Text style={styles.doneNoteText}>
              Q{selectedQuarter} déjà joué — sélectionne un autre quart-temps.
            </Text>
          </View>
        ) : null}
      </View>

      {(playedQuarters.size >= 1 || allQuartersDone) && !ended ? (
        <View style={styles.endRow}>
          <Button
            label="Finir le match"
            variant="ghost"
            onPress={handleEndMatch}
            fullWidth
          />
        </View>
      ) : null}

      <Text style={styles.sectionHeader}>Convoqués · temps de jeu cumulé</Text>
      <Card padded={false} style={styles.timesCard}>
        {convoqués.length === 0 ? (
          <View style={{ padding: spacing.md }}>
            <Text style={styles.muted}>
              Aucun joueur convoqué — retourne sur la convocation pour en
              ajouter.
            </Text>
          </View>
        ) : (
          convoqués
            .map((p) => ({
              player: p,
              ms: getPlayerPlayMs(p.id, sessionId, now),
            }))
            .sort((a, b) => b.ms - a.ms)
            .map(({ player, ms }, idx, arr) => (
              <View
                key={player.id}
                style={[
                  styles.timeRow,
                  idx < arr.length - 1 && styles.divider,
                ]}
              >
                <Avatar
                  name={player.name}
                  photoUri={player.photoUri}
                  size={32}
                />
                <Text style={styles.timeName} numberOfLines={1}>
                  {player.name}
                </Text>
                <Text style={styles.timeValue}>{fmt(ms)}</Text>
              </View>
            ))
        )}
      </Card>

      <BottomSheet
        visible={!!slotSheet}
        title={
          slotSheet
            ? `Q${selectedQuarter} · ${POSITION_META[slotSheet.position].label}`
            : ''
        }
        onClose={() => setSlotSheet(null)}
      >
        {slotSheet ? (
          <SlotPicker
            sessionId={sessionId}
            quarter={selectedQuarter}
            slot={slotSheet}
            quarterTeam={quarterTeams[String(selectedQuarter)] ?? {}}
            players={players}
            convoqués={convoqués}
            assignToQuarterSlot={assignToQuarterSlot}
            onClose={() => setSlotSheet(null)}
          />
        ) : null}
      </BottomSheet>
    </>
  );
}

function SlotPicker({
  sessionId,
  quarter,
  slot,
  quarterTeam,
  players,
  convoqués,
  assignToQuarterSlot,
  onClose,
}: {
  sessionId: string;
  quarter: number;
  slot: FormationSlot;
  quarterTeam: Record<string, string>;
  players: Player[];
  convoqués: Player[];
  assignToQuarterSlot: (
    sessionId: string,
    quarter: number,
    slotId: string,
    playerId: string | null,
  ) => Promise<void>;
  onClose: () => void;
}) {
  const assignedId = quarterTeam[slot.id];
  const assigned = assignedId ? players.find((p) => p.id === assignedId) : undefined;
  const placedIds = new Set(Object.values(quarterTeam));

  const available = convoqués.filter(
    (p) => p.id !== assignedId && !placedIds.has(p.id),
  );
  const otherPlaced = convoqués.filter(
    (p) => p.id !== assignedId && placedIds.has(p.id),
  );

  return (
    <View>
      {assigned ? (
        <View style={pickerStyles.row}>
          <Avatar name={assigned.name} photoUri={assigned.photoUri} size={36} />
          <Text style={pickerStyles.rowName}>{assigned.name}</Text>
          <Pressable
            onPress={async () => {
              await assignToQuarterSlot(sessionId, quarter, slot.id, null);
              onClose();
            }}
            style={pickerStyles.removeBtn}
          >
            <Text style={pickerStyles.removeLabel}>Retirer</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={pickerStyles.group}>Convoqués disponibles</Text>
      {available.length === 0 ? (
        <Text style={pickerStyles.muted}>
          Aucun joueur libre pour ce poste dans ce quart-temps.
        </Text>
      ) : (
        <View style={pickerStyles.grid}>
          {available.map((p) => (
            <Pressable
              key={p.id}
              onPress={async () => {
                await assignToQuarterSlot(sessionId, quarter, slot.id, p.id);
                onClose();
              }}
              style={pickerStyles.chip}
            >
              <Avatar name={p.name} photoUri={p.photoUri} size={28} />
              <Text style={pickerStyles.chipName}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {otherPlaced.length > 0 ? (
        <>
          <Text style={pickerStyles.group}>Déjà placés (repositionner)</Text>
          <View style={pickerStyles.grid}>
            {otherPlaced.map((p) => (
              <Pressable
                key={p.id}
                onPress={async () => {
                  await assignToQuarterSlot(sessionId, quarter, slot.id, p.id);
                  onClose();
                }}
                style={[pickerStyles.chip, pickerStyles.chipMoved]}
              >
                <Avatar name={p.name} photoUri={p.photoUri} size={28} />
                <Text style={pickerStyles.chipName}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerCard: { marginBottom: 0 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bannerEmoji: { fontSize: 28 },
  bannerTitle: { ...typography.h3, color: colors.textPrimary },
  bannerHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  formationPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  formationPillLabel: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  quarterTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quarterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  quarterTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  quarterTabLive: {
    borderColor: colors.success,
    backgroundColor: '#DCFCE7',
  },
  quarterTabDone: {
    backgroundColor: colors.background,
  },
  quarterTabLabel: {
    ...typography.h3,
    color: colors.textPrimary,
    fontSize: 16,
  },
  quarterTabLabelActive: { color: colors.primary },
  quarterTabLabelLive: { color: colors.success },
  quarterTabSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 10,
  },
  liveClock: {
    alignItems: 'center',
  },
  liveClockLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  liveClockValue: {
    ...typography.number,
    fontSize: 36,
    color: colors.success,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  liveClockTotal: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '600',
  },
  liveClockHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  liveEndBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  liveEndBtnLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  pitchCard: {},
  formationFootnote: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  formationFootnoteText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionsRow: { gap: spacing.sm },
  doneNote: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
  },
  doneNoteText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  endRow: { marginTop: spacing.sm },
  sectionHeader: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  timesCard: {},
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  timeName: { flex: 1, ...typography.bodyBold, color: colors.textPrimary },
  timeValue: {
    ...typography.bodyBold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  muted: { ...typography.body, color: colors.textMuted },
});

const pickerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  rowName: {
    flex: 1,
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  removeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: '#FEE2E2',
  },
  removeLabel: {
    color: colors.danger,
    fontWeight: '700',
  },
  group: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  muted: {
    ...typography.body,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipMoved: {
    borderStyle: 'dashed',
    borderColor: colors.warning,
  },
  chipName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
});
