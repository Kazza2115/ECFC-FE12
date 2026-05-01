import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomSheet } from './BottomSheet';
import { useTheme, type ThemePreference } from '@/context/ThemeContext';
import { radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

const OPTIONS: {
  key: ThemePreference;
  label: string;
  hint: string;
  glyph: string;
}[] = [
  {
    key: 'auto',
    label: 'Automatique',
    hint: 'Suit le mode du téléphone',
    glyph: '◐',
  },
  { key: 'light', label: 'Clair', hint: 'Toujours en thème clair', glyph: '☀' },
  { key: 'dark', label: 'Sombre', hint: 'Toujours en thème sombre', glyph: '☾' },
];

export function ThemeToggle() {
  const { preference, effective, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);

  const handlePick = async (next: ThemePreference) => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    setOpen(false);
    await setPreference(next);
  };

  const glyph = effective === 'dark' ? '☾' : '☀';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      >
        <Text style={styles.btnGlyph}>{glyph}</Text>
      </Pressable>
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Apparence"
      >
        <View style={styles.list}>
          {OPTIONS.map((opt) => {
            const active = preference === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => handlePick(opt.key)}
                style={[styles.option, active && styles.optionActive]}
              >
                <Text style={[styles.optionGlyph, active && styles.optionGlyphActive]}>
                  {opt.glyph}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.optionHint}>{opt.hint}</Text>
                </View>
                {active ? <Text style={styles.optionCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

const makeStyles = (c: ThemedColors) =>
  StyleSheet.create({
    btn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPressed: { opacity: 0.7 },
    btnGlyph: {
      fontSize: 18,
      color: c.textPrimary,
      fontWeight: '600',
    },
    list: { gap: spacing.sm },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.background,
    },
    optionActive: {
      backgroundColor: c.primarySoft,
    },
    optionGlyph: {
      fontSize: 22,
      width: 28,
      textAlign: 'center',
      color: c.textPrimary,
    },
    optionGlyphActive: { color: c.primary },
    optionLabel: {
      ...typography.bodyBold,
      color: c.textPrimary,
      fontSize: 15,
    },
    optionLabelActive: { color: c.primary },
    optionHint: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    optionCheck: {
      ...typography.h3,
      color: c.primary,
      fontWeight: '800',
    },
  });
