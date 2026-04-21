import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { colors } from '@/theme';

type Props = { size?: number };

export function ClubLogo({ size = 44 }: Props) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const outerR = s / 2 - 1;
  const innerR = outerR - 3;
  const starR = innerR * 0.62;

  return (
    <View style={[styles.wrapper, { width: s, height: s }]}>
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Circle cx={cx} cy={cy} r={outerR} fill={colors.accent} />
        <Circle cx={cx} cy={cy} r={innerR} fill={colors.primary} />
        <G>
          <Path
            d={starPath(cx, cy, starR, starR * 0.4)}
            fill="#FFFFFF"
          />
        </G>
      </Svg>
    </View>
  );
}

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  points.push('Z');
  return points.join(' ');
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
