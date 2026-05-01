// iOS-aligned design tokens. Avoids harsh shadows and contrast on
// purpose — the app should feel light, modern and Apple-like.

export const colors = {
  // Brand
  primary: '#1E40AF',
  primaryDark: '#172E66',
  primarySoft: '#E5EDFC',
  accent: '#000000',
  accentSoft: '#F2F2F7',
  gold: '#F4C430',

  // Surfaces (iOS systemGroupedBackground / secondarySystemBackground)
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceMuted: '#F9F9FB',
  border: '#E5E5EA',

  // Text (iOS label / secondaryLabel / tertiaryLabel)
  textPrimary: '#000000',
  textSecondary: '#3C3C4399',
  textMuted: '#8E8E93',
  textDisabled: '#C7C7CC',

  // Semantics (iOS system colors)
  success: '#34C759',
  danger: '#FF3B30',
  warning: '#FF9500',
  info: '#5AC8FA',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const typography = {
  // iOS Large Title style — used at the top of the main screens.
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

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
};
