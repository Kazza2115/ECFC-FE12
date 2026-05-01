// Light + dark palettes. The active palette is applied at app boot
// via Object.assign on the exported `colors` / `shadow` objects, then
// the navigator is remounted so every StyleSheet.create snapshots the
// new values.

export type Palette = {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  gold: string;

  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;

  success: string;
  successSoft: string;
  successText: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  info: string;

  overlay: string;

  // Pure white that stays white in any mode (used on top of brand-colored
  // buttons, e.g. the primary CTA label).
  onPrimary: string;
};

export type ShadowPalette = {
  card: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  floating: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
};

export const lightPalette: Palette = {
  primary: '#1E40AF',
  primaryDark: '#172E66',
  primarySoft: '#E5EDFC',
  accent: '#000000',
  accentSoft: '#F2F2F7',
  gold: '#F4C430',

  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceMuted: '#F9F9FB',
  border: '#E5E5EA',

  textPrimary: '#000000',
  textSecondary: '#3C3C4399',
  textMuted: '#8E8E93',
  textDisabled: '#C7C7CC',

  success: '#34C759',
  successSoft: 'rgba(52, 199, 89, 0.12)',
  successText: '#0F7A3B',
  danger: '#FF3B30',
  dangerSoft: 'rgba(255, 59, 48, 0.10)',
  warning: '#FF9500',
  warningSoft: 'rgba(255, 149, 0, 0.12)',
  warningText: '#B45309',
  info: '#5AC8FA',

  overlay: 'rgba(0, 0, 0, 0.4)',

  onPrimary: '#FFFFFF',
};

export const darkPalette: Palette = {
  primary: '#3B82F6',
  primaryDark: '#1E40AF',
  primarySoft: 'rgba(59, 130, 246, 0.18)',
  accent: '#FFFFFF',
  accentSoft: '#1C1C1E',
  gold: '#F4C430',

  background: '#000000',
  surface: '#1C1C1E',
  surfaceMuted: '#2C2C2E',
  border: '#38383A',

  textPrimary: '#FFFFFF',
  textSecondary: '#EBEBF599',
  textMuted: '#8E8E93',
  textDisabled: '#48484A',

  success: '#30D158',
  successSoft: 'rgba(48, 209, 88, 0.20)',
  successText: '#30D158',
  danger: '#FF453A',
  dangerSoft: 'rgba(255, 69, 58, 0.20)',
  warning: '#FF9F0A',
  warningSoft: 'rgba(255, 159, 10, 0.20)',
  warningText: '#FFB340',
  info: '#64D2FF',

  overlay: 'rgba(0, 0, 0, 0.6)',

  onPrimary: '#FFFFFF',
};

export const lightShadow: ShadowPalette = {
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

export const darkShadow: ShadowPalette = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
};
