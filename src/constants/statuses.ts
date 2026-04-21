import type { AttendanceStatus } from '@/types';

export type StatusMeta = {
  key: AttendanceStatus;
  short: string;
  label: string;
  glyph: string;
  color: string;
  bg: string;
  countsPresent: boolean;
  primary: boolean;
};

export const STATUS_META: Record<AttendanceStatus, StatusMeta> = {
  present: {
    key: 'present',
    short: 'Pr',
    label: 'Présent',
    glyph: '✓',
    color: '#0F7A3B',
    bg: '#D4F3DF',
    countsPresent: true,
    primary: true,
  },
  excused: {
    key: 'excused',
    short: 'Exc',
    label: 'Absent excusé',
    glyph: '●',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    countsPresent: false,
    primary: true,
  },
  unexcused: {
    key: 'unexcused',
    short: 'Abs',
    label: 'Absent non excusé',
    glyph: '✕',
    color: '#B91C1C',
    bg: '#FEE2E2',
    countsPresent: false,
    primary: true,
  },
  sfc: {
    key: 'sfc',
    short: 'SFC',
    label: 'SFC (sélection)',
    glyph: '★',
    color: '#B45309',
    bg: '#FEF3C7',
    countsPresent: true,
    primary: false,
  },
  return: {
    key: 'return',
    short: 'RC',
    label: 'Retour en club',
    glyph: '↺',
    color: '#047857',
    bg: '#D1FAE5',
    countsPresent: true,
    primary: false,
  },
  vacation: {
    key: 'vacation',
    short: 'Vac',
    label: 'Vacances',
    glyph: '☼',
    color: '#9333EA',
    bg: '#F3E8FF',
    countsPresent: false,
    primary: false,
  },
  not_called: {
    key: 'not_called',
    short: 'NC',
    label: 'Non convoqué',
    glyph: '—',
    color: '#C2410C',
    bg: '#FFEDD5',
    countsPresent: false,
    primary: false,
  },
};

export const PRIMARY_STATUSES: AttendanceStatus[] = [
  'present',
  'excused',
  'unexcused',
];

export const SECONDARY_STATUSES: AttendanceStatus[] = [
  'sfc',
  'return',
  'vacation',
  'not_called',
];

export const DEFAULT_STATUS: AttendanceStatus = 'present';
