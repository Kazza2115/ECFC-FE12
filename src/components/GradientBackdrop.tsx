import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  from: string;
  to: string;
  // Opacity applied uniformly to the whole gradient so the backdrop
  // can sit behind a card without overpowering its content.
  opacity?: number;
  // CornerRadius lets the SVG match the card's roundness.
  radius?: number;
};

let counter = 0;
function uniqueId(): string {
  counter += 1;
  return `grad-${counter}`;
}

/**
 * Absolutely-positioned linear gradient (top-left → bottom-right) used
 * as a soft tint behind cards. Renders via react-native-svg so it
 * scales cleanly on both web and native without needing any extra
 * dependency.
 */
export function GradientBackdrop({
  from,
  to,
  opacity = 1,
  radius = 0,
}: Props) {
  const id = React.useMemo(uniqueId, []);
  return (
    <View
      pointerEvents="none"
      style={[styles.fill, { opacity, borderRadius: radius, overflow: 'hidden' }]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} stopOpacity="1" />
            <Stop offset="1" stopColor={to} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
