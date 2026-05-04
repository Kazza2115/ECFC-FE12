import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from './Avatar';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { useAuth } from '@/context/AuthContext';
import { confirm } from '@/utils/confirm';
import { radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';

export function ProfileMenu() {
  const { profile, session, signOut, renameCoach } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile?.displayName ?? '');

  const handleSignOut = async () => {
    const ok = await confirm({
      title: 'Se déconnecter ?',
      message: 'Tu reviendras sur l\'écran de connexion.',
      confirmLabel: 'Se déconnecter',
      destructive: true,
    });
    if (!ok) return;
    setOpen(false);
    await signOut();
  };

  const handleRename = async () => {
    const next = draftName.trim();
    if (!next || next === profile?.displayName) {
      setEditing(false);
      return;
    }
    try {
      await renameCoach(next);
    } catch {}
    setEditing(false);
  };

  const initials = (profile?.displayName ?? '?').slice(0, 1).toUpperCase();

  return (
    <>
      <Pressable
        onPress={() => {
          setDraftName(profile?.displayName ?? '');
          setEditing(false);
          setOpen(true);
        }}
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      >
        <Avatar name={profile?.displayName ?? '?'} size={32} />
      </Pressable>
      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Mon profil"
      >
        <View style={styles.identityRow}>
          <Avatar name={profile?.displayName ?? initials} size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <TextInput
                style={styles.input}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Ton nom"
                autoFocus
                onSubmitEditing={handleRename}
                returnKeyType="done"
              />
            ) : (
              <Text style={styles.name} numberOfLines={1}>
                {profile?.displayName ?? '—'}
              </Text>
            )}
            <Text style={styles.email} numberOfLines={1}>
              {session?.user?.email ?? ''}
            </Text>
          </View>
          <Pressable
            onPress={editing ? handleRename : () => setEditing(true)}
            style={styles.editBtn}
            hitSlop={8}
          >
            <Text style={styles.editLabel}>{editing ? '✓' : '✎'}</Text>
          </Pressable>
        </View>

        <View style={styles.teamCard}>
          <Text style={styles.teamLabel}>Équipe</Text>
          <Text style={styles.teamName}>{profile?.teamName ?? '—'}</Text>
        </View>

        <View style={{ height: spacing.md }} />
        <Button
          label="Se déconnecter"
          variant="secondary"
          onPress={handleSignOut}
          fullWidth
        />
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
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnPressed: { opacity: 0.7 },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    name: {
      ...typography.h3,
      color: c.textPrimary,
    },
    email: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      ...typography.body,
      color: c.textPrimary,
      backgroundColor: c.background,
    },
    editBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editLabel: {
      color: c.primary,
      fontWeight: '700',
      fontSize: 16,
    },
    teamCard: {
      marginTop: spacing.md,
      backgroundColor: c.background,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    teamLabel: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
    },
    teamName: {
      ...typography.bodyBold,
      color: c.textPrimary,
      fontSize: 15,
      marginTop: 2,
    },
  });
