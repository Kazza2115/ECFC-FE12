import { useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { colors, shadow } from '@/theme';

export type ThemedColors = typeof colors;
export type ThemedShadow = typeof shadow;

/**
 * Build a StyleSheet that reacts to theme changes. The factory receives
 * the live `colors` and `shadow` palettes — it is re-invoked whenever
 * the theme version bumps, so every screen / component refreshes its
 * computed styles in lock-step with the active mode.
 */
export function useThemedStyles<T>(
  make: (c: ThemedColors, s: ThemedShadow) => T,
): T {
  const { version } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => make(colors, shadow), [version]);
}
