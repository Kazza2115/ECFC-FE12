import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { radius, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

type Props = {
  label: string;
  active: boolean;
  onPress: () => void;
  fullWidth?: boolean;
  // Optional accent overrides — useful when a chip needs to convey
  // a state colour different from the brand primary (e.g. live = success).
  accent?: string;
  inactiveAccent?: string;
};

/**
 * Animated chip used in segmented filters / tab strips. Smoothly
 * transitions the background, border and label colour between
 * inactive ↔ active states (~220 ms ease) instead of flipping
 * abruptly.
 */
export function AnimatedChip({
  label,
  active,
  onPress,
  fullWidth,
  accent,
  inactiveAccent,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [active, progress]);

  const activeBg = accent ?? styles.colors.activeBg;
  const inactiveBg = inactiveAccent ?? styles.colors.inactiveBg;
  const activeBorder = accent ?? styles.colors.activeBorder;
  const inactiveBorder = inactiveAccent ?? styles.colors.inactiveBorder;
  const activeLabel = styles.colors.activeLabel;
  const inactiveLabel = accent ?? styles.colors.inactiveLabel;

  return (
    <Pressable onPress={onPress} style={fullWidth ? styles.full : undefined}>
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [inactiveBg, activeBg],
            }),
            borderColor: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [inactiveBorder, activeBorder],
            }),
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.label,
            {
              color: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [inactiveLabel, activeLabel],
              }),
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (c: ThemedColors) => {
  const sheet = StyleSheet.create({
    full: { flex: 1 },
    chip: {
      paddingVertical: 9,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    label: {
      ...typography.caption,
      fontWeight: '700',
    },
  });
  return {
    ...sheet,
    colors: {
      activeBg: c.primary,
      inactiveBg: c.surface,
      activeBorder: c.primary,
      inactiveBorder: c.border,
      activeLabel: c.onPrimary,
      inactiveLabel: c.textSecondary,
    },
  };
};
