import React from 'react';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '@/theme';

type Props = { size?: number };

/**
 * Generic Coach Hub logo. A rounded primary-coloured square with a
 * white "CH" monogram and a small ball accent on the upper-right
 * corner. SVG so it stays sharp at every size and follows the active
 * theme's primary colour (re-evaluated on each render).
 */
export function AppLogo({ size = 56 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect
        x={0}
        y={0}
        width={64}
        height={64}
        rx={14}
        ry={14}
        fill={colors.primary}
      />
      {/* Soccer-ball accent — lightly transparent so it reads as a
          decoration, not a focal element. */}
      <Circle cx={50} cy={14} r={6} fill="rgba(255,255,255,0.18)" />
      <Path
        d="M50 9.5 L51.4 12.6 L54.7 12.7 L52.1 14.7 L53 17.9 L50 16.1 L47 17.9 L47.9 14.7 L45.3 12.7 L48.6 12.6 Z"
        fill="rgba(255,255,255,0.55)"
      />
      <SvgText
        x={32}
        y={44}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize={28}
        fontWeight="800"
        fontFamily="System"
      >
        CH
      </SvgText>
    </Svg>
  );
}
