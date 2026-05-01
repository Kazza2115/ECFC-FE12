import type { AttendanceStatus, SessionKind } from '@/types';
import { isMatchKind } from '@/types';

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
    label: 'Présent au club',
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
    label: 'SFC · pas au club',
    glyph: '★',
    color: '#B45309',
    bg: '#FEF3C7',
    countsPresent: true,
    primary: false,
  },
  return: {
    key: 'return',
    short: 'RC',
    label: 'Retour au club',
    glyph: '↺',
    color: '#B45309',
    bg: '#FEF3C7',
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

export const PRIMARY_STATUSES_TRAINING: AttendanceStatus[] = [
  'present',
  'excused',
  'unexcused',
];

export const PRIMARY_STATUSES_MATCH: AttendanceStatus[] = [
  'present',
  'not_called',
  'excused',
];

export const SECONDARY_STATUSES_TRAINING: AttendanceStatus[] = [
  'sfc',
  'return',
  'vacation',
  'not_called',
];

export const SECONDARY_STATUSES_MATCH: AttendanceStatus[] = [
  'unexcused',
  'sfc',
  'return',
  'vacation',
];

export function primaryStatusesFor(kind: SessionKind | undefined): AttendanceStatus[] {
  return isMatchKind(kind) ? PRIMARY_STATUSES_MATCH : PRIMARY_STATUSES_TRAINING;
}

export function secondaryStatusesFor(kind: SessionKind | undefined): AttendanceStatus[] {
  return isMatchKind(kind) ? SECONDARY_STATUSES_MATCH : SECONDARY_STATUSES_TRAINING;
}

export function labelForStatus(
  kind: SessionKind | undefined,
  status: AttendanceStatus,
): string {
  if (isMatchKind(kind)) {
    if (status === 'present') return 'Convoqué';
    if (status === 'not_called') return 'Non convoqué';
  }
  return STATUS_META[status].label;
}

export function shortForStatus(
  kind: SessionKind | undefined,
  status: AttendanceStatus,
): string {
  if (isMatchKind(kind)) {
    if (status === 'present') return 'Conv.';
    if (status === 'not_called') return 'Non';
  }
  return STATUS_META[status].short;
}

export const DEFAULT_STATUS: AttendanceStatus = 'present';
export const DEFAULT_MATCH_STATUS: AttendanceStatus = 'not_called';

export function defaultStatusFor(kind: SessionKind | undefined): AttendanceStatus {
  return isMatchKind(kind) ? DEFAULT_MATCH_STATUS : DEFAULT_STATUS;
}
