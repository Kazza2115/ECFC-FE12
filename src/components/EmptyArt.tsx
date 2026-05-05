import React from 'react';
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
} from 'react-native-svg';
import { colors } from '@/theme';

export type ArtName = 'sessions' | 'stats' | 'notes' | 'players' | 'events';

type Props = {
  name: ArtName;
  size?: number;
};

/**
 * Decorative line-art illustrations used inside EmptyState. Each one is
 * a small spot illustration (~120px) that re-uses the active theme's
 * primary palette so it stays coherent in light / dark mode.
 */
export function EmptyArt({ name, size = 120 }: Props) {
  const tint = colors.primary;
  const soft = colors.primarySoft;

  switch (name) {
    case 'sessions':
      return <Sessions size={size} tint={tint} soft={soft} />;
    case 'stats':
      return <Stats size={size} tint={tint} soft={soft} />;
    case 'notes':
      return <Notes size={size} tint={tint} soft={soft} />;
    case 'players':
      return <Players size={size} tint={tint} soft={soft} />;
    case 'events':
      return <Events size={size} tint={tint} soft={soft} />;
  }
}

type ArtProps = { size: number; tint: string; soft: string };

function Sessions({ size, tint, soft }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx={60} cy={60} r={54} fill={soft} />
      {/* Ball outline */}
      <Circle cx={60} cy={62} r={28} fill="none" stroke={tint} strokeWidth={2.4} />
      {/* Center pentagon */}
      <Path
        d="M60 50 L70 57 L66 68 L54 68 L50 57 Z"
        fill={tint}
      />
      {/* Lines from pentagon vertices to ball edge */}
      <Line x1={60} y1={50} x2={60} y2={37} stroke={tint} strokeWidth={2} strokeLinecap="round" />
      <Line x1={70} y1={57} x2={82} y2={51} stroke={tint} strokeWidth={2} strokeLinecap="round" />
      <Line x1={66} y1={68} x2={75} y2={84} stroke={tint} strokeWidth={2} strokeLinecap="round" />
      <Line x1={54} y1={68} x2={45} y2={84} stroke={tint} strokeWidth={2} strokeLinecap="round" />
      <Line x1={50} y1={57} x2={38} y2={51} stroke={tint} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function Stats({ size, tint, soft }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx={60} cy={60} r={54} fill={soft} />
      {/* Bars increasing in height */}
      <Rect x={36} y={68} width={12} height={20} rx={3} fill={tint} opacity={0.55} />
      <Rect x={54} y={56} width={12} height={32} rx={3} fill={tint} opacity={0.75} />
      <Rect x={72} y={42} width={12} height={46} rx={3} fill={tint} />
      {/* Tiny rising trend line */}
      <Polyline
        points="36,52 54,46 72,34 86,28"
        fill="none"
        stroke={tint}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={86} cy={28} r={3} fill={tint} />
    </Svg>
  );
}

function Notes({ size, tint, soft }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx={60} cy={60} r={54} fill={soft} />
      {/* Paper with folded corner */}
      <Path
        d="M40 36 H72 L84 48 V86 H40 Z"
        fill="white"
        stroke={tint}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      {/* Folded corner shadow / line */}
      <Path
        d="M72 36 V48 H84"
        fill="none"
        stroke={tint}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      {/* Text lines */}
      <Line x1={48} y1={56} x2={76} y2={56} stroke={tint} strokeWidth={2} strokeLinecap="round" />
      <Line x1={48} y1={66} x2={72} y2={66} stroke={tint} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
      <Line x1={48} y1={76} x2={64} y2={76} stroke={tint} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
    </Svg>
  );
}

function Players({ size, tint, soft }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx={60} cy={60} r={54} fill={soft} />
      {/* Back person */}
      <Circle cx={75} cy={48} r={9} fill="white" stroke={tint} strokeWidth={2.2} opacity={0.6} />
      <Path
        d="M58 80 a17 17 0 0 1 34 0"
        fill="white"
        stroke={tint}
        strokeWidth={2.2}
        opacity={0.6}
        strokeLinecap="round"
      />
      {/* Front person */}
      <Circle cx={48} cy={52} r={11} fill="white" stroke={tint} strokeWidth={2.4} />
      <Path
        d="M30 86 a18 18 0 0 1 36 0"
        fill="white"
        stroke={tint}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function Events({ size, tint, soft }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx={60} cy={60} r={54} fill={soft} />
      {/* Trophy cup */}
      <Path
        d="M44 38 H76 V52 a16 16 0 0 1 -32 0 Z"
        fill={tint}
      />
      {/* Handles */}
      <Path
        d="M44 42 H36 a8 8 0 0 0 0 16 H46"
        fill="none"
        stroke={tint}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Path
        d="M76 42 H84 a8 8 0 0 1 0 16 H74"
        fill="none"
        stroke={tint}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      {/* Stem + base */}
      <Rect x={56} y={68} width={8} height={8} fill={tint} />
      <Rect x={46} y={76} width={28} height={6} rx={2} fill={tint} />
      {/* Sparkle */}
      <Path
        d="M88 30 l1.5 4.5 l4.5 1.5 l-4.5 1.5 l-1.5 4.5 l-1.5 -4.5 l-4.5 -1.5 l4.5 -1.5 Z"
        fill={tint}
        opacity={0.7}
      />
    </Svg>
  );
}
