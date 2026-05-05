import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

// Feather icon names we use for the tab bar. Keeping the type narrow
// makes typos at the call site loud at build time.
type IconName = 'home' | 'users' | 'bar-chart-2';

type Props = { focused: boolean; name: IconName; label: string };

export function TabIcon({ focused, name, label }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrapper}>
      <Feather
        name={name}
        size={22}
        color={focused ? styles.colors.active : styles.colors.inactive}
      />
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ThemedColors) => {
  const sheet = StyleSheet.create({
    wrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 64,
      paddingTop: 4,
    },
    label: {
      ...typography.micro,
      color: c.textMuted,
      fontSize: 10,
      marginTop: 2,
    },
    labelActive: {
      color: c.primary,
      fontWeight: '700',
    },
  });
  return {
    ...sheet,
    colors: {
      active: c.primary,
      inactive: c.textMuted,
    },
  };
};
