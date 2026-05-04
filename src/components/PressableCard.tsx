import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, type ViewProps } from 'react-native';
import { radius, spacing } from '@/theme';
import { useThemedStyles, type ThemedColors, type ThemedShadow } from '@/theme/useThemedStyles';

type Props = ViewProps & {
  onPress: () => void;
  padded?: boolean;
  disabled?: boolean;
};

/**
 * Tappable Card with a smooth spring-press animation. Use this in
 * place of <Pressable><Card>...</Card></Pressable> on every row /
 * tile that opens a detail page so the press feedback feels like
 * HeroUI rather than a flat opacity flash.
 */
export function PressableCard({
  onPress,
  padded = true,
  disabled,
  style,
  children,
  ...rest
}: Props) {
  const styles = useThemedStyles(makeStyles);

  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.985,
        useNativeDriver: true,
        damping: 18,
        mass: 0.8,
        stiffness: 280,
      }),
      Animated.timing(opacity, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };
  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 16,
        mass: 0.8,
        stiffness: 240,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.card,
          padded && styles.padded,
          disabled && styles.disabled,
          { transform: [{ scale }], opacity },
          style,
        ]}
        {...rest}
      >
        {children}
      </Animated.View>
    </Pressable>
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
    disabled: { opacity: 0.5 },
  });
