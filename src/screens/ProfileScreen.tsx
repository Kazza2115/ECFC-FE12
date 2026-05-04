import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ClubLogo } from '@/components/ClubLogo';
import { useAuth } from '@/context/AuthContext';
import { confirm } from '@/utils/confirm';
import { pickPlayerPhoto } from '@/utils/photo';
import { radius, spacing, typography } from '@/theme';
import { useThemedStyles, type ThemedColors } from '@/theme/useThemedStyles';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { profile, session, updateProfile, setCoachPhoto, signOut } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [role, setRole] = useState(profile?.role ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-hydrate the form whenever the profile changes (e.g. after a
  // save round-trip).
  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
    setRole(profile?.role ?? '');
    setPhone(profile?.phone ?? '');
    setBio(profile?.bio ?? '');
  }, [profile]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Mon profil' });
  }, [navigation]);

  const dirty =
    (displayName.trim() !== (profile?.displayName ?? '')) ||
    (role.trim() !== (profile?.role ?? '')) ||
    (phone.trim() !== (profile?.phone ?? '')) ||
    (bio.trim() !== (profile?.bio ?? ''));

  const handleSave = async () => {
    setError(null);
    setInfo(null);
    if (!displayName.trim()) {
      setError('Ton nom est requis.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        displayName,
        role: role || null,
        phone: phone || null,
        bio: bio || null,
      });
      setInfo('Profil mis à jour.');
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async () => {
    setError(null);
    setInfo(null);
    if (profile?.photoUrl) {
      const replace = await confirm({
        title: 'Photo de profil',
        message: 'Remplacer ou supprimer la photo actuelle ?',
        confirmLabel: 'Remplacer',
      });
      if (!replace) {
        const del = await confirm({
          title: 'Supprimer la photo ?',
          confirmLabel: 'Supprimer',
          destructive: true,
        });
        if (del) {
          setPhotoBusy(true);
          try {
            await setCoachPhoto(undefined);
          } catch (err: any) {
            setError(err?.message ?? 'Suppression échouée.');
          } finally {
            setPhotoBusy(false);
          }
        }
        return;
      }
    }

    setPhotoBusy(true);
    try {
      const uri = await pickPlayerPhoto();
      if (uri) await setCoachPhoto(uri);
    } catch (err: any) {
      setError(err?.message ?? 'Téléversement échoué.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSignOut = async () => {
    const ok = await confirm({
      title: 'Se déconnecter ?',
      message: "Tu reviendras sur l'écran de connexion.",
      confirmLabel: 'Se déconnecter',
      destructive: true,
    });
    if (!ok) return;
    await signOut();
  };

  const isCarouge = profile?.teamId === 'ecfc-juniors';
  const initials = (profile?.displayName ?? '?').slice(0, 1).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.identityCard}>
            <Pressable
              onPress={photoBusy ? undefined : handlePhoto}
              style={styles.avatarWrap}
            >
              <Avatar
                name={profile?.displayName ?? initials}
                photoUri={profile?.photoUrl ?? undefined}
                size={104}
              />
              <View style={styles.cameraBadge}>
                {photoBusy ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text style={styles.cameraGlyph}>📷</Text>
                )}
              </View>
            </Pressable>
            <Text style={styles.name}>{profile?.displayName ?? '—'}</Text>
            {profile?.role ? (
              <Text style={styles.roleHint}>{profile.role}</Text>
            ) : null}
            <Text style={styles.email}>{session?.user?.email ?? ''}</Text>
          </Card>

          <Card style={styles.teamCard}>
            <View style={styles.teamRow}>
              {isCarouge ? <ClubLogo size={40} /> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.teamLabel}>Équipe</Text>
                <Text style={styles.teamName} numberOfLines={1}>
                  {profile?.teamName ?? '—'}
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations</Text>

            <Text style={styles.label}>Nom affiché</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Prénom Nom"
              placeholderTextColor="#8E8E93"
              editable={!saving}
            />

            <Text style={styles.label}>Fonction (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={role}
              onChangeText={setRole}
              placeholder="Coach principal · U13"
              placeholderTextColor="#8E8E93"
              editable={!saving}
            />

            <Text style={styles.label}>Téléphone (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+41 79 000 00 00"
              placeholderTextColor="#8E8E93"
              keyboardType="phone-pad"
              editable={!saving}
            />

            <Text style={styles.label}>À propos (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Quelques mots sur ton parcours, ta philosophie de jeu…"
              placeholderTextColor="#8E8E93"
              multiline
              textAlignVertical="top"
              editable={!saving}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info ? <Text style={styles.info}>{info}</Text> : null}

            <View style={{ height: spacing.md }} />
            <Button
              label="Sauvegarder"
              onPress={handleSave}
              fullWidth
              disabled={saving || !dirty}
            />
          </View>

          <View style={styles.section}>
            <Button
              label="Se déconnecter"
              variant="secondary"
              onPress={handleSignOut}
              fullWidth
            />
          </View>

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemedColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    identityCard: {
      alignItems: 'center',
      gap: 6,
    },
    avatarWrap: {
      position: 'relative',
      marginBottom: spacing.sm,
    },
    cameraBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      borderWidth: 2,
      borderColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraGlyph: { fontSize: 18 },
    name: { ...typography.h2, color: c.textPrimary, textAlign: 'center' },
    roleHint: {
      ...typography.bodyBold,
      color: c.primary,
      marginTop: 2,
      textAlign: 'center',
    },
    email: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },
    teamCard: {},
    teamRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    teamLabel: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
    },
    teamName: {
      ...typography.h3,
      color: c.textPrimary,
      marginTop: 2,
    },
    section: {
      gap: 0,
    },
    sectionTitle: {
      ...typography.h3,
      color: c.textPrimary,
      marginBottom: spacing.sm,
    },
    label: {
      ...typography.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      marginTop: spacing.sm,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      ...typography.body,
      color: c.textPrimary,
      backgroundColor: c.surface,
    },
    inputMultiline: {
      minHeight: 96,
      paddingTop: 10,
    },
    error: {
      ...typography.caption,
      color: c.danger,
      marginTop: spacing.sm,
    },
    info: {
      ...typography.caption,
      color: c.successText,
      marginTop: spacing.sm,
    },
  });
