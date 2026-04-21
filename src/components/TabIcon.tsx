import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme';

type Props = { focused: boolean; glyph: string; label: string };

export function TabIcon({ focused, glyph, label }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.glyph, focused && styles.glyphActive]}>{glyph}</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  glyph: { fontSize: 20, color: colors.textMuted, marginBottom: 2 },
  glyphActive: { color: colors.primary },
  label: { ...typography.caption, color: colors.textMuted },
  labelActive: { color: colors.primary, fontWeight: '700' },
});
