import type { MatchEventType } from '@/types';

export type EventMeta = {
  key: MatchEventType;
  label: string;
  short: string;
  glyph: string;
  color: string;
  bg: string;
};

export const EVENT_META: Record<MatchEventType, EventMeta> = {
  goal: {
    key: 'goal',
    label: 'But',
    short: 'But',
    glyph: '⚽',
    color: '#0F7A3B',
    bg: '#D4F3DF',
  },
  assist: {
    key: 'assist',
    label: 'Passe décisive',
    short: 'Pass',
    glyph: '🎯',
    color: '#0E7490',
    bg: '#CFFAFE',
  },
  key: {
    key: 'key',
    label: 'Moment clé',
    short: 'Moment',
    glyph: '⭐',
    color: '#B45309',
    bg: '#FEF3C7',
  },
  yellow: {
    key: 'yellow',
    label: 'Carton jaune',
    short: 'Jaune',
    glyph: '🟨',
    color: '#CA8A04',
    bg: '#FEF9C3',
  },
  red: {
    key: 'red',
    label: 'Carton rouge',
    short: 'Rouge',
    glyph: '🟥',
    color: '#B91C1C',
    bg: '#FEE2E2',
  },
};

export const EVENT_ORDER: MatchEventType[] = [
  'goal',
  'assist',
  'key',
  'yellow',
  'red',
];
