import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { radius, spacing } from '@/theme';
import { useThemedStyles, type ThemedColors, type ThemedShadow } from '@/theme/useThemedStyles';

type Props = ViewProps & { padded?: boolean };

export function Card({ style, padded = true, children, ...rest }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const makeStyles = (c: ThemedColors, s: ThemedShadow) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      ...s.card,
    },
    padded: {
      padding: spacing.lg,
    },
  });
