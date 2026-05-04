import React, { useEffect, useRef } from 'react';
import { Animated, type ViewProps } from 'react-native';

type Props = ViewProps & {
  // Milliseconds before the animation kicks off. Used to stagger
  // siblings (e.g. dashboard sections cascading in).
  delay?: number;
  duration?: number;
  // Vertical offset (in px) from which the view slides in. 0 disables
  // the slide and you get a pure fade.
  offset?: number;
};

/**
 * Mounts an Animated.View that fades in (and slightly slides up) once.
 * Cheap and dependency-free — uses the built-in Animated API with the
 * native driver, so it stays smooth on iOS / Android / web.
 *
 *   <AnimatedFadeIn delay={0}>...header...</AnimatedFadeIn>
 *   <AnimatedFadeIn delay={70}>...hero...</AnimatedFadeIn>
 *   <AnimatedFadeIn delay={140}>...stats...</AnimatedFadeIn>
 */
export function AnimatedFadeIn({
  delay = 0,
  duration = 320,
  offset = 14,
  style,
  children,
  ...rest
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offset)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
    // Run once on mount — siblings re-mount when needed (e.g. when
    // DataProvider is re-keyed on a team change), so the delay is not
    // a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[style, { opacity, transform: [{ translateY }] }]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}
