import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';
import { confirm, notify } from '@/utils/confirm';
import type { SyncStatus } from '@/context/DataContext';

type Props = {
  status: SyncStatus;
  lastError?: string | null;
  onRefresh: () => void;
};

export function SyncPill({ status, lastError, onRefresh }: Props) {
  const styles = useThemedStyles(makeStyles);
  const meta = styles.meta[status];

  const handlePress = async () => {
    if (status === 'syncing') return;
    if (status === 'offline' && lastError) {
      const ok = await confirm({
        title: 'Synchronisation hors ligne',
        message: `Dernière erreur :\n\n${lastError}\n\nRéessayer maintenant ?`,
        confirmLabel: 'Réessayer',
      });
      if (ok) onRefresh();
      return;
    }
    if (status === 'offline') {
      await notify(
        'Hors ligne',
        'Impossible de joindre Supabase. Vérifie ta connexion ou que les tables / colonnes sont à jour, puis re-tape la pastille.',
      );
      onRefresh();
      return;
    }
    onRefresh();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={status === 'syncing'}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: meta.bg },
        pressed && { opacity: 0.7 },
      ]}
    >
      {status === 'syncing' ? (
        <ActivityIndicator color={meta.color} size="small" />
      ) : (
        <View style={[styles.dot, { backgroundColor: meta.color }]} />
      )}
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: ThemedColors) => {
  const meta: Record<SyncStatus, { label: string; color: string; bg: string }> = {
    idle: { label: 'Cloud', color: c.textMuted, bg: c.accentSoft },
    syncing: { label: 'Sync…', color: c.primary, bg: c.primarySoft },
    synced: { label: 'Synchronisé', color: c.successText, bg: c.successSoft },
    offline: { label: 'Hors ligne', color: c.warningText, bg: c.warningSoft },
  };
  const sheet = StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.pill,
    },
    dot: { width: 7, height: 7, borderRadius: 4 },
    label: { ...typography.caption, fontWeight: '700' },
  });
  return { ...sheet, meta };
};
