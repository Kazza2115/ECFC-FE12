import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  title: string;
  description?: string;
  glyph?: string;
  children?: React.ReactNode;
};

export function EmptyState({
  title,
  description,
  glyph = '·',
  children,
}: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.badge}>
        <Text style={styles.badgeGlyph}>{glyph}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badgeGlyph: {
    fontSize: 26,
    color: colors.primary,
    fontWeight: '800',
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  actions: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
