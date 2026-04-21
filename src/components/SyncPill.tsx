import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '@/theme';
import type { SyncStatus } from '@/context/DataContext';

type Props = {
  status: SyncStatus;
  onRefresh: () => void;
};

export function SyncPill({ status, onRefresh }: Props) {
  const meta = META[status];
  return (
    <Pressable
      onPress={onRefresh}
      disabled={status === 'syncing'}
      style={[styles.pill, { backgroundColor: meta.bg }]}
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

const META: Record<SyncStatus, { label: string; color: string; bg: string }> = {
  idle: { label: 'Cloud', color: colors.textMuted, bg: colors.accentSoft },
  syncing: { label: 'Sync…', color: colors.primary, bg: colors.primarySoft },
  synced: { label: 'Synchronisé', color: colors.success, bg: '#DCFCE7' },
  offline: { label: 'Hors ligne', color: colors.warning, bg: '#FEF3C7' },
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { ...typography.caption, fontWeight: '700' },
});
