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

const SHORT_BY_POSITION: Record<PlayerPosition, string> = {
  GK: 'GK',
  DEF: 'D',
  MID: 'M',
  ATT: 'A',
};

export function buildCustomFormation(counts: number[]): Formation | null {
  if (counts.length < 2 || counts.length > 4) return null;
  if (counts.some((n) => !Number.isInteger(n) || n < 0 || n > 6)) return null;

  // Vertical bands depending on number of lines.
  const yLines: number[] =
    counts.length === 2
      ? [70, 28]
      : counts.length === 3
      ? [76, 52, 22]
      : [78, 60, 38, 18];

  const slots: FormationSlot[] = [
    { id: 'gk', x: 50, y: 93, position: 'GK', label: 'GK' },
  ];
  for (let lineIdx = 0; lineIdx < counts.length; lineIdx++) {
    const c = counts[lineIdx];
    if (c <= 0) continue;
    const y = yLines[lineIdx];
    const position: PlayerPosition =
      lineIdx === 0
        ? 'DEF'
        : lineIdx === counts.length - 1
        ? 'ATT'
        : 'MID';
    for (let i = 0; i < c; i++) {
      const x = ((i + 1) * 100) / (c + 1);
      slots.push({
        id: `l${lineIdx}_${i}`,
        x,
        y,
        position,
        label: SHORT_BY_POSITION[position],
      });
    }
  }
  const id = counts.join('-');
  return {
    id,
    label: id,
    size: 11,
    slots,
  };
}

export function findFormation(id: string | undefined): Formation | null {
  if (!id) return null;
  const found = FORMATIONS.find((f) => f.id === id);
  if (found) return found;
  // Try parsing dynamic "X-Y-Z" / "X-Y-Z-W" style id.
  const parts = id.split('-').map((p) => Number(p));
  if (parts.length >= 2 && parts.length <= 4 && parts.every(Number.isFinite)) {
    return buildCustomFormation(parts);
  }
  return null;
}
