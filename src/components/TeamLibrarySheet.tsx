import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from './Avatar';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { useData } from '@/context/DataContext';
import { colors, radius, spacing, typography } from '@/theme';
import { confirm, notify } from '@/utils/confirm';
import type { SavedTeam } from '@/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  // Current slot map being saved/loaded (keys = slotId)
  currentSlots: Record<string, string>;
  currentFormation?: string;
  // Filter shown teams to those whose formation matches the target.
  // Undefined = show all.
  formationFilter?: string;
  // Apply selected team to wherever the parent context cares about.
  onApply: (team: SavedTeam) => Promise<void> | void;
};

export function TeamLibrarySheet({
  visible,
  onClose,
  title,
  currentSlots,
  currentFormation,
  formationFilter,
  onApply,
}: Props) {
  const {
    savedTeams,
    saveTeam,
    deleteSavedTeam,
    players,
  } = useData();
  const [name, setName] = useState('');

  const visibleTeams = formationFilter
    ? savedTeams.filter((t) => !t.formation || t.formation === formationFilter)
    : savedTeams;

  const handleSave = async () => {
    const filled = Object.keys(currentSlots).length;
    if (filled === 0) {
      await notify(
        'Composition vide',
        'Place au moins un joueur sur le terrain avant d\'enregistrer cette équipe.',
      );
      return;
    }
    await saveTeam(name, currentSlots, currentFormation);
    setName('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.section}>
        <Text style={styles.label}>Enregistrer la composition actuelle</Text>
        <View style={styles.saveRow}>
          <TextInput
            style={styles.input}
            placeholder="Nom de l'équipe (ex. 'Q1 départ')"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <Pressable onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnLabel}>💾</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>
          {Object.keys(currentSlots).length} joueur
          {Object.keys(currentSlots).length > 1 ? 's' : ''} placé
          {Object.keys(currentSlots).length > 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Mes équipes enregistrées</Text>
        {visibleTeams.length === 0 ? (
          <Text style={styles.muted}>
            Aucune équipe sauvegardée pour l'instant.
          </Text>
        ) : (
          visibleTeams.map((team) => {
            const ids = Object.values(team.slots);
            const teamPlayers = ids
              .map((pid) => players.find((p) => p.id === pid))
              .filter(Boolean);
            return (
              <View key={team.id} style={styles.teamCard}>
                <View style={styles.teamHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamName} numberOfLines={1}>
                      {team.name}
                    </Text>
                    <Text style={styles.teamMeta}>
                      {team.formation
                        ? `${team.formation} · `
                        : ''}
                      {ids.length} joueur{ids.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={async () => {
                      await onApply(team);
                      onClose();
                    }}
                    style={styles.applyBtn}
                  >
                    <Text style={styles.applyBtnLabel}>Charger</Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      const ok = await confirm({
                        title: `Supprimer "${team.name}" ?`,
                        confirmLabel: 'Supprimer',
                        destructive: true,
                      });
                      if (ok) await deleteSavedTeam(team.id);
                    }}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnLabel}>×</Text>
                  </Pressable>
                </View>
                <View style={styles.avatarsRow}>
                  {teamPlayers.slice(0, 11).map((p) =>
                    p ? (
                      <Avatar
                        key={p.id}
                        name={p.name}
                        photoUri={p.photoUri}
                        size={26}
                      />
                    ) : null,
                  )}
                  {teamPlayers.length > 11 ? (
                    <Text style={styles.moreLabel}>
                      +{teamPlayers.length - 11}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>

      <Button label="Fermer" variant="secondary" onPress={onClose} fullWidth />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.textPrimary,
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnLabel: { fontSize: 18 },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  muted: { ...typography.body, color: colors.textMuted },
  teamCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamName: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 15 },
  teamMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  applyBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  applyBtnLabel: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnLabel: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 20,
    lineHeight: 20,
  },
  avatarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  moreLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
});
