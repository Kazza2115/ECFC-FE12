import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

type Props = { focused: boolean; glyph: string; label: string };

export function TabIcon({ focused, glyph, label }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.glyph, focused && styles.glyphActive]}>{glyph}</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ThemedColors) =>
  StyleSheet.create({
    wrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 64,
      paddingTop: 4,
    },
    glyph: {
      fontSize: 22,
      color: c.textMuted,
      marginBottom: 2,
    },
    glyphActive: { color: c.primary },
    label: {
      ...typography.micro,
      color: c.textMuted,
      fontSize: 10,
    },
    labelActive: {
      color: c.primary,
      fontWeight: '700',
    },
  });
