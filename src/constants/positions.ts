import type { PlayerPosition } from '@/types';

export type PositionMeta = {
  key: PlayerPosition;
  label: string;
  short: string;
  color: string;
  bg: string;
};

export const POSITION_META: Record<PlayerPosition, PositionMeta> = {
  GK: {
    key: 'GK',
    label: 'Gardien',
    short: 'GK',
    color: '#B45309',
    bg: '#FEF3C7',
  },
  DEF: {
    key: 'DEF',
    label: 'Défense',
    short: 'DEF',
    color: '#1D4ED8',
    bg: '#DBEAFE',
  },
  MID: {
    key: 'MID',
    label: 'Milieu',
    short: 'MID',
    color: '#6D28D9',
    bg: '#EDE9FE',
  },
  ATT: {
    key: 'ATT',
    label: 'Attaque',
    short: 'ATT',
    color: '#0F7A3B',
    bg: '#D4F3DF',
  },
};

export const POSITION_ORDER: PlayerPosition[] = ['GK', 'DEF', 'MID', 'ATT'];
