import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GradientBackdrop } from './GradientBackdrop';
import { radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

type Variant = 'primary' | 'secondary';

type Props = {
  variant: Variant;
  icon: React.ComponentProps<typeof Feather>['name'];
  // Render an emoji or domain glyph instead of a Feather icon. Useful
  // for the soccer ball on the "Match" tile.
  iconText?: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
};

/**
 * Bold action tile for the dashboard. Solid primary or soft accent
 * variants, gradient backdrop, big icon, spring press. The whole
 * thing is tappable and feels like a HeroUI hero CTA.
 */
export function ActionTile({
  variant,
  icon,
  iconText,
  title,
  subtitle,
  onPress,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const v = styles.variants[variant];

  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.97,
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
      style={styles.full}
    >
      <Animated.View
        style={[
          styles.tile,
          v.tile,
          { transform: [{ scale }], opacity },
        ]}
      >
        <GradientBackdrop
          from={v.gradient.from}
          to={v.gradient.to}
          radius={radius.lg}
          opacity={1}
        />
        <View style={[styles.iconWrap, v.iconWrap]}>
          {iconText ? (
            <Text style={[styles.iconText, v.iconText]}>{iconText}</Text>
          ) : (
            <Feather name={icon} size={22} color={v.iconColor} />
          )}
        </View>
        <Text style={[styles.title, v.title]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, v.subtitle]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (c: ThemedColors) => {
  const sheet = StyleSheet.create({
    full: { flex: 1 },
    tile: {
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 124,
      gap: 6,
      overflow: 'hidden',
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    iconText: {
      fontSize: 22,
    },
    title: {
      ...typography.h3,
      lineHeight: 22,
    },
    subtitle: {
      ...typography.caption,
      lineHeight: 16,
    },
  });
  return {
    ...sheet,
    variants: {
      primary: {
        tile: {
          backgroundColor: c.primary,
          shadowColor: c.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.32,
          shadowRadius: 18,
          elevation: 6,
        },
        gradient: { from: c.primary, to: c.primaryGradient },
        iconWrap: { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
        iconColor: c.onPrimary,
        iconText: { color: c.onPrimary },
        title: { color: c.onPrimary },
        subtitle: { color: 'rgba(255, 255, 255, 0.85)' },
      },
      secondary: {
        tile: {
          backgroundColor: c.surface,
          shadowColor: '#0F1F44',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 14,
          elevation: 1,
        },
        gradient: { from: c.surfaceMuted, to: c.surface },
        iconWrap: { backgroundColor: c.primarySoft },
        iconColor: c.primary,
        iconText: { color: c.primary },
        title: { color: c.textPrimary },
        subtitle: { color: c.textMuted },
      },
    },
  };
};
