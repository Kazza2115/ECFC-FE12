import React, { useEffect, useRef } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

type Props = {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  // Stagger the pulse phase so a row of skeletons doesn't pulse in
  // perfect lockstep — feels more alive.
  delay?: number;
  style?: ViewStyle | ViewStyle[];
};

/**
 * Pulsing placeholder block. Background colour comes from the active
 * theme's `surfaceMuted` so it sits naturally on top of cards in both
 * light and dark mode. Animation runs on the native driver — cheap.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 10,
  delay = 0,
  style,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 850,
        useNativeDriver: true,
        delay,
      }),
      Animated.timing(opacity, {
        toValue: 0.55,
        duration: 850,
        useNativeDriver: true,
      }),
    ]);
    const loop = Animated.loop(sequence);
    loop.start();
    return () => loop.stop();
  }, [opacity, delay]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: styles.colors.bg,
          opacity,
        },
        style as ViewStyle,
      ]}
    />
  );
}

const makeStyles = (c: ThemedColors) => ({
  colors: {
    bg: c.surfaceMuted,
  },
});
