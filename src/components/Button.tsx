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
  // HeroUI signature: solid colored buttons sit on a soft glow tinted
  // by the brand color. The glow is invisible on Android < API 28 but
  // it's a progressive enhancement, not a regression.
  const primaryShadow = {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  };
  const dangerShadow = {
    shadowColor: c.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  };
  const variants: Record<Variant, { container: object; label: object }> = {
    primary: {
      container: { backgroundColor: c.primary, ...primaryShadow },
      label: { color: c.onPrimary, fontWeight: '700' },
    },
    secondary: {
      container: { backgroundColor: c.primarySoft },
      label: { color: c.primary, fontWeight: '600' },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      label: { color: c.primary, fontWeight: '600' },
    },
    danger: {
      container: { backgroundColor: c.danger, ...dangerShadow },
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
      borderRadius: radius.lg,
      gap: 8,
    },
    fullWidth: { alignSelf: 'stretch' },
    pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
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
