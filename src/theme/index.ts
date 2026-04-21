export const colors = {
  primary: '#1E40AF',
  primaryDark: '#172E66',
  primarySoft: '#DBEAFE',
  accent: '#000000',
  accentSoft: '#F3F4F6',
  gold: '#F4C430',
  background: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#ECEFF3',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#F59E0B',
  overlay: 'rgba(17, 24, 39, 0.45)',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyBold: { fontSize: 15, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  number: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -1 },
};

export const shadow = {
  card: {
    shadowColor: '#0B0F19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: '#0B0F19',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
};
