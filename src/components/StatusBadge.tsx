import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STATUS_META } from '@/constants/statuses';
import { radius, typography } from '@/theme';
import type { AttendanceStatus } from '@/types';

type Props = { status: AttendanceStatus; compact?: boolean };

export function StatusBadge({ status, compact }: Props) {
  const meta = STATUS_META[status];
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.glyph, { color: meta.color }]}>{meta.glyph}</Text>
      {!compact ? (
        <Text style={[styles.label, { color: meta.color }]}>{meta.short}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    gap: 4,
  },
  glyph: { fontWeight: '800', fontSize: 12 },
  label: { ...typography.caption, fontWeight: '700' },
});
