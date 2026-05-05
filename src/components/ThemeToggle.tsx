import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { useTheme, type ThemePreference } from '@/context/ThemeContext';
import { radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

type FeatherName = 'sun' | 'moon' | 'monitor';

const OPTIONS: {
  key: ThemePreference;
  label: string;
  hint: string;
  icon: FeatherName;
}[] = [
  {
    key: 'auto',
    label: 'Automatique',
    hint: 'Suit le mode du téléphone',
    icon: 'monitor',
  },
  {
    key: 'light',
    label: 'Clair',
    hint: 'Toujours en thème clair',
    icon: 'sun',
  },
  {
    key: 'dark',
    label: 'Sombre',
    hint: 'Toujours en thème sombre',
    icon: 'moon',
  },
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

  const icon: FeatherName = effective === 'dark' ? 'moon' : 'sun';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      >
        <Feather name={icon} size={18} color={styles.colors.icon} />
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
                <View style={styles.optionIconWrap}>
                  <Feather
                    name={opt.icon}
                    size={20}
                    color={active ? styles.colors.activeIcon : styles.colors.icon}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.optionHint}>{opt.hint}</Text>
                </View>
                {active ? (
                  <Feather name="check" size={18} color={styles.colors.activeIcon} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

const makeStyles = (c: ThemedColors) => {
  const sheet = StyleSheet.create({
    btn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPressed: { opacity: 0.7 },
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
    optionIconWrap: {
      width: 28,
      alignItems: 'center',
    },
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
  });
  return {
    ...sheet,
    colors: {
      icon: c.textPrimary,
      activeIcon: c.primary,
    },
  };
};
