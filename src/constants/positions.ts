import type { PlayerPosition } from '@/types';

export type PositionMeta = {
  key: PlayerPosition;
  label: string;
  short: string;
  color: string;
  bg: string;
};

// Mode-agnostic colors with translucent backgrounds.
export const POSITION_META: Record<PlayerPosition, PositionMeta> = {
  GK: {
    key: 'GK',
    label: 'Gardien',
    short: 'GK',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.18)',
  },
  DEF: {
    key: 'DEF',
    label: 'Défense',
    short: 'DEF',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.18)',
  },
  MID: {
    key: 'MID',
    label: 'Milieu',
    short: 'MID',
    color: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.18)',
  },
  ATT: {
    key: 'ATT',
    label: 'Attaque',
    short: 'ATT',
    color: '#22C55E',
    bg: 'rgba(34, 197, 94, 0.18)',
  },
};

export const POSITION_ORDER: PlayerPosition[] = ['GK', 'DEF', 'MID', 'ATT'];
