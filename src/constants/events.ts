import type { MatchEventType } from '@/types';

export type EventMeta = {
  key: MatchEventType;
  label: string;
  short: string;
  glyph: string;
  color: string;
  bg: string;
};

// Mode-agnostic colors with translucent backgrounds — readable on
// both light and dark surfaces.
export const EVENT_META: Record<MatchEventType, EventMeta> = {
  goal: {
    key: 'goal',
    label: 'But',
    short: 'But',
    glyph: '⚽',
    color: '#22C55E',
    bg: 'rgba(34, 197, 94, 0.18)',
  },
  assist: {
    key: 'assist',
    label: 'Passe décisive',
    short: 'Pass',
    glyph: '🎯',
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.18)',
  },
  key: {
    key: 'key',
    label: 'Moment clé',
    short: 'Moment',
    glyph: '⭐',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.18)',
  },
  yellow: {
    key: 'yellow',
    label: 'Carton jaune',
    short: 'Jaune',
    glyph: '🟨',
    color: '#EAB308',
    bg: 'rgba(234, 179, 8, 0.18)',
  },
  red: {
    key: 'red',
    label: 'Carton rouge',
    short: 'Rouge',
    glyph: '🟥',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.18)',
  },
};

export const EVENT_ORDER: MatchEventType[] = [
  'goal',
  'assist',
  'key',
  'yellow',
  'red',
];
