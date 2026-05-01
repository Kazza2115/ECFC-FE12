import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

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
  const styles = useThemedStyles(makeStyles);
  const variantStyles = styles.variants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, variantStyles.label]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: ThemedColors) => {
  const variants: Record<Variant, { container: object; label: object }> = {
    primary: {
      container: { backgroundColor: c.primary },
      label: { color: c.onPrimary, fontWeight: '700' },
    },
    secondary: {
      container: { backgroundColor: c.accentSoft },
      label: { color: c.primary, fontWeight: '600' },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      label: { color: c.primary, fontWeight: '600' },
    },
    danger: {
      container: { backgroundColor: c.danger },
      label: { color: c.onPrimary, fontWeight: '700' },
    },
  };
  const sheet = StyleSheet.create({
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
  return { ...sheet, variants };
};
