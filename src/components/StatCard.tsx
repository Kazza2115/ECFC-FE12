import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
};

export function StatCard({ label, value, hint, accent }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, accent ? { color: accent } : null]}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {accent ? <View style={[styles.accent, { backgroundColor: accent }]} /> : null}
    </Card>
  );
}

const makeStyles = (c: ThemedColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 110,
      overflow: 'hidden',
    },
    label: {
      ...typography.caption,
      color: c.textSecondary,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    value: {
      ...typography.number,
      color: c.textPrimary,
    },
    hint: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: spacing.xs,
    },
    accent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },
  });
