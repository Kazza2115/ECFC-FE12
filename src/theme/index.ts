// iOS-aligned design tokens. Avoids harsh shadows and contrast on
// purpose — the app should feel light, modern and Apple-like.
//
// `colors` and `shadow` are mutable objects: when the user toggles
// night mode, ThemeProvider rewrites them in place via Object.assign
// and bumps a key on the navigator so every StyleSheet.create snapshots
// the new palette.

import {
  type Palette,
  type ShadowPalette,
  lightPalette,
  darkPalette,
  lightShadow,
  darkShadow,
} from './palettes';

export type ThemeMode = 'light' | 'dark';

export const colors: Palette = { ...lightPalette };
export const shadow: ShadowPalette = JSON.parse(JSON.stringify(lightShadow));

let activeMode: ThemeMode = 'light';

export function applyPalette(mode: ThemeMode): void {
  activeMode = mode;
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  const shadowSet = mode === 'dark' ? darkShadow : lightShadow;
  Object.assign(colors, palette);
  Object.assign(shadow.card, shadowSet.card);
  Object.assign(shadow.floating, shadowSet.floating);
}

export function getActiveMode(): ThemeMode {
  return activeMode;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
  },
  h1: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  micro: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  number: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
};
