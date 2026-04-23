import type { PlayerPosition } from '@/types';

export type FormationSlot = {
  id: string;
  x: number; // 0-100 (horizontal, from left to right)
  y: number; // 0-100 (vertical, 0 = opponent goal / top, 100 = our goal / bottom)
  position: PlayerPosition;
  label: string;
};

export type Formation = {
  id: string;
  label: string;
  size: 11;
  slots: FormationSlot[];
};

export const FORMATIONS: Formation[] = [
  {
    id: '4-3-3',
    label: '4-3-3',
    size: 11,
    slots: [
      { id: 'gk', x: 50, y: 93, position: 'GK', label: 'GK' },
      { id: 'lb', x: 16, y: 73, position: 'DEF', label: 'LB' },
      { id: 'lcb', x: 38, y: 77, position: 'DEF', label: 'LCB' },
      { id: 'rcb', x: 62, y: 77, position: 'DEF', label: 'RCB' },
      { id: 'rb', x: 84, y: 73, position: 'DEF', label: 'RB' },
      { id: 'lcm', x: 28, y: 54, position: 'MID', label: 'LCM' },
      { id: 'cm', x: 50, y: 58, position: 'MID', label: 'CM' },
      { id: 'rcm', x: 72, y: 54, position: 'MID', label: 'RCM' },
      { id: 'lw', x: 22, y: 24, position: 'ATT', label: 'AG' },
      { id: 'st', x: 50, y: 18, position: 'ATT', label: 'BU' },
      { id: 'rw', x: 78, y: 24, position: 'ATT', label: 'AD' },
    ],
  },
  {
    id: '4-4-2',
    label: '4-4-2',
    size: 11,
    slots: [
      { id: 'gk', x: 50, y: 93, position: 'GK', label: 'GK' },
      { id: 'lb', x: 16, y: 73, position: 'DEF', label: 'LB' },
      { id: 'lcb', x: 38, y: 77, position: 'DEF', label: 'LCB' },
      { id: 'rcb', x: 62, y: 77, position: 'DEF', label: 'RCB' },
      { id: 'rb', x: 84, y: 73, position: 'DEF', label: 'RB' },
      { id: 'lm', x: 16, y: 50, position: 'MID', label: 'LM' },
      { id: 'lcm', x: 38, y: 53, position: 'MID', label: 'LCM' },
      { id: 'rcm', x: 62, y: 53, position: 'MID', label: 'RCM' },
      { id: 'rm', x: 84, y: 50, position: 'MID', label: 'RM' },
      { id: 'lst', x: 36, y: 22, position: 'ATT', label: 'BU' },
      { id: 'rst', x: 64, y: 22, position: 'ATT', label: 'BU' },
    ],
  },
  {
    id: '4-2-3-1',
    label: '4-2-3-1',
    size: 11,
    slots: [
      { id: 'gk', x: 50, y: 93, position: 'GK', label: 'GK' },
      { id: 'lb', x: 16, y: 73, position: 'DEF', label: 'LB' },
      { id: 'lcb', x: 38, y: 77, position: 'DEF', label: 'LCB' },
      { id: 'rcb', x: 62, y: 77, position: 'DEF', label: 'RCB' },
      { id: 'rb', x: 84, y: 73, position: 'DEF', label: 'RB' },
      { id: 'ldm', x: 38, y: 60, position: 'MID', label: 'MD' },
      { id: 'rdm', x: 62, y: 60, position: 'MID', label: 'MD' },
      { id: 'lam', x: 20, y: 36, position: 'MID', label: 'AG' },
      { id: 'cam', x: 50, y: 36, position: 'MID', label: 'MO' },
      { id: 'ram', x: 80, y: 36, position: 'MID', label: 'AD' },
      { id: 'st', x: 50, y: 15, position: 'ATT', label: 'BU' },
    ],
  },
  {
    id: '3-5-2',
    label: '3-5-2',
    size: 11,
    slots: [
      { id: 'gk', x: 50, y: 93, position: 'GK', label: 'GK' },
      { id: 'lcb', x: 28, y: 76, position: 'DEF', label: 'DG' },
      { id: 'cb', x: 50, y: 78, position: 'DEF', label: 'DC' },
      { id: 'rcb', x: 72, y: 76, position: 'DEF', label: 'DD' },
      { id: 'lwb', x: 12, y: 52, position: 'MID', label: 'PG' },
      { id: 'lcm', x: 32, y: 54, position: 'MID', label: 'MG' },
      { id: 'cm', x: 50, y: 56, position: 'MID', label: 'MC' },
      { id: 'rcm', x: 68, y: 54, position: 'MID', label: 'MD' },
      { id: 'rwb', x: 88, y: 52, position: 'MID', label: 'PD' },
      { id: 'lst', x: 38, y: 20, position: 'ATT', label: 'BU' },
      { id: 'rst', x: 62, y: 20, position: 'ATT', label: 'BU' },
    ],
  },
  {
    id: '3-4-3',
    label: '3-4-3',
    size: 11,
    slots: [
      { id: 'gk', x: 50, y: 93, position: 'GK', label: 'GK' },
      { id: 'lcb', x: 28, y: 76, position: 'DEF', label: 'DG' },
      { id: 'cb', x: 50, y: 78, position: 'DEF', label: 'DC' },
      { id: 'rcb', x: 72, y: 76, position: 'DEF', label: 'DD' },
      { id: 'lm', x: 16, y: 50, position: 'MID', label: 'MG' },
      { id: 'lcm', x: 38, y: 53, position: 'MID', label: 'MG' },
      { id: 'rcm', x: 62, y: 53, position: 'MID', label: 'MD' },
      { id: 'rm', x: 84, y: 50, position: 'MID', label: 'MD' },
      { id: 'lw', x: 22, y: 22, position: 'ATT', label: 'AG' },
      { id: 'st', x: 50, y: 18, position: 'ATT', label: 'BU' },
      { id: 'rw', x: 78, y: 22, position: 'ATT', label: 'AD' },
    ],
  },
];

export const DEFAULT_FORMATION_ID = '4-3-3';

export function findFormation(id: string | undefined): Formation | null {
  if (!id) return null;
  return FORMATIONS.find((f) => f.id === id) ?? null;
}
