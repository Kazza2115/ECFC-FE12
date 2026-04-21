import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '@/theme';

type Props = {
  value: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
};

export function ProgressBar({ value, height = 8, color, backgroundColor }: Props) {
  const clamped = Math.max(0, Math.min(1, value));
  const tint =
    color ??
    (clamped >= 0.8
      ? colors.success
      : clamped >= 0.5
      ? colors.primary
      : clamped >= 0.3
      ? colors.warning
      : colors.danger);

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: backgroundColor ?? colors.border },
      ]}
    >
      <View
        style={[
          styles.fill,
          { width: `${clamped * 100}%`, backgroundColor: tint, height },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
  },
});
