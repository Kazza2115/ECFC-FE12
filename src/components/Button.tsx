import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  fullWidth,
  disabled,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, variantStyles[variant].label]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    gap: 8,
  },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.4 },
  label: {
    ...typography.bodyBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  icon: { marginRight: 2 },
});

const variantStyles: Record<Variant, { container: object; label: object }> = {
  primary: {
    container: { backgroundColor: colors.primary },
    label: { color: '#FFFFFF', fontWeight: '700' },
  },
  secondary: {
    container: { backgroundColor: colors.accentSoft },
    label: { color: colors.primary, fontWeight: '600' },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    label: { color: colors.primary, fontWeight: '600' },
  },
  danger: {
    container: { backgroundColor: colors.danger },
    label: { color: '#FFFFFF', fontWeight: '700' },
  },
};
